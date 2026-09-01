import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import hash_password, verify_password, create_access_token
from app.db.database import get_db
from app.db.models import User, Role
from app.utils.audit import record_audit

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_SELF_SIGNUP_ROLES = {Role.patient.value, Role.caregiver.value, Role.neurologist.value}


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: str
    locale: str = "en"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    locale: str

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if payload.role not in ALLOWED_SELF_SIGNUP_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role for self-registration.")

    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=Role(payload.role),
        locale=payload.locale,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit(db, user_id=user.id, action="auth.register", target_type="user", target_id=user.id,
                 ip_address=_client_ip(request))

    token = create_access_token(subject=user.id, role=user.role.value, locale=user.locale)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    # Constant-shape failure path: don't reveal whether the email exists.
    if not user or not verify_password(payload.password, user.hashed_password):
        record_audit(db, user_id=None, action="auth.login_failed",
                      detail=f"email={payload.email.lower()}", ip_address=_client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated.")

    record_audit(db, user_id=user.id, action="auth.login", target_type="user", target_id=user.id,
                 ip_address=_client_ip(request))

    token = create_access_token(subject=user.id, role=user.role.value, locale=user.locale)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
