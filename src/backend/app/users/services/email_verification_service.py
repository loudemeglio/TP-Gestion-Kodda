import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.mail_service import send_email
from app.users.models import User
from app.users.repositories.email_verification_token_repository import EmailVerificationTokenRepository
from app.users.repositories.user_repository import UserRepository


def _opaque_token_hash(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


class EmailVerificationService:
    @staticmethod
    def create_token_and_enqueue(
        db: Session,
        user: User,
        background_tasks: BackgroundTasks,
    ) -> None:
        if user.email_verified_at is not None:
            return
        settings = get_settings()
        EmailVerificationTokenRepository.invalidate_pending_for_user(db, user.id)
        plain = secrets.token_urlsafe(32)
        token_hash = _opaque_token_hash(plain)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.email_verification_expire_hours)
        EmailVerificationTokenRepository.create(db, user.id, token_hash, expires_at)
        url = f"{settings.public_frontend_url}/verify-email?token={plain}"
        subject = "Verificá tu correo"
        body = (
            f"Hola {user.username},\n\n"
            f"Para verificar tu cuenta abrí este enlace en el navegador:\n{url}\n\n"
            "Si no creaste esta cuenta, ignorá este mensaje.\n"
        )
        background_tasks.add_task(send_email, user.email, subject, body)

    @staticmethod
    def verify_email(db: Session, plain_token: str) -> None:
        token_hash = _opaque_token_hash(plain_token.strip())
        row = EmailVerificationTokenRepository.get_valid_by_hash(db, token_hash)
        if not row:
            raise ValueError("Token inválido o expirado")
        UserRepository.mark_email_verified(db, row.user_id)
        EmailVerificationTokenRepository.mark_used(db, row.id)
