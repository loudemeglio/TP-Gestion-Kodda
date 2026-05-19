import os
from functools import lru_cache


def _parse_origins(raw: str | None) -> list[str]:
    if not raw or not raw.strip():
        return ["http://localhost:3000"]
    return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings():
    """Configuración cargada desde variables de entorno."""
    return _Settings()


def _bool_env(key: str, default: str = "false") -> bool:
    return os.getenv(key, default).lower() in ("1", "true", "yes")


class _Settings:
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY", "dev-insecure-change-me-use-strong-secret-in-production")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        self.frontend_origins = _parse_origins(os.getenv("FRONTEND_ORIGINS"))
        raw_signup = os.getenv("ALLOW_PUBLIC_SIGNUP", "false").lower()
        self.allow_public_signup = raw_signup in ("1", "true", "yes")

        # Correo (SMTP) y enlaces públicos
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_from = os.getenv("SMTP_FROM", "")
        self.smtp_use_tls = _bool_env("SMTP_USE_TLS", "true")
        self.mail_suppress = _bool_env("MAIL_SUPPRESS", "true")
        self.public_frontend_url = os.getenv("PUBLIC_FRONTEND_URL", "http://localhost:3000").rstrip("/")
        self.email_verification_expire_hours = int(os.getenv("EMAIL_VERIFICATION_EXPIRE_HOURS", "48"))
        self.password_reset_expire_minutes = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "60"))
        self.require_email_verification_for_login = _bool_env("REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN", "false")

        self.upload_dir = os.getenv("UPLOAD_DIR", "uploads")
        self.avatar_max_bytes = int(os.getenv("AVATAR_MAX_BYTES", str(2 * 1024 * 1024)))
