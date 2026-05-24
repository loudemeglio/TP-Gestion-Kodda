import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OrderStatus(str, enum.Enum):
    CONFIRMED = "confirmed"


class PaymentMethod(str, enum.Enum):
    TRANSFERENCIA = "transferencia"
    MERCADO_PAGO = "mercado_pago"
    TARJETA_CREDITO = "tarjeta_credito"
    TARJETA_DEBITO = "tarjeta_debito"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.CONFIRMED, nullable=False)
    subtotal = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    payment_method = Column(
        Enum(PaymentMethod),
        default=PaymentMethod.TRANSFERENCIA,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="order", uselist=False, cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String, nullable=False)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    order = relationship("Order", back_populates="items")


class Invoice(Base):
    __tablename__ = "invoices"

    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), primary_key=True)
    legal_name = Column(String(200), nullable=False)
    tax_id = Column(String(20), nullable=False)
    tax_condition = Column(String(50), nullable=False)
    billing_address = Column(String(300), nullable=False)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    billing_email = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="invoice")
