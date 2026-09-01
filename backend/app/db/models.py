import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, Text, Enum, Boolean, Float
)
from sqlalchemy.orm import relationship

from app.db.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    patient = "patient"
    caregiver = "caregiver"
    neurologist = "neurologist"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False, index=True)
    locale = Column(String, default="en")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)

    analyses = relationship("AnalysisRecord", back_populates="uploaded_by", foreign_keys="AnalysisRecord.uploaded_by_id")


class CaregiverLink(Base):
    """Links a caregiver account to a patient account they may monitor."""
    __tablename__ = "caregiver_links"

    id = Column(String, primary_key=True, default=_uuid)
    caregiver_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="active")  # active | revoked
    created_at = Column(DateTime, default=_now)

    caregiver = relationship("User", foreign_keys=[caregiver_id])
    patient = relationship("User", foreign_keys=[patient_id])


class NeurologistAssignment(Base):
    """Links a neurologist account to a patient they are clinically responsible for."""
    __tablename__ = "neurologist_assignments"

    id = Column(String, primary_key=True, default=_uuid)
    neurologist_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=_now)

    neurologist = relationship("User", foreign_keys=[neurologist_id])
    patient = relationship("User", foreign_keys=[patient_id])


class AnalysisRecord(Base):
    """One EEG/report analysis event (CSV signal, image, or EDF)."""
    __tablename__ = "analysis_records"

    id = Column(String, primary_key=True, default=_uuid)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    input_type = Column(String, nullable=False)  # csv | image | edf
    original_filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    result_json = Column(Text, nullable=False)  # serialized prediction/metadata dict
    created_at = Column(DateTime, default=_now)

    uploaded_by = relationship("User", back_populates="analyses", foreign_keys=[uploaded_by_id])


class SeizureEvent(Base):
    """A detected or manually-logged seizure event tied to a patient."""
    __tablename__ = "seizure_events"

    id = Column(String, primary_key=True, default=_uuid)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    analysis_id = Column(String, ForeignKey("analysis_records.id"), nullable=True)
    source = Column(String, default="detection")  # detection | diary | manual
    onset_seconds = Column(Float, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    confirmed = Column(Boolean, default=False)
    confirmed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)


class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id = Column(String, primary_key=True, default=_uuid)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    entry_type = Column(String, default="quick")  # quick | detailed
    occurred_at = Column(DateTime, nullable=False)
    seizure_type = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    consciousness = Column(String, nullable=True)
    symptoms = Column(Text, nullable=True)      # JSON-encoded list
    aura = Column(Boolean, nullable=True)
    triggers = Column(Text, nullable=True)       # JSON-encoded list
    sleep_hours = Column(Float, nullable=True)
    medication_taken = Column(Boolean, nullable=True)
    rescue_medication_used = Column(Boolean, nullable=True)
    post_seizure_state = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=_now)


class ClinicalReport(Base):
    """Structured data extracted (via OCR) from an uploaded photographed seizure report."""
    __tablename__ = "clinical_reports"

    id = Column(String, primary_key=True, default=_uuid)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    ocr_raw_text = Column(Text, nullable=True)
    extracted_fields_json = Column(Text, nullable=True)   # OCR-extracted, possibly low confidence
    corrected_fields_json = Column(Text, nullable=True)   # user-corrected version
    ocr_confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_now)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=_uuid)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    seizure_event_id = Column(String, ForeignKey("seizure_events.id"), nullable=True)
    severity = Column(String, default="high")  # high | medium | low
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False)
    acknowledged_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)


class AuditLog(Base):
    """Append-only record of security-relevant actions: who / what / when."""
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)         # e.g. "login", "analysis.upload", "alert.acknowledge"
    target_type = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)
