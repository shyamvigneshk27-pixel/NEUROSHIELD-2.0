from sqlalchemy.orm import Session

from app.db.models import AuditLog


def record_audit(
    db: Session,
    *,
    user_id: str | None,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Append-only audit trail entry: who / what / when.
    Never pass raw patient content (PHI) in `detail` -- only identifiers and short labels.
    """
    entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
