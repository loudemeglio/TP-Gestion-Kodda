from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User
from app.products.filters import ProductCatalogFilters, get_product_catalog_filters
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


@router.get("/products", response_model=list[ProductDTO])
def get_all_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    filters: ProductCatalogFilters = Depends(get_product_catalog_filters),
):
    """
    Catálogo público: productos activos de otros usuarios.

    Filtros opcionales (query): name, description, price_min, price_max, category, brand, size.
    """
    try:
        return ProductService.get_all_active_products_except_user(
            db, current_user.id, skip, limit, filters=filters
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener productos",
        )


@router.get("/products/my", response_model=list[ProductDTO])
def get_my_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Obtener todos los productos publicados por el usuario actual.

    Debe declararse antes de /products/{product_id} para que "my" no se interprete como id.
    """
    try:
        return ProductService.get_user_products(db, current_user.id, skip, limit)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener tus productos",
        )


@router.get("/sellers/{seller_id}/products", response_model=list[ProductDTO])
def get_seller_catalog_products(
    seller_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Publicaciones activas de un vendedor (perfil público).
    """
    try:
        return ProductService.get_active_products_by_seller(db, seller_id, skip, limit)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las publicaciones del vendedor",
        )


@router.get("/products/{product_id}", response_model=ProductDTO)
def get_product_detail(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Detalle de producto activo del catálogo.

    Solo expone publicaciones activas de otros usuarios.
    """
    try:
        return ProductService.get_active_product_detail_for_catalog(db, product_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el detalle del producto",
        )


@router.put("/products/{product_id}", response_model=ProductDTO)
def update_product(
    product_id: int,
    product_data: ProductCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Actualizar un producto existente.
    
    Requiere usuario autenticado. Solo el dueño del producto puede editarlo.
    """
    try:
        return ProductService.update_product(db, product_id, product_data, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "no encontrado" in str(e).lower() else status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar el producto",
        )


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Eliminar un producto existente.
    
    Requiere usuario autenticado. Solo el dueño del producto puede eliminarlo.
    """
    try:
        ProductService.delete_product(db, product_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el producto",
        )


@router.patch("/products/{product_id}/pause", response_model=ProductDTO)
def pause_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pausar un producto existente.
    
    Requiere usuario autenticado. Solo el dueño del producto puede pausarlo.
    """
    try:
        return ProductService.pause_product(db, product_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al pausar el producto",
        )


@router.patch("/products/{product_id}/resume", response_model=ProductDTO)
def resume_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reanudar un producto existente.

    Requiere usuario autenticado. Solo el dueño del producto puede reanudarlo,
    a menos que haya sido pausado por moderación (requiere ticket de soporte).
    """
    try:
        return ProductService.resume_product(db, product_id, current_user.id)
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al reanudar el producto",
        )
