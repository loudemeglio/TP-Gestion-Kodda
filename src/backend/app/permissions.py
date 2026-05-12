from functools import wraps
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.deps.auth import get_current_user
from app.models import User, UserRole


def require_role(*allowed_roles: UserRole):
    """
    Decorador para endpoints síncronos que reciben `current_user: User = Depends(get_current_user)`.

    Ejemplo::

        @router.get("/admin/stats")
        @require_role(UserRole.ADMIN)
        def stats(current_user: User = Depends(get_current_user)):
            ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, current_user: User | None = None, **kwargs):
            user = kwargs.get("current_user", current_user)
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario no autenticado",
                )
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Acceso denegado. Se requiere uno de estos roles: {', '.join(r.value for r in allowed_roles)}",
                )
            return func(*args, **kwargs)

        return wrapper

    return decorator


def require_roles_dependency(*allowed_roles: UserRole):
    """Equivalente idiomático a `Depends` para usar en la firma del endpoint."""

    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de estos roles: {', '.join(r.value for r in allowed_roles)}",
            )
        return current_user

    return _check
