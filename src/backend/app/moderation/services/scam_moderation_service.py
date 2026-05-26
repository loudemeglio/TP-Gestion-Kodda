from sqlalchemy.orm import Session

from app.notifications.models import Notification
from app.notifications.repositories.notification_repository import NotificationRepository
from app.orders.models import OrderStatus
from app.system_settings.repositories.system_setting_repository import SystemSettingRepository
from app.users.models import UserRole
from app.users.repositories.user_repository import UserRepository


class ScamModerationService:
    """Moderación por reportes de estafa a vendedores.

    Extiende el flujo existente (rating) sin romper lógica previa.
    """

    ADMIN_FLAG_TITLE = "Usuario bajo revisión administrativa"
    ADMIN_FLAG_MESSAGE_TEMPLATE = (
        "El usuario {username} alcanzó el límite de reportes de posible estafa ({scam_count} / {limit})."
    )

    @staticmethod
    def maybe_flag_seller_and_notify_admins(
        db: Session,
        *,
        seller_id: int,
        scam_count: int,
    ) -> None:
        limit = SystemSettingRepository.get_int(db, "max_scam_reports", default=1) or 1
        if scam_count < limit:
            return

        seller = UserRepository.get_by_id(db, seller_id)
        if seller is None:
            return

        if getattr(seller, "needs_review", False):
            # Evitar spam de notificaciones si el flag ya estaba activo.
            return

        seller.needs_review = True
        seller.is_flagged = True
        db.commit()
        db.refresh(seller)

        admin_users = UserRepository.get_by_role(db, UserRole.ADMIN)
        admin_ids = [u.id for u in admin_users if u.id is not None]
        if not admin_ids:
            return

        for admin_id in admin_ids:
            NotificationRepository.create(
                db,
                Notification(
                    user_id=admin_id,
                    title=ScamModerationService.ADMIN_FLAG_TITLE,
                    message=ScamModerationService.ADMIN_FLAG_MESSAGE_TEMPLATE.format(
                        username=seller.username,
                        scam_count=scam_count,
                        limit=limit,
                    ),
                    is_read=False,
                    order_id=None,
                ),
            )

        db.commit()

