from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import PasswordResetToken


class PasswordResetTokenRepository:
    @staticmethod
    def invalidate_pending_for_user(db: Session, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": now}, synchronize_session=False)
        db.commit()

    @staticmethod
    def create(db: Session, user_id: int, token_hash: str, expires_at: datetime) -> PasswordResetToken:
        row = PasswordResetToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def get_valid_by_hash(db: Session, token_hash: str) -> PasswordResetToken | None:
        now = datetime.now(timezone.utc)
        return (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
            .first()
        )

    @staticmethod
    def mark_used(db: Session, token_id: int) -> None:
        row = db.query(PasswordResetToken).filter(PasswordResetToken.id == token_id).first()
        if row and row.used_at is None:
            row.used_at = datetime.now(timezone.utc)
            db.commit()
