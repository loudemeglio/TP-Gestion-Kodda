from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.notifications.schemas import NotificationDTO
from app.notifications.services.notification_service import NotificationService
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationDTO])
def list_notifications(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = NotificationService.list_for_user(db, current_user.id, limit)
    return [NotificationDTO.model_validate(n) for n in rows]


@router.put("/{notification_id}/read", response_model=NotificationDTO)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        row = NotificationService.mark_read(db, notification_id, current_user.id)
        return NotificationDTO.model_validate(row)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
