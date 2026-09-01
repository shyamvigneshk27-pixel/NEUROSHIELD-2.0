"""
Centralized application configuration.

All secrets/config are read from environment variables (see backend/.env.example).
Nothing here is hardcoded for production use -- defaults exist only to make local
development possible without a .env file, and are clearly marked as such.
"""
import os
import secrets
from dotenv import load_dotenv

load_dotenv()

# .../backend/app/core/config.py  ->  .../backend
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _dev_secret_warning(name: str, value: str) -> str:
    print(f"[CONFIG] WARNING: {name} not set in environment - using an insecure "
          f"auto-generated development value. Set {name} in backend/.env for any "
          f"non-local deployment.")
    return value


class Settings:
    # --- Auth / JWT ---
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY") or _dev_secret_warning(
        "JWT_SECRET_KEY", secrets.token_urlsafe(48)
    )
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

    # --- Database ---
    DATABASE_URL: str = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(BACKEND_DIR, 'neuroshield.db')}")

    # --- CORS ---
    # Comma-separated explicit allowlist. NEVER default to "*" in this codebase.
    CORS_ORIGINS: list = [
        o.strip() for o in os.environ.get(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",") if o.strip()
    ]

    # --- File uploads ---
    UPLOAD_DIR: str = os.environ.get("UPLOAD_DIR", os.path.join(BACKEND_DIR, "uploads"))
    MAX_CSV_SIZE_BYTES: int = 5 * 1024 * 1024        # 5 MB
    MAX_IMAGE_SIZE_BYTES: int = 15 * 1024 * 1024      # 15 MB
    MAX_EDF_SIZE_BYTES: int = 200 * 1024 * 1024       # 200 MB (multi-channel recordings)

    ALLOWED_CSV_EXTENSIONS = {".csv"}
    ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_EDF_EXTENSIONS = {".edf"}

    # --- Demo/seed accounts (development only) ---
    SEED_DEMO_USERS: bool = os.environ.get("SEED_DEMO_USERS", "true").lower() == "true"
    DEMO_PASSWORD: str = os.environ.get("DEMO_PASSWORD", "NeuroDemo#2026")

    # --- Gemini ---
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

    # --- n8n (webhook base -- populated in a later pass) ---
    N8N_WEBHOOK_BASE: str = os.environ.get("N8N_WEBHOOK_BASE", "")


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
for sub in ("csv", "image", "edf", "reports"):
    os.makedirs(os.path.join(settings.UPLOAD_DIR, sub), exist_ok=True)
