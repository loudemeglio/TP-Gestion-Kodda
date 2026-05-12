import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.config import get_settings
from app.repositories.password_reset_token_repository import PasswordResetTokenRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.mail_service import send_email
from app.services.user_service import UserService


def _opaque_token_hash(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


class PasswordResetService:
    @staticmethod
    def request_reset(db: Session, email: str, background_tasks: BackgroundTasks) -> None:
        user = UserRepository.get_by_email(db, email.strip())
        if not user:
            return
        settings = get_settings()
        PasswordResetTokenRepository.invalidate_pending_for_user(db, user.id)
        plain = secrets.token_urlsafe(32)
        token_hash = _opaque_token_hash(plain)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_expire_minutes)
        PasswordResetTokenRepository.create(db, user.id, token_hash, expires_at)
        url = f"{settings.public_frontend_url}/reset-password?token={plain}"
        subject = "Restablecer contraseña"
        body = (
            f"Hola {user.username},\n\n"
            f"Para elegir una nueva contraseña abrí este enlace:\n{url}\n\n"
            "Si no pediste este cambio, ignorá este mensaje.\n"
        )
        background_tasks.add_task(send_email, user.email, subject, body)

    @staticmethod
    def reset_password(db: Session, plain_token: str, new_password: str) -> None:
        token_hash = _opaque_token_hash(plain_token.strip())
        row = PasswordResetTokenRepository.get_valid_by_hash(db, token_hash)
        if not row:
            raise ValueError("Token inválido o expirado")
        hashed = UserService.hash_password(new_password)
        UserRepository.set_hashed_password(db, row.user_id, hashed)
        PasswordResetTokenRepository.mark_used(db, row.id)
        AuthService.revoke_all_refresh_for_user(db, row.user_id)
