from datetime import datetime

from pydantic import BaseModel


class NotificationDTO(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    order_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True
