from sqlalchemy.orm import Session

from app.notifications.models import Notification
from app.notifications.repositories.notification_repository import NotificationRepository
from app.tickets.models import Ticket, TicketStatus
from app.tickets.repositories.ticket_repository import TicketRepository
from app.tickets.schemas import TicketDTO


class TicketService:
    @staticmethod
    def create_ticket(db: Session, *, user_id: int, subject: str, description: str) -> Ticket:
        """Valida y crea un nuevo ticket de soporte."""
        subject = subject.strip()
        description = description.strip()

        if len(subject) < 5:
            raise ValueError("El motivo del reclamo debe tener al menos 5 caracteres.")
        if len(subject) > 200:
            raise ValueError("El motivo del reclamo no puede superar los 200 caracteres.")
        if len(description) < 10:
            raise ValueError("La descripción debe tener al menos 10 caracteres.")
        if len(description) > 5000:
            raise ValueError("La descripción no puede superar los 5000 caracteres.")

        ticket = Ticket(
            user_id=user_id,
            subject=subject,
            description=description,
            status=TicketStatus.OPEN,
        )
        return TicketRepository.create(db, ticket)

    @staticmethod
    def get_ticket(db: Session, ticket_id: int) -> Ticket:
        """Retorna un ticket por ID o lanza LookupError."""
        ticket = TicketRepository.get_by_id(db, ticket_id)
        if ticket is None:
            raise LookupError(f"Ticket #{ticket_id} no encontrado.")
        return ticket

    @staticmethod
    def list_user_tickets(db: Session, user_id: int) -> list[Ticket]:
        """Lista los tickets del usuario autenticado."""
        return TicketRepository.list_for_user(db, user_id)

    @staticmethod
    def list_all_tickets(db: Session) -> list[TicketDTO]:
        """Lista todos los tickets (para agentes/admin) con join de username."""
        rows = TicketRepository.list_all(db)
        result = []
        for ticket, username in rows:
            dto = TicketDTO(
                id=ticket.id,
                user_id=ticket.user_id,
                username=username,
                subject=ticket.subject,
                description=ticket.description,
                status=ticket.status,
                created_at=ticket.created_at,
            )
            result.append(dto)
        return result

    @staticmethod
    def update_ticket_status(db: Session, ticket_id: int, status: TicketStatus) -> Ticket:
        """Cambia el estado de un ticket. Solo para agentes/admin."""
        ticket = TicketRepository.get_by_id(db, ticket_id)
        if ticket is None:
            raise LookupError(f"Ticket #{ticket_id} no encontrado.")
            
        old_status = ticket.status
        updated_ticket = TicketRepository.update_status(db, ticket, status)
        
        if old_status != status:
            status_es = {
                TicketStatus.OPEN: "Abierto",
                TicketStatus.IN_PROGRESS: "En progreso",
                TicketStatus.CLOSED: "Cerrado"
            }
            new_status_es = status_es.get(status, status.value)
            
            NotificationRepository.create(
                db,
                Notification(
                    user_id=ticket.user_id,
                    title="Actualización en tu reclamo",
                    message=f"El estado de tu reclamo '{ticket.subject}' cambió a '{new_status_es}'.",
                    is_read=False,
                )
            )
            
        return updated_ticket
