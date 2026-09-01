"""Minimal real patient-list endpoint -- replaces the frontend's previous
hardcoded mock patient table (section 34: no fabricated patient data)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import CaregiverLink, NeurologistAssignment, Role, User

router = APIRouter(prefix="/patients", tags=["patients"])


class PatientOut(BaseModel):
    id: str
    full_name: str
    email: str
    relationship: str  # "self" | "caregiver_of" | "assigned_neurologist"

    class Config:
        from_attributes = True


@router.get("/mine", response_model=list[PatientOut])
def list_my_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == Role.patient:
        return [PatientOut(id=current_user.id, full_name=current_user.full_name,
                            email=current_user.email, relationship="self")]

    if current_user.role == Role.caregiver:
        links = db.query(CaregiverLink).filter(
            CaregiverLink.caregiver_id == current_user.id, CaregiverLink.status == "active"
        ).all()
        return [PatientOut(id=l.patient.id, full_name=l.patient.full_name,
                            email=l.patient.email, relationship="caregiver_of") for l in links]

    if current_user.role == Role.neurologist:
        assignments = db.query(NeurologistAssignment).filter(
            NeurologistAssignment.neurologist_id == current_user.id, NeurologistAssignment.status == "active"
        ).all()
        return [PatientOut(id=a.patient.id, full_name=a.patient.full_name,
                            email=a.patient.email, relationship="assigned_neurologist") for a in assignments]

    if current_user.role == Role.admin:
        patients = db.query(User).filter(User.role == Role.patient).all()
        return [PatientOut(id=p.id, full_name=p.full_name, email=p.email, relationship="admin") for p in patients]

    return []
