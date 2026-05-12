
# from  app.core.mail_service import send_email
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.users.deps.auth import get_current_user, get_current_user_optional, require_admin
from app.users.models import User, UserRole as UserRoleModel
from app.users.repositories.user_repository import UserRepository
from app.users.schemas import UserCreateDTO, UserDTO, UserUpdateDTO
from app.users.services.email_verification_service import EmailVerificationService
from app.users.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


def _ensure_self_or_admin(current_user: User, target_user_id: int) -> None:
    if current_user.role == UserRoleModel.ADMIN:
        return
    if current_user.id != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para esta operación",
        )


@router.post("/", response_model=UserDTO, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreateDTO,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Crear un nuevo usuario.

    Requiere JWT de administrador salvo que `ALLOW_PUBLIC_SIGNUP=true` en el entorno.
    """
    settings = get_settings()
    if not settings.allow_public_signup:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Se requiere autenticación",
            )
        if current_user.role != UserRoleModel.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden crear usuarios",
            )
    try:
        dto = UserService.create_user(db, user_data)
        db_user = UserRepository.get_by_id(db, dto.id)
        if db_user:
            EmailVerificationService.create_token_and_enqueue(db, db_user, background_tasks)
        return dto
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear el usuario",
        )


@router.get("/", response_model=list[UserDTO])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        return UserService.get_all_users(db, skip, limit)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los usuarios",
        )


@router.get("/username/{username}", response_model=UserDTO)
def get_user_by_username(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRoleModel.ADMIN and current_user.username != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para ver este usuario",
        )
    try:
        return UserService.get_user_by_username(db, username)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el usuario",
        )


@router.get("/{user_id}", response_model=UserDTO)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_self_or_admin(current_user, user_id)
    try:
        return UserService.get_user(db, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el usuario",
        )


@router.put("/{user_id}", response_model=UserDTO)
def update_user(
    user_id: int,
    user_data: UserUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_self_or_admin(current_user, user_id)
    try:
        return UserService.update_user(db, user_id, user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar el usuario",
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_self_or_admin(current_user, user_id)
    try:
        UserService.delete_user(db, user_id)
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el usuario",
        )
        
@router.patch("/{user_id}/status", response_model=UserDTO)
def update_user_status(
    user_id: int,
    background_tasks: BackgroundTasks,  # Agregado para enviar email en caso de suspensión
    action: str = Body(..., embed=True), # "block" o "suspend"
    reason: str = Body(None, embed=True),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin), # Solo admins
):
    db_user = UserRepository.get_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if action == "block":
        db_user.is_active = False
        db_user.status_message = reason or "Cuenta bloqueada por seguridad."
        
    elif action == "suspend":
        db_user.is_active = False
        db_user.status_message = "Tu cuenta ha sido suspendida temporalmente."
        
        subject = "Notificación de suspensión de cuenta"
        body = (
            f"Hola {db_user.username},\n\n"
            f"Te informamos que tu cuenta ha sido suspendida temporalmente.\n"
            f"Razón: {reason if reason else 'Incumplimiento de las normas de la comunidad.'}\n\n"
            "Si crees que esto es un error, por favor contacta al soporte técnico."
        )

        # TODO: Enviar email de suspensión (requiere configurar SMTP y MAIL_SUPPRESS=false)
        # background_tasks.add_task(send_email, db_user.email, subject, body)
    
    else:
        raise HTTPException(status_code=400, detail="Acción no válida (usar 'block' o 'suspend')")

    db.commit()
    db.refresh(db_user)
    return db_user
