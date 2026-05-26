from sqlalchemy.orm import Session

from app.orders.models import OrderStatus
from app.orders.repositories.order_repository import OrderRepository
from app.ratings.models import RatingKind, SellerRating, SellerReviewQueue
from app.ratings.repositories.rating_repository import RatingRepository


NEGATIVE_REPORT_THRESHOLD = 3


class RatingService:
    @staticmethod
    def rate_seller_for_order(
        db: Session,
        *,
        order_id: int,
        buyer_id: int,
        seller_id: int,
        kind: str,
        score: int | None,
        comment: str | None,
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

        rating_kind = RatingKind(kind)
        if score is not None and not (1 <= score <= 5):
            raise ValueError("El puntaje debe estar entre 1 y 5.")

        created = RatingRepository.create(
            db,
            SellerRating(
                order_id=order_id,
                buyer_id=buyer_id,
                seller_id=seller_id,
                kind=rating_kind,
                score=score,
                comment=comment,
            ),
        )

        if rating_kind == RatingKind.NEGATIVE:
            negative_count = RatingRepository.count_negative_for_seller(db, seller_id)
            if negative_count >= NEGATIVE_REPORT_THRESHOLD and not RatingRepository.has_open_review(db, seller_id):
                RatingRepository.enqueue_review(
                    db,
                    SellerReviewQueue(
                        seller_id=seller_id,
                        negative_count_snapshot=negative_count,
                        reason=f"Acumuló {negative_count} reportes negativos.",
                    ),
                )

        return created

