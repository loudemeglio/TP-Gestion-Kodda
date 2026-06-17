from sqlalchemy.orm import Session

from app.notifications.models import Notification
from app.notifications.repositories.notification_repository import NotificationRepository
from app.system_settings.repositories.system_setting_repository import SystemSettingRepository
from app.users.models import UserRole
from app.users.repositories.user_repository import UserRepository


class BuyerReviewModerationService:
    """Moderación por acumulación de reseñas negativas en perfiles de comprador."""

    ADMIN_ALERT_TITLE = "Comprador con muchas críticas"
    ADMIN_ALERT_MESSAGE_TEMPLATE = (
        "El usuario {username} acumuló {bad_count} reseñas negativas (umbral: {limit})."
    )

    @staticmethod
    def maybe_flag_buyer_and_notify_admins(
        db: Session,
        *,
        buyer_id: int,
        bad_review_count: int,
    ) -> None:
        limit = SystemSettingRepository.get_int(db, "min_bad_ratings", default=2) or 2
        if bad_review_count < limit:
            return

        buyer = UserRepository.get_by_id(db, buyer_id)
        if buyer is None:
            return

        if getattr(buyer, "needs_review", False):
            return

        buyer.needs_review = True
        buyer.is_flagged = True
        db.commit()
        db.refresh(buyer)

        admin_users = UserRepository.get_by_role(db, UserRole.ADMIN)
        admin_ids = [u.id for u in admin_users if u.id is not None]
        if not admin_ids:
            return

        for admin_id in admin_ids:
            NotificationRepository.create(
                db,
                Notification(
                    user_id=admin_id,
                    title=BuyerReviewModerationService.ADMIN_ALERT_TITLE,
                    message=BuyerReviewModerationService.ADMIN_ALERT_MESSAGE_TEMPLATE.format(
                        username=buyer.username,
                        bad_count=bad_review_count,
                        limit=limit,
                    ),
                    is_read=False,
                    order_id=None,
                    product_id=None,
                ),
            )

        db.commit()
