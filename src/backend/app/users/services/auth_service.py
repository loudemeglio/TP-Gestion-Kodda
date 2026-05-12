import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.tokens import create_access_token
from app.users.models import User
from app.users.repositories.refresh_token_repository import RefreshTokenRepository
from app.users.repositories.user_repository import UserRepository
from app.users.services.user_service import UserService


def hash_refresh_token(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


class AuthService:
    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> User | None:
        """OAuth2 envía el identificador en `username`; acepta nombre de usuario o email."""
        ident = (username or "").strip()
        user = UserRepository.get_by_username(db, ident)
        if not user and "@" in ident:
            user = UserRepository.get_by_email(db, ident)
        if not user:
            return None
        if not UserService.verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def issue_token_pair(db: Session, user: User) -> tuple[str, str]:
        settings = get_settings()
        access = create_access_token(str(user.id), user.role.value)
        plain_refresh = secrets.token_urlsafe(32)
        token_hash = hash_refresh_token(plain_refresh)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
        RefreshTokenRepository.create(db, user.id, token_hash, expires_at)
        return access, plain_refresh

    @staticmethod
    def rotate_refresh(db: Session, plain_refresh: str) -> tuple[str, str]:
        settings = get_settings()
        token_hash = hash_refresh_token(plain_refresh)
        active = RefreshTokenRepository.get_active_by_hash(db, token_hash)
        if active:
            RefreshTokenRepository.revoke(db, active.id)
            user = UserRepository.get_by_id(db, active.user_id)
            if not user:
                raise ValueError("Usuario no encontrado")
            if settings.require_email_verification_for_login and user.email_verified_at is None:
                raise ValueError("Debés verificar tu correo antes de renovar la sesión.")
            access = create_access_token(str(user.id), user.role.value)
            new_plain = secrets.token_urlsafe(32)
            new_hash = hash_refresh_token(new_plain)
            expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
            RefreshTokenRepository.create(db, user.id, new_hash, expires_at)
            return access, new_plain

        reused = RefreshTokenRepository.get_by_hash_including_revoked(db, token_hash)
        if reused is not None and reused.revoked_at is not None:
            RefreshTokenRepository.revoke_all_for_user(db, reused.user_id)

        raise ValueError("Refresh token inválido o expirado")

    @staticmethod
    def revoke_refresh(db: Session, plain_refresh: str) -> None:
        token_hash = hash_refresh_token(plain_refresh)
        row = RefreshTokenRepository.get_active_by_hash(db, token_hash)
        if row:
            RefreshTokenRepository.revoke(db, row.id)

    @staticmethod
    def revoke_all_refresh_for_user(db: Session, user_id: int) -> None:
        RefreshTokenRepository.revoke_all_for_user(db, user_id)
