from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class Brand(Base):
    """Marca maestra del catálogo (soft delete vía is_active)."""

    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Brand(id={self.id}, name={self.name!r}, is_active={self.is_active})>"


class Category(Base):
    """Categoría maestra del catálogo (soft delete vía is_active)."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Category(id={self.id}, name={self.name!r}, is_active={self.is_active})>"
