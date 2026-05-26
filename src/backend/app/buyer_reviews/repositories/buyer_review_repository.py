from sqlalchemy import func
from sqlalchemy.orm import Session

from app.buyer_reviews.models import BuyerReview
from app.users.models import User


class BuyerReviewRepository:
    @staticmethod
    def get_for_order_and_seller(db: Session, order_id: int, seller_id: int) -> BuyerReview | None:
        return (
            db.query(BuyerReview)
            .filter(BuyerReview.order_id == order_id, BuyerReview.seller_id == seller_id)
            .first()
        )

    @staticmethod
    def create(db: Session, review: BuyerReview) -> BuyerReview:
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def list_for_buyer(db: Session, buyer_id: int, limit: int = 50) -> list[tuple[BuyerReview, str | None]]:
        rows = (
            db.query(BuyerReview, User.username)
            .join(User, User.id == BuyerReview.seller_id)
            .filter(BuyerReview.buyer_id == buyer_id)
            .order_by(BuyerReview.created_at.desc())
            .limit(limit)
            .all()
        )
        return rows

    @staticmethod
    def average_stars_for_buyer(db: Session, buyer_id: int) -> tuple[float | None, int]:
        row = (
            db.query(func.avg(BuyerReview.stars), func.count(BuyerReview.id))
            .filter(BuyerReview.buyer_id == buyer_id)
            .first()
        )
        avg, count = row[0], int(row[1] or 0)
        if count == 0:
            return None, 0
        return round(float(avg), 2), count
