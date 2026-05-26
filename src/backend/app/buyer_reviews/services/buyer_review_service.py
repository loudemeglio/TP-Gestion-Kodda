from sqlalchemy.orm import Session

from app.buyer_reviews.models import BuyerReview
from app.buyer_reviews.repositories.buyer_review_repository import BuyerReviewRepository
from app.buyer_reviews.schemas import BuyerReputationDTO, BuyerReviewPublicDTO
from app.orders.models import OrderStatus
from app.orders.repositories.order_repository import OrderRepository
from app.users.repositories.user_repository import UserRepository


class BuyerReviewService:
    @staticmethod
    def rate_buyer_for_order(
        db: Session,
        *,
        order_id: int,
        seller_id: int,
        stars: int,
        comment: str,
    ) -> BuyerReview:
        order = OrderRepository.get_by_id_for_seller(db, order_id, seller_id)
        if not order:
            raise LookupError("Venta no encontrada.")

        if order.status != OrderStatus.CONFIRMED:
            raise ValueError("Solo podés calificar compradores en órdenes confirmadas.")

        buyer_id = order.user_id

        existing = BuyerReviewRepository.get_for_order_and_seller(db, order_id, seller_id)
        if existing:
            raise ValueError("Ya calificaste al comprador para esta venta.")

        if not (1 <= stars <= 5):
            raise ValueError("Las estrellas deben estar entre 1 y 5.")

        comment = comment.strip()
        if len(comment) < 10:
            raise ValueError("El comentario debe tener al menos 10 caracteres.")

        return BuyerReviewRepository.create(
            db,
            BuyerReview(
                order_id=order_id,
                seller_id=seller_id,
                buyer_id=buyer_id,
                stars=stars,
                comment=comment,
            ),
        )

    @staticmethod
    def buyer_already_rated(db: Session, order_id: int, seller_id: int) -> bool:
        return BuyerReviewRepository.get_for_order_and_seller(db, order_id, seller_id) is not None

    @staticmethod
    def get_buyer_reputation(db: Session, buyer_id: int) -> BuyerReputationDTO:
        user = UserRepository.get_by_id(db, buyer_id)
        if not user:
            raise LookupError("Comprador no encontrado.")

        avg, count = BuyerReviewRepository.average_stars_for_buyer(db, buyer_id)
        rows = BuyerReviewRepository.list_for_buyer(db, buyer_id)
        reviews = [
            BuyerReviewPublicDTO(
                id=review.id,
                stars=review.stars,
                comment=review.comment,
                created_at=review.created_at,
                seller_username=username,
            )
            for review, username in rows
        ]

        return BuyerReputationDTO(
            buyer_id=buyer_id,
            username=user.username,
            average_stars=avg,
            review_count=count,
            reviews=reviews,
        )
