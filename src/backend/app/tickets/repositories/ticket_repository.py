from sqlalchemy.orm import Session

from app.tickets.models import Ticket, TicketStatus
from app.users.models import User


class TicketRepository:
    @staticmethod
    def create(db: Session, ticket: Ticket) -> Ticket:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket

    @staticmethod
    def get_by_id(db: Session, ticket_id: int) -> Ticket | None:
        return db.query(Ticket).filter(Ticket.id == ticket_id).first()

    @staticmethod
    def list_for_user(db: Session, user_id: int) -> list[Ticket]:
        return (
            db.query(Ticket)
            .filter(Ticket.user_id == user_id)
            .order_by(Ticket.created_at.desc())
            .all()
        )

    @staticmethod
    def list_all(db: Session) -> list[tuple[Ticket, str]]:
        """Lista todos los tickets con un JOIN a User para traer el username."""
        rows = (
            db.query(Ticket, User.username)
            .join(User, User.id == Ticket.user_id)
            .order_by(Ticket.created_at.desc())
            .all()
        )
        return rows

    @staticmethod
    def update_status(db: Session, ticket: Ticket, status: TicketStatus) -> Ticket:
        ticket.status = status
        db.commit()
        db.refresh(ticket)
        return ticket
