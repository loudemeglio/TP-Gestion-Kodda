from sqlalchemy import func
from sqlalchemy.orm import Session

from app.catalog.models import Brand, Category


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().split())


class BrandRepository:
    @staticmethod
    def get_by_id(db: Session, brand_id: int) -> Brand | None:
        return db.query(Brand).filter(Brand.id == brand_id).first()

    @staticmethod
    def get_by_name_insensitive(db: Session, name: str) -> Brand | None:
        normalized = _normalize_name(name).lower()
        return (
            db.query(Brand)
            .filter(func.lower(Brand.name) == normalized)
            .first()
        )

    @staticmethod
    def list_all(db: Session) -> list[Brand]:
        return db.query(Brand).order_by(Brand.name.asc()).all()

    @staticmethod
    def list_active(db: Session) -> list[Brand]:
        return (
            db.query(Brand)
            .filter(Brand.is_active.is_(True))
            .order_by(Brand.name.asc())
            .all()
        )

    @staticmethod
    def create(db: Session, name: str) -> Brand:
        brand = Brand(name=_normalize_name(name), is_active=True)
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def update_name(db: Session, brand: Brand, name: str) -> Brand:
        brand.name = _normalize_name(name)
        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def set_active(db: Session, brand: Brand, is_active: bool) -> Brand:
        brand.is_active = is_active
        db.commit()
        db.refresh(brand)
        return brand


class CategoryRepository:
    @staticmethod
    def get_by_id(db: Session, category_id: int) -> Category | None:
        return db.query(Category).filter(Category.id == category_id).first()

    @staticmethod
    def get_by_name_insensitive(db: Session, name: str) -> Category | None:
        normalized = _normalize_name(name).lower()
        return (
            db.query(Category)
            .filter(func.lower(Category.name) == normalized)
            .first()
        )

    @staticmethod
    def list_all(db: Session) -> list[Category]:
        return db.query(Category).order_by(Category.name.asc()).all()

    @staticmethod
    def list_active(db: Session) -> list[Category]:
        return (
            db.query(Category)
            .filter(Category.is_active.is_(True))
            .order_by(Category.name.asc())
            .all()
        )

    @staticmethod
    def create(db: Session, name: str) -> Category:
        category = Category(name=_normalize_name(name), is_active=True)
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def update_name(db: Session, category: Category, name: str) -> Category:
        category.name = _normalize_name(name)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def set_active(db: Session, category: Category, is_active: bool) -> Category:
        category.is_active = is_active
        db.commit()
        db.refresh(category)
        return category
