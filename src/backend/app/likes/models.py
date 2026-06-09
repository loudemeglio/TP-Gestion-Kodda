from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ProductLike(Base):
    """Modelo de likes de productos por usuario."""

    __tablename__ = "product_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    product = relationship("Product")

    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_user_product_like"),)

    def __repr__(self):
        return f"<ProductLike(user_id={self.user_id}, product_id={self.product_id})>"
