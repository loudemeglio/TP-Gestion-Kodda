from sqlalchemy.orm import Session

from app.orders.models import OrderStatus
from app.orders.repositories.order_repository import OrderRepository
from app.ratings.models import SellerRating, SellerReviewQueue
from app.ratings.repositories.rating_repository import RatingRepository
from app.users.repositories.user_repository import UserRepository
from app.moderation.services.scam_moderation_service import ScamModerationService


SCAM_REVIEW_THRESHOLD = 3


class RatingService:
    @staticmethod
    def rate_seller_for_order(
        db: Session,
        *,
        order_id: int,
        buyer_id: int,
        seller_id: int,
        stars: int,
        description: str,
        matches_description: bool,
        delivered_on_time: bool,
        is_scam_report: bool,
    ) -> SellerRating:
        order = OrderRepository.get_by_id_for_user(db, order_id, buyer_id)
        if not order:
            raise LookupError("Orden no encontrada.")

        if order.status != OrderStatus.CONFIRMED:
            raise ValueError("La orden todavía no permite calificación.")

        seller_ids = {i.seller_id for i in (order.items or []) if i.seller_id is not None}
        if seller_id not in seller_ids:
            raise ValueError("Ese vendedor no forma parte de esta orden.")

        existing = RatingRepository.get_for_order_and_seller(db, order_id, buyer_id, seller_id)
        if existing:
            raise ValueError("Ya calificaste a este vendedor para esta orden.")

        if not (1 <= stars <= 5):
            raise ValueError("Las estrellas deben estar entre 1 y 5.")

        description = description.strip()
        if len(description) < 10:
            raise ValueError("La descripción debe tener al menos 10 caracteres.")

        created = RatingRepository.create(
            db,
            SellerRating(
                order_id=order_id,
                buyer_id=buyer_id,
                seller_id=seller_id,
                stars=stars,
                description=description,
                matches_description=matches_description,
                delivered_on_time=delivered_on_time,
                is_scam_report=is_scam_report,
            ),
        )

        if is_scam_report:
            UserRepository.apply_scam_report(db, seller_id)
            scam_count = RatingRepository.count_scam_reports_for_seller(db, seller_id)
            if scam_count >= SCAM_REVIEW_THRESHOLD and not RatingRepository.has_open_review(db, seller_id):
                RatingRepository.enqueue_review(
                    db,
                    SellerReviewQueue(
                        seller_id=seller_id,
                        negative_count_snapshot=scam_count,
                        reason=f"Acumuló {scam_count} reportes de posible estafa.",
                    ),
                )

            ScamModerationService.maybe_flag_seller_and_notify_admins(
                db,
                seller_id=seller_id,
                scam_count=scam_count,
            )

        return created

    @staticmethod
    def rated_seller_ids_for_order(db: Session, order_id: int, buyer_id: int) -> list[int]:
        return RatingRepository.list_rated_seller_ids_for_order(db, order_id, buyer_id)
