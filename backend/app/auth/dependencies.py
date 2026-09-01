import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db.database import get_db
from app.db.models import User, CaregiverLink, NeurologistAssignment

# tokenUrl is documentation-only (Swagger UI); the actual login route is /auth/login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_error
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_error
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.PyJWTError:
        raise credentials_error

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()  # noqa: E712
    if not user:
        raise credentials_error
    return user


def require_role(*allowed_roles: str):
    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of the following roles: {', '.join(allowed_roles)}.",
            )
        return user
    return _checker


def can_access_patient(db: Session, requester: User, patient_id: str) -> bool:
    """Ownership/authorization check: can `requester` view/act on `patient_id`'s data?"""
    if requester.role.value == "admin":
        return True
    if requester.role.value == "patient":
        return requester.id == patient_id
    if requester.role.value == "caregiver":
        link = db.query(CaregiverLink).filter(
            CaregiverLink.caregiver_id == requester.id,
            CaregiverLink.patient_id == patient_id,
            CaregiverLink.status == "active",
        ).first()
        return link is not None
    if requester.role.value == "neurologist":
        assignment = db.query(NeurologistAssignment).filter(
            NeurologistAssignment.neurologist_id == requester.id,
            NeurologistAssignment.patient_id == patient_id,
            NeurologistAssignment.status == "active",
        ).first()
        return assignment is not None
    return False


def require_patient_access(patient_id: str, db: Session, requester: User) -> None:
    if not can_access_patient(db, requester, patient_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this patient's data.",
        )
