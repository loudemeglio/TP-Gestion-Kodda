"""SellerReputationService — Orquestación de datos de reputación.

Responsabilidad: coordinar repositorios y delegar el cálculo matemático al
ReputationCalculatorService. No contiene lógica de fórmulas propias.
"""
from sqlalchemy.orm import Session

from app.ratings.repositories.reputation_repository import ReputationRepository
from app.ratings.schemas import SellerRatingPublicDTO, SellerReputationDTO
from app.ratings.services.reputation_calculator_service import ReputationCalculatorService
from app.users.repositories.user_repository import UserRepository


class SellerReputationService:
    @staticmethod
    def get_seller_reputation(
        db: Session,
        seller_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> SellerReputationDTO:
        """
        Construye el DTO completo de reputación de un vendedor.

        El puntaje consolidado se delega completamente al
        ReputationCalculatorService (SRP / separación de responsabilidades).
        """
        user = UserRepository.get_by_id(db, seller_id)
        if not user:
            raise LookupError("Vendedor no encontrado.")

        avg, count = ReputationRepository.average_stars_for_seller(db, seller_id)
        accuracy_rate = ReputationRepository.accuracy_rate_for_seller(db, seller_id)
        shipping_rate = ReputationRepository.shipping_rate_for_seller(db, seller_id)
        rows = ReputationRepository.list_public_ratings(db, seller_id, skip=skip, limit=limit)

        # Delegar cálculo al servicio de fórmulas (SRP).
        # answered_questions_ratio = 0.0 hasta que se integre el módulo de Q&A;
        # OCP: solo hay que pasar el ratio correcto aquí cuando esté disponible.
        reputation_score: float | None = None
        if avg is not None:
            breakdown = ReputationCalculatorService.calculate(
                average_stars=avg,
                accuracy_rate=accuracy_rate,
                shipping_rate=shipping_rate,
                answered_questions_ratio=0.0,
            )
            reputation_score = breakdown.final_score

        reviews = [
            SellerRatingPublicDTO(
                id=rating.id,
                stars=rating.stars,
                description=rating.description,
                matches_description=rating.matches_description,
                delivered_on_time=rating.delivered_on_time,
                created_at=rating.created_at,
                buyer_username=buyer_username,
            )
            for rating, buyer_username in rows
        ]

        return SellerReputationDTO(
            seller_id=seller_id,
            username=user.username,
            reputation_score=reputation_score,
            average_stars=avg,
            review_count=count,
            accuracy_rate=accuracy_rate,
            shipping_rate=shipping_rate,
            reviews=reviews,
        )
