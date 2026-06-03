"""Repositorio de solo lectura para datos de reputación de vendedores.

Responsabilidad única: acceso a datos de SellerRating con el contexto necesario
para calcular reputación (promedio, tasas, lista paginada).
"""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ratings.models import SellerRating
from app.users.models import User


class ReputationRepository:
    @staticmethod
    def average_stars_for_seller(db: Session, seller_id: int) -> tuple[float | None, int]:
        """Devuelve (promedio, cantidad) de estrellas de todas las calificaciones."""
        row = (
            db.query(func.avg(SellerRating.stars), func.count(SellerRating.id))
            .filter(SellerRating.seller_id == seller_id)
            .first()
        )
        avg, count = row[0], int(row[1] or 0)
        if count == 0:
            return None, 0
        return round(float(avg), 2), count

    @staticmethod
    def accuracy_rate_for_seller(db: Session, seller_id: int) -> float | None:
        """Porcentaje de reviews donde matches_description=True (veracidad de la prenda)."""
        row = (
            db.query(
                func.count(SellerRating.id).filter(SellerRating.matches_description.is_(True)),
                func.count(SellerRating.id).filter(SellerRating.matches_description.isnot(None)),
            )
            .filter(SellerRating.seller_id == seller_id)
            .first()
        )
        positive, total = int(row[0] or 0), int(row[1] or 0)
        if total == 0:
            return None
        return round(positive / total, 4)

    @staticmethod
    def shipping_rate_for_seller(db: Session, seller_id: int) -> float | None:
        """Porcentaje de reviews donde delivered_on_time=True (cumplimiento de envío)."""
        row = (
            db.query(
                func.count(SellerRating.id).filter(SellerRating.delivered_on_time.is_(True)),
                func.count(SellerRating.id).filter(SellerRating.delivered_on_time.isnot(None)),
            )
            .filter(SellerRating.seller_id == seller_id)
            .first()
        )
        positive, total = int(row[0] or 0), int(row[1] or 0)
        if total == 0:
            return None
        return round(positive / total, 4)

    @staticmethod
    def list_public_ratings(
        db: Session, seller_id: int, skip: int = 0, limit: int = 20
    ) -> list[tuple[SellerRating, str | None]]:
        """Lista de (rating, buyer_username) paginada."""
        rows = (
            db.query(SellerRating, User.username)
            .join(User, User.id == SellerRating.buyer_id)
            .filter(SellerRating.seller_id == seller_id)
            .order_by(SellerRating.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return rows
