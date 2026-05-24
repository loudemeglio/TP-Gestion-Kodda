from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.users.schemas import BillingInfoUpsertDTO, TaxCondition


class PaymentMethod(str, Enum):
    """Medios permitidos en checkout (órdenes antiguas pueden tener transferencia)."""

    TRANSFERENCIA = "transferencia"
    MERCADO_PAGO = "mercado_pago"
    TARJETA_CREDITO = "tarjeta_credito"
    TARJETA_DEBITO = "tarjeta_debito"


class CheckoutPaymentMethod(str, Enum):
    MERCADO_PAGO = "mercado_pago"
    TARJETA_CREDITO = "tarjeta_credito"
    TARJETA_DEBITO = "tarjeta_debito"


class InvoiceDTO(BaseModel):
    order_id: int
    legal_name: str
    tax_id: str
    tax_condition: TaxCondition
    billing_address: str
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    billing_email: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrderItemDTO(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: str
    unit_price: float
    quantity: int
    seller_id: Optional[int]
    line_total: float

    class Config:
        from_attributes = True


class OrderDetailDTO(BaseModel):
    id: int
    user_id: int
    status: str
    subtotal: float
    total: float
    payment_method: str
    created_at: datetime
    items: list[OrderItemDTO]
    invoice: InvoiceDTO

    class Config:
        from_attributes = True


class OrderSummaryDTO(BaseModel):
    id: int
    status: str
    total: float
    payment_method: str
    created_at: datetime
    item_count: int

    class Config:
        from_attributes = True


class CheckoutRequestDTO(BaseModel):
    payment_method: CheckoutPaymentMethod
    billing: Optional[BillingInfoUpsertDTO] = Field(
        None,
        description="Opcional: guardar/actualizar datos de facturación antes de confirmar",
    )
