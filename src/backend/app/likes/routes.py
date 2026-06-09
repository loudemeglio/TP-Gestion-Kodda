from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User
from app.likes.services import LikeService
from app.likes.schemas import LikeProductResponse, MyLikesResponse

router = APIRouter(prefix="/api/likes", tags=["likes"])


@router.post("/toggle/{product_id}", response_model=LikeProductResponse)
def toggle_like(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Agrega o quita un like a un producto.
    
    - Si el usuario ya tiene like, se quita (liked=False)
    - Si el usuario no tiene like, se agrega (liked=True)
    """
    try:
        liked = LikeService.toggle_like(db, current_user.id, product_id)
        return LikeProductResponse(product_id=product_id, liked=liked)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar like",
        )


@router.get("/product/{product_id}/is-liked", response_model=dict)
def check_is_liked(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verifica si el usuario actual tiene like en este producto."""
    try:
        is_liked = LikeService.is_liked(db, current_user.id, product_id)
        return {"product_id": product_id, "is_liked": is_liked}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al verificar like",
        )


@router.get("/my-likes", response_model=MyLikesResponse)
def get_my_likes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Obtiene todos los productos que el usuario actual tiene like.
    """
    try:
        total, products = LikeService.get_user_likes(db, current_user.id, skip, limit)
        return MyLikesResponse(total_likes=total, products=products)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener likes",
        )
