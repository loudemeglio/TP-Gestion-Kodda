from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.users.models import EmailVerificationToken


class EmailVerificationTokenRepository:
    @staticmethod
    def invalidate_pending_for_user(db: Session, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.used_at.is_(None),
        ).update({"used_at": now}, synchronize_session=False)
        db.commit()

    @staticmethod
    def create(db: Session, user_id: int, token_hash: str, expires_at: datetime) -> EmailVerificationToken:
        row = EmailVerificationToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def get_valid_by_hash(db: Session, token_hash: str) -> EmailVerificationToken | None:
        now = datetime.now(timezone.utc)
        return (
            db.query(EmailVerificationToken)
            .filter(
                EmailVerificationToken.token_hash == token_hash,
                EmailVerificationToken.used_at.is_(None),
                EmailVerificationToken.expires_at > now,
            )
            .first()
        )

    @staticmethod
    def mark_used(db: Session, token_id: int) -> None:
        row = db.query(EmailVerificationToken).filter(EmailVerificationToken.id == token_id).first()
        if row and row.used_at is None:
            row.used_at = datetime.now(timezone.utc)
            db.commit()
