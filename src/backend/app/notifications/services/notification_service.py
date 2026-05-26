from sqlalchemy.orm import Session

from app.notifications.models import Notification
from app.notifications.repositories.notification_repository import NotificationRepository
from app.orders.models import Order, OrderStatus


class NotificationService:
    SELLER_TITLE = "Compra confirmada"
    SELLER_MESSAGE = (
        "Se confirmó una compra de tus productos. "
        "Podés calificar al comprador desde el detalle de la venta."
    )
    BUYER_TITLE = "¡Compra realizada!"
    BUYER_MESSAGE = (
        "Tu compra fue confirmada. "
        "Podés calificar al vendedor desde el detalle de la compra."
    )

    @staticmethod
    def on_order_confirmed(db: Session, order: Order) -> None:
        """Genera notificaciones para vendedores y comprador cuando la orden queda confirmada."""
        if order.status != OrderStatus.CONFIRMED:
            return

        seller_ids = {
            item.seller_id
            for item in (order.items or [])
            if item.seller_id is not None
        }

        for seller_id in seller_ids:
            NotificationRepository.create(
                db,
                Notification(
                    user_id=seller_id,
                    title=NotificationService.SELLER_TITLE,
                    message=NotificationService.SELLER_MESSAGE,
                    is_read=False,
                    order_id=order.id,
                ),
            )

        # Notificación al comprador para que califique al/los vendedor/es
        NotificationRepository.create(
            db,
            Notification(
                user_id=order.user_id,
                title=NotificationService.BUYER_TITLE,
                message=NotificationService.BUYER_MESSAGE,
                is_read=False,
                order_id=order.id,
            ),
        )

        db.commit()

    @staticmethod
    def list_for_user(db: Session, user_id: int, limit: int = 50) -> list[Notification]:
        return NotificationRepository.list_for_user(db, user_id, limit)

    @staticmethod
    def mark_read(db: Session, notification_id: int, user_id: int) -> Notification:
        row = NotificationRepository.get_by_id_for_user(db, notification_id, user_id)
        if not row:
            raise LookupError("Notificación no encontrada.")
        if row.is_read:
            return row
        return NotificationRepository.mark_read(db, row)
