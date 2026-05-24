from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.payments.models import PaymentIntent, PaymentIntentStatus


class PaymentIntentRepository:
    @staticmethod
    def get_by_token(db: Session, token: str) -> PaymentIntent | None:
        return db.query(PaymentIntent).filter(PaymentIntent.token == token).first()

    @staticmethod
    def expire_pending_for_user(db: Session, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        pending = (
            db.query(PaymentIntent)
            .filter(
                PaymentIntent.user_id == user_id,
                PaymentIntent.status == PaymentIntentStatus.PENDING,
            )
            .all()
        )
        for intent in pending:
            intent.status = PaymentIntentStatus.EXPIRED

    @staticmethod
    def create(
        db: Session,
        user_id: int,
        amount: float,
        token: str,
        expires_at: datetime,
    ) -> PaymentIntent:
        intent = PaymentIntent(
            token=token,
            user_id=user_id,
            amount=amount,
            status=PaymentIntentStatus.PENDING,
            expires_at=expires_at,
        )
        db.add(intent)
        db.flush()
        return intent

    @staticmethod
    def mark_approved(db: Session, intent: PaymentIntent) -> PaymentIntent:
        intent.status = PaymentIntentStatus.APPROVED
        intent.approved_at = datetime.now(timezone.utc)
        db.flush()
        return intent
