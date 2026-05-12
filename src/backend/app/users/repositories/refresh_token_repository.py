from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.users.models import RefreshToken


class RefreshTokenRepository:
    @staticmethod
    def create(db: Session, user_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
        row = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def get_active_by_hash(db: Session, token_hash: str) -> RefreshToken | None:
        now = datetime.now(timezone.utc)
        return (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .first()
        )

    @staticmethod
    def get_by_hash_including_revoked(db: Session, token_hash: str) -> RefreshToken | None:
        return db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    @staticmethod
    def revoke(db: Session, token_id: int) -> None:
        row = db.query(RefreshToken).filter(RefreshToken.id == token_id).first()
        if row and row.revoked_at is None:
            row.revoked_at = datetime.now(timezone.utc)
            db.commit()

    @staticmethod
    def revoke_all_for_user(db: Session, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": now}, synchronize_session=False)
        db.commit()
