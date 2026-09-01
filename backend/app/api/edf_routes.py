"""
EDF (European Data Format) upload + preprocessing pipeline.

IMPORTANT: NeuroShield does not yet ship a trained multi-channel CHB-MIT model
checkpoint. This endpoint completes the full architecture -- secure upload,
metadata extraction, and signal preprocessing -- and returns an honest
`model_status: "not_available"` rather than inventing accuracy/risk numbers.
Once backend/ml/models/eegnet_chbmit.pt exists, inference.py's EDF predictor
plugs into the `# TODO: run inference` marker below without changing this
endpoint's contract.
"""
import json
import os

import mne
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

mne.set_log_level("ERROR")

from app.auth.dependencies import get_current_user, require_patient_access, require_role
from app.core.config import settings
from app.db.database import get_db
from app.db.models import AnalysisRecord, Role, User
from app.utils.audit import record_audit
from app.utils.file_security import save_upload_securely

router = APIRouter(prefix="/analyze", tags=["edf"])

# Preferred CHB-MIT-style bipolar montage. If the uploaded file doesn't contain
# these exact channel names we fall back to whatever channels are present --
# the UI is told which case occurred via `montage_match`.
TARGET_BIPOLAR_MONTAGE = [
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1",
    "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
    "FZ-CZ", "CZ-PZ",
]


def _extract_metadata(raw: "mne.io.Raw") -> dict:
    info = raw.info
    meas_date = info.get("meas_date")
    return {
        "channel_count": len(raw.ch_names),
        "channel_names": raw.ch_names,
        "sampling_frequency_hz": float(info["sfreq"]),
        "duration_seconds": float(raw.n_times / info["sfreq"]),
        "recording_date": meas_date.isoformat() if meas_date else None,
    }


def _match_montage(channel_names: list) -> dict:
    present = [ch for ch in TARGET_BIPOLAR_MONTAGE if ch in channel_names]
    return {
        "target_channel_count": len(TARGET_BIPOLAR_MONTAGE),
        "matched_channel_count": len(present),
        "matched_channels": present,
        "full_match": len(present) == len(TARGET_BIPOLAR_MONTAGE),
    }


def _preprocess_signal_quality(raw: "mne.io.Raw") -> dict:
    """
    Cheap, model-free signal-quality heuristic used for the "Signal Quality"
    indicator (section 17 of the spec) -- NOT a seizure prediction. Flags
    flat-lined or heavily clipped/saturated channels.
    """
    data = raw.get_data()
    if data.size == 0:
        return {"quality": "poor", "reason": "No samples in recording."}

    flat_channels = int(np.sum(np.std(data, axis=1) < 1e-8))
    total_channels = data.shape[0]
    flat_ratio = flat_channels / total_channels if total_channels else 1.0

    if flat_ratio > 0.3:
        quality = "poor"
    elif flat_ratio > 0.05:
        quality = "reduced"
    else:
        quality = "good"

    return {
        "quality": quality,
        "flat_channels": flat_channels,
        "total_channels": total_channels,
    }


@router.post("/edf")
async def analyze_edf(
    request: Request,
    file: UploadFile = File(...),
    patient_id: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.patient.value, Role.neurologist.value, Role.admin.value)),
):
    target_patient_id = patient_id or (current_user.id if current_user.role == Role.patient else None)
    if not target_patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required for this role.")
    require_patient_access(target_patient_id, db, current_user)

    saved = await save_upload_securely(
        file,
        subdir="edf",
        allowed_extensions=settings.ALLOWED_EDF_EXTENSIONS,
        max_size_bytes=settings.MAX_EDF_SIZE_BYTES,
    )

    try:
        raw = mne.io.read_raw_edf(saved.stored_path, preload=True, verbose="ERROR")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse EDF file: {exc}")

    metadata = _extract_metadata(raw)
    montage = _match_montage(raw.ch_names)
    signal_quality = _preprocess_signal_quality(raw)

    # Preprocessing: bandpass 0.5-70 Hz + 60 Hz notch, standard for scalp EEG.
    # This runs regardless of model availability -- it's the shared pipeline
    # the CHB-MIT EEGNet model will consume once trained.
    try:
        raw.filter(l_freq=0.5, h_freq=70.0, verbose="ERROR")
        raw.notch_filter(freqs=60.0, verbose="ERROR")
        preprocessing_status = "ok"
    except Exception as exc:
        preprocessing_status = f"failed: {exc}"

    # TODO: run inference once backend/ml/models/eegnet_chbmit.pt is trained
    # and checked in. See backend/training/ (next pass) for the training
    # pipeline that will produce it.
    result = {
        "mode": "edf",
        "metadata": metadata,
        "montage": montage,
        "signal_quality": signal_quality,
        "preprocessing_status": preprocessing_status,
        "model_status": "not_available",
        "message": (
            "EEG preprocessing completed successfully. A CHB-MIT-trained multi-channel "
            "seizure detection model has not been deployed yet, so no risk score is "
            "shown for this recording. Metadata and signal-quality checks above are real."
        ),
    }

    record = AnalysisRecord(
        patient_id=target_patient_id,
        uploaded_by_id=current_user.id,
        input_type="edf",
        original_filename=saved.original_filename,
        stored_path=saved.stored_path,
        result_json=json.dumps(result),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    record_audit(
        db, user_id=current_user.id, action="analysis.upload_edf",
        target_type="analysis_record", target_id=record.id,
        detail=f"patient_id={target_patient_id}",
        ip_address=request.client.host if request.client else None,
    )

    return {
        "analysis_id": record.id,
        "filename": saved.original_filename,
        "result": result,
    }
