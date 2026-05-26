from sqlalchemy.orm import Session

from app.notifications.models import Notification


class NotificationRepository:
    @staticmethod
    def create(db: Session, notification: Notification) -> Notification:
        db.add(notification)
        db.flush()
        return notification

    @staticmethod
    def list_for_user(db: Session, user_id: int, limit: int = 50) -> list[Notification]:
        return (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_by_id_for_user(db: Session, notification_id: int, user_id: int) -> Notification | None:
        return (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )

    @staticmethod
    def mark_read(db: Session, notification: Notification) -> Notification:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
        return notification
