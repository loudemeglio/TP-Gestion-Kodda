import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.cart.repositories.cart_repository import CartRepository
from app.core.config import get_settings
from app.payments.models import PaymentIntent, PaymentIntentStatus
from app.payments.repositories.payment_intent_repository import PaymentIntentRepository
from app.payments.schemas import (
    PaymentIntentApproveResponse,
    PaymentIntentCreateResponse,
    PaymentIntentStatusDTO,
)

INTENT_TTL_MINUTES = 15


class PaymentIntentService:
    @staticmethod
    def _cart_total(db: Session, user_id: int) -> float:
        cart_items = CartRepository.get_by_user(db, user_id)
        if not cart_items:
            raise ValueError("Tu carrito está vacío.")

        total = 0.0
        for cart_item in cart_items:
            product = cart_item.product
            if not product:
                raise ValueError("Hay un producto en tu carrito que ya no existe.")
            if product.is_paused:
                raise ValueError(f'"{product.name}" no está disponible para la compra.')
            total += product.price * cart_item.quantity

        return round(total, 2)

    @staticmethod
    def _payment_url(token: str) -> str:
        base = get_settings().public_frontend_url.rstrip("/")
        return f"{base}/pagar/{token}"

    @staticmethod
    def _effective_status(intent: PaymentIntent) -> PaymentIntentStatus:
        if intent.status == PaymentIntentStatus.PENDING:
            now = datetime.now(timezone.utc)
            expires = intent.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if now > expires:
                return PaymentIntentStatus.EXPIRED
        return intent.status

    @staticmethod
    def create_intent(db: Session, user_id: int) -> PaymentIntentCreateResponse:
        amount = PaymentIntentService._cart_total(db, user_id)
        PaymentIntentRepository.expire_pending_for_user(db, user_id)

        token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=INTENT_TTL_MINUTES)
        intent = PaymentIntentRepository.create(db, user_id, amount, token, expires_at)
        db.commit()
        db.refresh(intent)

        return PaymentIntentCreateResponse(
            token=intent.token,
            amount=intent.amount,
            status=intent.status.value,
            payment_url=PaymentIntentService._payment_url(intent.token),
            expires_at=intent.expires_at,
        )

    @staticmethod
    def get_status(db: Session, token: str) -> PaymentIntentStatusDTO:
        intent = PaymentIntentRepository.get_by_token(db, token)
        if not intent:
            raise LookupError("Pago no encontrado.")

        status = PaymentIntentService._effective_status(intent)
        if status == PaymentIntentStatus.EXPIRED and intent.status == PaymentIntentStatus.PENDING:
            intent.status = PaymentIntentStatus.EXPIRED
            db.commit()

        return PaymentIntentStatusDTO(
            token=intent.token,
            amount=intent.amount,
            status=status.value,
            expires_at=intent.expires_at,
        )

    @staticmethod
    def approve(db: Session, token: str) -> PaymentIntentApproveResponse:
        intent = PaymentIntentRepository.get_by_token(db, token)
        if not intent:
            raise LookupError("Pago no encontrado.")

        status = PaymentIntentService._effective_status(intent)
        if status == PaymentIntentStatus.APPROVED:
            return PaymentIntentApproveResponse(
                token=intent.token,
                status=PaymentIntentStatus.APPROVED.value,
                amount=intent.amount,
            )
        if status == PaymentIntentStatus.EXPIRED:
            if intent.status == PaymentIntentStatus.PENDING:
                intent.status = PaymentIntentStatus.EXPIRED
                db.commit()
            raise ValueError("Este código de pago expiró.")

        PaymentIntentRepository.mark_approved(db, intent)
        db.commit()
        db.refresh(intent)

        return PaymentIntentApproveResponse(
            token=intent.token,
            status=intent.status.value,
            amount=intent.amount,
        )
