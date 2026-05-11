from functools import wraps
from fastapi import HTTPException, status
from app.models import UserRole


def require_role(*allowed_roles):
    """
    Decorador para verificar si un usuario tiene uno de los roles permitidos.
    
    Uso:
    @require_role(UserRole.ADMIN)
    def admin_only_endpoint(user: User, ...):
        ...
    
    @require_role(UserRole.ADMIN, UserRole.MODERATOR)
    def admin_or_moderator_endpoint(user: User, ...):
        ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # El usuario se pasa como parámetro en los endpoints
            user = kwargs.get('user')
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario no autenticado"
                )
            
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Acceso denegado. Se requiere uno de estos roles: {', '.join([r.value for r in allowed_roles])}"
                )
            
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            user = kwargs.get('user')
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario no autenticado"
                )
            
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Acceso denegado. Se requiere uno de estos roles: {', '.join([r.value for r in allowed_roles])}"
                )
            
            return func(*args, **kwargs)
        
        # Retornar la versión apropiada
        if hasattr(func, '__call__'):
            return sync_wrapper
        return async_wrapper
    
    return decorator
