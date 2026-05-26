from sqlalchemy.orm import Session

from app.ratings.models import SellerRating, SellerReviewQueue


class RatingRepository:
    @staticmethod
    def get_for_order_and_seller(
        db: Session, order_id: int, buyer_id: int, seller_id: int
    ) -> SellerRating | None:
        return (
            db.query(SellerRating)
            .filter(
                SellerRating.order_id == order_id,
                SellerRating.buyer_id == buyer_id,
                SellerRating.seller_id == seller_id,
            )
            .first()
        )

    @staticmethod
    def list_rated_seller_ids_for_order(db: Session, order_id: int, buyer_id: int) -> list[int]:
        rows = (
            db.query(SellerRating.seller_id)
            .filter(SellerRating.order_id == order_id, SellerRating.buyer_id == buyer_id)
            .all()
        )
        return [row[0] for row in rows]

    @staticmethod
    def create(db: Session, rating: SellerRating) -> SellerRating:
        db.add(rating)
        db.commit()
        db.refresh(rating)
        return rating

    @staticmethod
    def count_scam_reports_for_seller(db: Session, seller_id: int) -> int:
        return (
            db.query(SellerRating)
            .filter(SellerRating.seller_id == seller_id, SellerRating.is_scam_report.is_(True))
            .count()
        )

    @staticmethod
    def has_open_review(db: Session, seller_id: int) -> bool:
        return (
            db.query(SellerReviewQueue)
            .filter(SellerReviewQueue.seller_id == seller_id, SellerReviewQueue.resolved_at.is_(None))
            .first()
            is not None
        )

    @staticmethod
    def enqueue_review(db: Session, row: SellerReviewQueue) -> None:
        db.add(row)
        db.commit()
