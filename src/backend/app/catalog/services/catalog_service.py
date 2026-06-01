from sqlalchemy.orm import Session

from app.catalog.models import Brand, Category
from app.catalog.repositories.catalog_repository import BrandRepository, CategoryRepository
from app.catalog.schemas import CatalogItemCreateDTO, CatalogItemUpdateNameDTO


class CatalogAdminService:
    @staticmethod
    def list_brands(db: Session) -> list[Brand]:
        return BrandRepository.list_all(db)

    @staticmethod
    def list_categories(db: Session) -> list[Category]:
        return CategoryRepository.list_all(db)

    @staticmethod
    def list_active_brands(db: Session) -> list[Brand]:
        return BrandRepository.list_active(db)

    @staticmethod
    def list_active_categories(db: Session) -> list[Category]:
        return CategoryRepository.list_active(db)

    @staticmethod
    def create_brand(db: Session, data: CatalogItemCreateDTO) -> Brand:
        existing = BrandRepository.get_by_name_insensitive(db, data.name)
        if existing:
            raise ValueError("Ya existe una marca con ese nombre.")
        return BrandRepository.create(db, data.name)

    @staticmethod
    def create_category(db: Session, data: CatalogItemCreateDTO) -> Category:
        existing = CategoryRepository.get_by_name_insensitive(db, data.name)
        if existing:
            raise ValueError("Ya existe una categoría con ese nombre.")
        return CategoryRepository.create(db, data.name)

    @staticmethod
    def update_brand_name(db: Session, brand_id: int, data: CatalogItemUpdateNameDTO) -> Brand:
        brand = BrandRepository.get_by_id(db, brand_id)
        if not brand:
            raise ValueError("Marca no encontrada.")
        existing = BrandRepository.get_by_name_insensitive(db, data.name)
        if existing and existing.id != brand.id:
            raise ValueError("Ya existe una marca con ese nombre.")
        return BrandRepository.update_name(db, brand, data.name)

    @staticmethod
    def update_category_name(db: Session, category_id: int, data: CatalogItemUpdateNameDTO) -> Category:
        category = CategoryRepository.get_by_id(db, category_id)
        if not category:
            raise ValueError("Categoría no encontrada.")
        existing = CategoryRepository.get_by_name_insensitive(db, data.name)
        if existing and existing.id != category.id:
            raise ValueError("Ya existe una categoría con ese nombre.")
        return CategoryRepository.update_name(db, category, data.name)

    @staticmethod
    def set_brand_active(db: Session, brand_id: int, is_active: bool) -> Brand:
        brand = BrandRepository.get_by_id(db, brand_id)
        if not brand:
            raise ValueError("Marca no encontrada.")
        return BrandRepository.set_active(db, brand, is_active)

    @staticmethod
    def set_category_active(db: Session, category_id: int, is_active: bool) -> Category:
        category = CategoryRepository.get_by_id(db, category_id)
        if not category:
            raise ValueError("Categoría no encontrada.")
        return CategoryRepository.set_active(db, category, is_active)

    @staticmethod
    def resolve_active_brand(db: Session, brand_id: int) -> Brand:
        brand = BrandRepository.get_by_id(db, brand_id)
        if not brand or not brand.is_active:
            raise ValueError("Marca inválida o no disponible.")
        return brand

    @staticmethod
    def resolve_active_category(db: Session, category_id: int) -> Category:
        category = CategoryRepository.get_by_id(db, category_id)
        if not category or not category.is_active:
            raise ValueError("Categoría inválida o no disponible.")
        return category
