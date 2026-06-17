from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.tickets.schemas import TicketCreateDTO, TicketDTO, TicketStatusUpdateDTO
from app.tickets.services.ticket_service import TicketService
from app.users.deps.auth import get_current_user, require_admin
from app.users.models import User

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.post("", response_model=TicketDTO, status_code=status.HTTP_201_CREATED)
def create_ticket(
    body: TicketCreateDTO,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea un nuevo ticket de soporte para el usuario autenticado."""
    try:
        ticket = TicketService.create_ticket(
            db,
            user_id=current_user.id,
            subject=body.subject,
            description=body.description,
        )
        return TicketDTO(
            id=ticket.id,
            user_id=ticket.user_id,
            username=current_user.username,
            subject=ticket.subject,
            description=ticket.description,
            status=ticket.status,
            created_at=ticket.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("/me", response_model=list[TicketDTO])
def list_my_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista los tickets propios del usuario autenticado."""
    tickets = TicketService.list_user_tickets(db, current_user.id)
    return [
        TicketDTO(
            id=t.id,
            user_id=t.user_id,
            username=current_user.username,
            subject=t.subject,
            description=t.description,
            status=t.status,
            created_at=t.created_at,
        )
        for t in tickets
    ]


@router.get("", response_model=list[TicketDTO])
def list_all_tickets(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lista TODOS los tickets con motivo, descripción, usuario y estado. Solo para admins."""
    return TicketService.list_all_tickets(db)


@router.patch("/{ticket_id}/status", response_model=TicketDTO)
def update_ticket_status(
    ticket_id: int,
    body: TicketStatusUpdateDTO,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Actualiza el estado de un ticket. Solo para admins."""
    try:
        ticket = TicketService.update_ticket_status(db, ticket_id, body.status)
        # Para el DTO necesitamos el username: lo obtenemos del ticket mediante join
        all_tickets = TicketService.list_all_tickets(db)
        updated_dto = next((t for t in all_tickets if t.id == ticket.id), None)
        if updated_dto:
            return updated_dto
        # Fallback si por alguna razón no está en el listado
        return TicketDTO(
            id=ticket.id,
            user_id=ticket.user_id,
            username="",
            subject=ticket.subject,
            description=ticket.description,
            status=ticket.status,
            created_at=ticket.created_at,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
