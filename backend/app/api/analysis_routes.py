"""
CSV signal and spectrogram-image analysis endpoints (authenticated, ownership-checked).

Preserves the existing Bonn-trained model pipeline in ml/inference.py -- only the
transport (auth, storage, DB record, audit log) changed, not the ML behavior.
"""
import json

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_patient_access, require_role
from app.core.config import settings
from app.db.database import get_db
from app.db.models import AnalysisRecord, Role, User
from app.utils.audit import record_audit
from app.utils.file_security import save_upload_securely

router = APIRouter(prefix="/analyze", tags=["analysis"])


def _resolve_target_patient(patient_id: str | None, current_user: User, db: Session) -> str:
    target = patient_id or (current_user.id if current_user.role == Role.patient else None)
    if not target:
        raise HTTPException(status_code=400, detail="patient_id is required for this role.")
    require_patient_access(target, db, current_user)
    return target


def _extract_csv_signal(path: str) -> np.ndarray:
    df_peek = pd.read_csv(path, nrows=5)

    if df_peek.shape[1] >= 178:
        df = pd.read_csv(path)
        signal_data = df.select_dtypes(include=[np.number]).iloc[0].values[:178].astype(float)
    else:
        df = pd.read_csv(path)
        signal_col = None
        for col in df.columns:
            if any(k in col.lower() for k in ("channel", "signal", "val")):
                signal_col = col
                break
        if signal_col is None:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if "time" not in col.lower() and "id" not in col.lower():
                    signal_col = col
                    break
        if signal_col is None and not df.select_dtypes(include=[np.number]).empty:
            signal_col = df.select_dtypes(include=[np.number]).columns[0]
        if signal_col is None:
            raise HTTPException(status_code=400, detail="Could not find a numeric signal column in the CSV.")
        signal_data = df[signal_col].values[:178].astype(float)

    if len(signal_data) < 178:
        raise HTTPException(status_code=400, detail=f"Insufficient data points. Need 178, found {len(signal_data)}.")
    return signal_data


def register_analysis_routes(app, predictor):
    @router.post("/csv")
    async def analyze_csv(
        request: Request,
        file: UploadFile = File(...),
        patient_id: str | None = Form(None),
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(Role.patient.value, Role.neurologist.value, Role.admin.value)),
    ):
        target_patient_id = _resolve_target_patient(patient_id, current_user, db)

        saved = await save_upload_securely(
            file, subdir="csv",
            allowed_extensions=settings.ALLOWED_CSV_EXTENSIONS,
            max_size_bytes=settings.MAX_CSV_SIZE_BYTES,
        )

        try:
            signal_data = _extract_csv_signal(saved.stored_path)
            prediction = predictor.predict_csv(signal_data)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Error processing CSV: {exc}")

        result = {"prediction": prediction, "raw_signal": signal_data.tolist()}

        record = AnalysisRecord(
            patient_id=target_patient_id, uploaded_by_id=current_user.id, input_type="csv",
            original_filename=saved.original_filename, stored_path=saved.stored_path,
            result_json=json.dumps(result),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        record_audit(db, user_id=current_user.id, action="analysis.upload_csv",
                      target_type="analysis_record", target_id=record.id,
                      detail=f"patient_id={target_patient_id}",
                      ip_address=request.client.host if request.client else None)

        return {"analysis_id": record.id, "filename": saved.original_filename, **result,
                "message": "Analysis complete."}

    @router.post("/image")
    async def analyze_image(
        request: Request,
        file: UploadFile = File(...),
        patient_id: str | None = Form(None),
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(Role.patient.value, Role.neurologist.value, Role.admin.value)),
    ):
        target_patient_id = _resolve_target_patient(patient_id, current_user, db)

        saved = await save_upload_securely(
            file, subdir="image",
            allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
            max_size_bytes=settings.MAX_IMAGE_SIZE_BYTES,
        )

        try:
            with open(saved.stored_path, "rb") as f:
                contents = f.read()
            prediction = predictor.predict_image(contents)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Error processing image: {exc}")

        result = {"prediction": prediction, "raw_signal": prediction.get("raw_signal", [])}

        record = AnalysisRecord(
            patient_id=target_patient_id, uploaded_by_id=current_user.id, input_type="image",
            original_filename=saved.original_filename, stored_path=saved.stored_path,
            result_json=json.dumps(result),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        record_audit(db, user_id=current_user.id, action="analysis.upload_image",
                      target_type="analysis_record", target_id=record.id,
                      detail=f"patient_id={target_patient_id}",
                      ip_address=request.client.host if request.client else None)

        return {"analysis_id": record.id, "filename": saved.original_filename, **result,
                "message": "Image analysis complete."}

    app.include_router(router)
