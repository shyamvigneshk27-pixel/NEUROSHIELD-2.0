"""
Seeds development-only demo accounts so the app is usable immediately after
`init_db()` without a manual sign-up flow.

This runs only when SEED_DEMO_USERS=true (default for local dev) AND the users
table is empty, so it never overwrites a real deployment's data. Passwords come
from DEMO_PASSWORD in the environment (see backend/.env.example) -- never
hardcoded credentials shipped as a bypass.
"""
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.core.config import settings
from app.db.models import User, Role, CaregiverLink, NeurologistAssignment

DEMO_ACCOUNTS = [
    ("patient@neuroshield.dev", "Aarav Patient", Role.patient),
    ("caregiver@neuroshield.dev", "Meera Caregiver", Role.caregiver),
    ("neurologist@neuroshield.dev", "Dr. Kavya Neurologist", Role.neurologist),
    ("admin@neuroshield.dev", "System Administrator", Role.admin),
]


def seed_demo_data(db: Session) -> None:
    if not settings.SEED_DEMO_USERS:
        return
    if db.query(User).count() > 0:
        return  # never touch an already-populated database

    created = {}
    for email, name, role in DEMO_ACCOUNTS:
        user = User(
            email=email,
            full_name=name,
            hashed_password=hash_password(settings.DEMO_PASSWORD),
            role=role,
            locale="en",
        )
        db.add(user)
        created[role] = user

    db.flush()  # assign IDs before creating relationships

    db.add(CaregiverLink(caregiver_id=created[Role.caregiver].id, patient_id=created[Role.patient].id))
    db.add(NeurologistAssignment(neurologist_id=created[Role.neurologist].id, patient_id=created[Role.patient].id))

    db.commit()

    print("[SEED] Demo accounts created (development only):")
    for email, _, role in DEMO_ACCOUNTS:
        print(f"        {role.value:<12} {email}  /  password: {settings.DEMO_PASSWORD}")
