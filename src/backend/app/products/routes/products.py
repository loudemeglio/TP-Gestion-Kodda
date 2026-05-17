from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User
from app.products.schemas import ProductCreateDTO, ProductDTO
from app.products.services.product_service import ProductService

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.post("/products", response_model=ProductDTO, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Publicar un nuevo producto en el catálogo.

    Requiere usuario autenticado (JWT). El seller_id se toma del token.
    """
    try:
        return ProductService.create_product(db, product_data, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear el producto",
        )
