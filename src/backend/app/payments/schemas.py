from datetime import datetime

from pydantic import BaseModel


class PaymentIntentCreateResponse(BaseModel):
    token: str
    amount: float
    status: str
    payment_url: str
    expires_at: datetime

    class Config:
        from_attributes = True


class PaymentIntentStatusDTO(BaseModel):
    token: str
    amount: float
    status: str
    expires_at: datetime

    class Config:
        from_attributes = True


class PaymentIntentApproveResponse(BaseModel):
    token: str
    status: str
    amount: float

    class Config:
        from_attributes = True
