from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.catalog.schemas import CatalogItemDTO
from app.catalog.services.catalog_service import CatalogAdminService
from app.core.database import get_db
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/catalog", tags=["catalog-master"])


@router.get("/brands/active", response_model=list[CatalogItemDTO])
def list_active_brands(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CatalogAdminService.list_active_brands(db)


@router.get("/categories/active", response_model=list[CatalogItemDTO])
def list_active_categories(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CatalogAdminService.list_active_categories(db)
