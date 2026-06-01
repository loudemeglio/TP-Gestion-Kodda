from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.catalog.schemas import (
    CatalogItemActiveDTO,
    CatalogItemCreateDTO,
    CatalogItemDTO,
    CatalogItemUpdateNameDTO,
)
from app.catalog.services.catalog_service import CatalogAdminService
from app.core.database import get_db
from app.users.deps.auth import require_admin
from app.users.models import User

router = APIRouter(prefix="/api/admin/catalog", tags=["admin-catalog"])


@router.get("/brands", response_model=list[CatalogItemDTO])
def list_brands(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return CatalogAdminService.list_brands(db)


@router.get("/categories", response_model=list[CatalogItemDTO])
def list_categories(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return CatalogAdminService.list_categories(db)


@router.post("/brands", response_model=CatalogItemDTO, status_code=status.HTTP_201_CREATED)
def create_brand(
    data: CatalogItemCreateDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return CatalogAdminService.create_brand(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/categories", response_model=CatalogItemDTO, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CatalogItemCreateDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return CatalogAdminService.create_category(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/brands/{brand_id}", response_model=CatalogItemDTO)
def update_brand_name(
    brand_id: int,
    data: CatalogItemUpdateNameDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return CatalogAdminService.update_brand_name(db, brand_id, data)
    except ValueError as e:
        status_code = status.HTTP_404_NOT_FOUND if "no encontrada" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))


@router.patch("/categories/{category_id}", response_model=CatalogItemDTO)
def update_category_name(
    category_id: int,
    data: CatalogItemUpdateNameDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return CatalogAdminService.update_category_name(db, category_id, data)
    except ValueError as e:
        status_code = status.HTTP_404_NOT_FOUND if "no encontrada" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))


@router.patch("/brands/{brand_id}/active", response_model=CatalogItemDTO)
def set_brand_active(
    brand_id: int,
    data: CatalogItemActiveDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return CatalogAdminService.set_brand_active(db, brand_id, data.is_active)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/categories/{category_id}/active", response_model=CatalogItemDTO)
def set_category_active(
    category_id: int,
    data: CatalogItemActiveDTO,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return CatalogAdminService.set_category_active(db, category_id, data.is_active)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
