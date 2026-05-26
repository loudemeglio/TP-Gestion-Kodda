import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.core.database import Base


class RatingKind(str, enum.Enum):
    """Legacy: se mantiene para filas antiguas; las nuevas usan stars + is_scam_report."""

    POSITIVE = "positive"
    NEGATIVE = "negative"


class SellerRating(Base):
    """Calificación del comprador a un vendedor por orden (base para reputación futura)."""

    __tablename__ = "seller_ratings"
    __table_args__ = (
        UniqueConstraint("order_id", "buyer_id", "seller_id", name="uq_seller_rating_per_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    stars = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    matches_description = Column(Boolean, nullable=True)
    delivered_on_time = Column(Boolean, nullable=True)
    is_scam_report = Column(Boolean, default=False, nullable=False)

    # Legacy (nullable en filas nuevas)
    kind = Column(Enum(RatingKind), nullable=True)
    score = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SellerReviewQueue(Base):
    """Cola de revisión cuando un vendedor acumula reportes de estafa."""

    __tablename__ = "seller_review_queue"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    negative_count_snapshot = Column(Integer, nullable=False)
    reason = Column(String(500), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
