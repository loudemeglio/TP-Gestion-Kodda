from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import UserCreateDTO, UserUpdateDTO, UserDTO, UserRole
from app.services.user_service import UserService
from app.models import User

# Nota: Para endpoints protegidos por rol, descomentar require_role
# from app.permissions import require_role

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/", response_model=UserDTO, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreateDTO, db: Session = Depends(get_db)):
    """
    Crear un nuevo usuario
    
    - **username**: nombre de usuario único (3-50 caracteres)
    - **email**: correo electrónico único
    - **password**: contraseña (mínimo 6 caracteres)
    - **weight**: peso en kg (opcional)
    - **height**: altura en cm (opcional)
    - **address**: dirección (opcional)
    """
    try:
        return UserService.create_user(db, user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear el usuario"
        )


@router.get("/{user_id}", response_model=UserDTO)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Obtener un usuario por su ID
    """
    try:
        return UserService.get_user(db, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el usuario"
        )


@router.get("/username/{username}", response_model=UserDTO)
def get_user_by_username(username: str, db: Session = Depends(get_db)):
    """
    Obtener un usuario por su nombre de usuario
    """
    try:
        return UserService.get_user_by_username(db, username)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el usuario"
        )


@router.get("/", response_model=list[UserDTO])
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtener todos los usuarios con paginación
    
    - **skip**: cantidad de usuarios a saltar (default: 0)
    - **limit**: cantidad máxima de usuarios a devolver (default: 100)
    """
    try:
        return UserService.get_all_users(db, skip, limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los usuarios"
        )


@router.put("/{user_id}", response_model=UserDTO)
def update_user(user_id: int, user_data: UserUpdateDTO, db: Session = Depends(get_db)):
    """
    Actualizar un usuario
    
    Todos los campos son opcionales. Solo se actualizarán los campos proporcionados.
    """
    try:
        return UserService.update_user(db, user_id, user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar el usuario"
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Eliminar un usuario
    """
    try:
        UserService.delete_user(db, user_id)
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el usuario"
        )


# ============================================
# ENDPOINTS PROTEGIDOS (solo para ADMIN)
# ============================================
# Descomentar cuando se implemente autenticación

# @require_role(UserRole.ADMIN)
# @router.post("/admin/promote/{user_id}")
# def promote_user_to_admin(user_id: int, current_user: User = Depends(...), db: Session = Depends(get_db)):
#     """Solo ADMIN puede promover usuarios a ADMIN"""
#     pass

# @require_role(UserRole.ADMIN)
# @router.post("/admin/demote/{user_id}")
# def demote_user_from_admin(user_id: int, current_user: User = Depends(...), db: Session = Depends(get_db)):
#     """Solo ADMIN puede degradar usuarios"""
#     pass

# @require_role(UserRole.ADMIN)
# @router.get("/admin/stats")
# def get_admin_stats(current_user: User = Depends(...), db: Session = Depends(get_db)):
#     """Solo ADMIN puede ver estadísticas"""
#     pass
