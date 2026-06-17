from sqlalchemy.orm import Session

from app.moderation.repositories.moderation_metrics_repository import ModerationMetricsRepository
from app.notifications.models import Notification
from app.notifications.repositories.notification_repository import NotificationRepository
from app.products.repositories.product_repository import ProductRepository
from app.system_settings.repositories.system_setting_repository import SystemSettingRepository
from app.users.models import UserRole
from app.users.repositories.user_repository import UserRepository


class BadFeedbackModerationService:
    """Moderación por acumulación de críticas en publicaciones."""

    ADMIN_ALERT_TITLE = "Publicación con muchas críticas"
    ADMIN_ALERT_MESSAGE_TEMPLATE = (
        'La publicación "{product_name}" acumuló {bad_count} críticas (umbral: {limit}).'
    )

    @staticmethod
    def maybe_flag_products_and_notify_admins(
        db: Session,
        *,
        order_id: int,
        seller_id: int,
        stars: int,
    ) -> None:
        max_stars = SystemSettingRepository.get_int(db, "max_stars", default=2) or 2
        if stars > max_stars:
            return

        min_bad_ratings = SystemSettingRepository.get_int(db, "min_bad_ratings", default=2) or 2
        product_ids = ModerationMetricsRepository.list_product_ids_for_order_seller(
            db, order_id, seller_id
        )
        if not product_ids:
            return

        admin_users = UserRepository.get_by_role(db, UserRole.ADMIN)
        admin_ids = [u.id for u in admin_users if u.id is not None]
        if not admin_ids:
            return

        for product_id in product_ids:
            product = ProductRepository.get_by_id(db, product_id)
            if product is None:
                continue

            if getattr(product, "needs_review", False):
                continue

            bad_count = ModerationMetricsRepository.count_bad_ratings_for_product(
                db, product_id, max_stars
            )
            if bad_count < min_bad_ratings:
                continue

            product.needs_review = True
            db.commit()
            db.refresh(product)

            message = BadFeedbackModerationService.ADMIN_ALERT_MESSAGE_TEMPLATE.format(
                product_name=product.name,
                bad_count=bad_count,
                limit=min_bad_ratings,
            )
            for admin_id in admin_ids:
                NotificationRepository.create(
                    db,
                    Notification(
                        user_id=admin_id,
                        title=BadFeedbackModerationService.ADMIN_ALERT_TITLE,
                        message=message,
                        is_read=False,
                        order_id=None,
                        product_id=product.id,
                    ),
                )
            db.commit()
