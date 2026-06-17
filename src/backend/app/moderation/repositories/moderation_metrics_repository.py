from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.orders.models import OrderItem
from app.products.models import Product
from app.ratings.models import SellerRating
from app.buyer_reviews.models import BuyerReview
from app.users.models import User


class ModerationMetricsRepository:
    @staticmethod
    def list_product_ids_for_order_seller(db: Session, order_id: int, seller_id: int) -> list[int]:
        rows = (
            db.query(OrderItem.product_id)
            .filter(
                OrderItem.order_id == order_id,
                OrderItem.seller_id == seller_id,
                OrderItem.product_id.isnot(None),
            )
            .distinct()
            .all()
        )
        return [row[0] for row in rows]

    @staticmethod
    def count_bad_ratings_for_product(db: Session, product_id: int, max_stars: int) -> int:
        bad_rating_case = case((SellerRating.stars <= max_stars, 1), else_=0)
        result = (
            db.query(func.sum(bad_rating_case))
            .select_from(Product)
            .join(OrderItem, Product.id == OrderItem.product_id)
            .join(
                SellerRating,
                (OrderItem.order_id == SellerRating.order_id)
                & (OrderItem.seller_id == SellerRating.seller_id),
            )
            .filter(Product.id == product_id)
            .scalar()
        )
        return int(result or 0)

    @staticmethod
    def count_bad_reviews_for_buyer(db: Session, buyer_id: int, max_stars: int) -> int:
        return (
            db.query(BuyerReview)
            .filter(BuyerReview.buyer_id == buyer_id, BuyerReview.stars <= max_stars)
            .count()
        )

    @staticmethod
    def list_bad_feedback_products(
        db: Session,
        *,
        min_bad_ratings: int,
        max_stars: int,
    ):
        bad_rating_case = case((SellerRating.stars <= max_stars, 1), else_=0)

        return (
            db.query(
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                Product.seller_id.label("seller_id"),
                User.username.label("seller_username"),
                Product.category.label("category"),
                Product.price.label("price"),
                Product.is_paused.label("is_paused"),
                Product.needs_review.label("needs_review"),
                func.sum(bad_rating_case).label("bad_rating_count"),
                func.avg(SellerRating.stars).label("average_stars"),
            )
            .join(User, Product.seller_id == User.id)
            .join(OrderItem, Product.id == OrderItem.product_id)
            .join(
                SellerRating,
                (OrderItem.order_id == SellerRating.order_id)
                & (OrderItem.seller_id == SellerRating.seller_id),
            )
            .group_by(
                Product.id,
                Product.name,
                Product.seller_id,
                User.username,
                Product.category,
                Product.price,
                Product.is_paused,
                Product.needs_review,
            )
            .having(func.sum(bad_rating_case) >= min_bad_ratings)
            .order_by(func.sum(bad_rating_case).desc())
            .all()
        )
