from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.tokens import decode_access_token
from app.users.models import User, UserRole
from app.users.repositories.user_repository import UserRepository

security = HTTPBearer(auto_error=False)


def _user_from_payload(db: Session, payload: dict) -> User:
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = UserRepository.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    if not user.is_active:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail=user.status_message or "Tu cuenta se encuentra desactivada.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _user_from_payload(db, payload)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _user_from_payload(db, payload)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user
