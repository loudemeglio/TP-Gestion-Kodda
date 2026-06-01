from sqlalchemy.orm import Session, joinedload

from app.products.filters import ProductCatalogFilters, apply_catalog_filters
from app.products.models import Product
from app.products.schemas import ProductCreateDTO


class ProductRepository:
    """Repository para operaciones con la tabla de productos."""

    @staticmethod
    def create(
        db: Session,
        product_data: ProductCreateDTO,
        seller_id: int,
        *,
        brand_name: str,
        category_name: str,
    ) -> Product:
        """Crear un nuevo producto."""
        db_product = Product(
            name=product_data.name,
            description=product_data.description,
            price=product_data.price,
            stock=product_data.stock,
            brand=brand_name,
            brand_id=product_data.brand_id,
            category=category_name,
            category_id=product_data.category_id,
            size=product_data.size,
            main_image_url=product_data.main_image_url,
            seller_id=seller_id,
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Product:
        """Obtener producto por ID."""
        return db.query(Product).filter(Product.id == product_id).first()

    @staticmethod
    def get_active_by_id_except_user(db: Session, product_id: int, user_id: int) -> Product | None:
        """Obtener un producto activo por ID excluyendo publicaciones del usuario actual."""
        return (
            db.query(Product)
            .options(joinedload(Product.seller))
            .filter(
                Product.id == product_id,
                Product.is_paused == False,
                Product.seller_id != user_id,
            )
            .first()
        )

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        """Obtener todos los productos con paginación."""
        return db.query(Product).offset(skip).limit(limit).all()

    @staticmethod
    def get_all_active(db: Session, skip: int = 0, limit: int = 100):
        """Obtener todos los productos activos (no pausados) con paginación."""
        return (
            db.query(Product)
            .options(joinedload(Product.seller))
            .filter(Product.is_paused == False)
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_all_active_except_user(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        filters: ProductCatalogFilters | None = None,
    ):
        """Obtener productos activos de otros usuarios, con filtros opcionales del catálogo."""
        query = (
            db.query(Product)
            .options(joinedload(Product.seller))
            .filter(
                Product.is_paused == False,
                Product.seller_id != user_id,
            )
        )
        if filters is not None and filters.is_active():
            query = apply_catalog_filters(query, filters)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_by_seller(db: Session, seller_id: int, skip: int = 0, limit: int = 100):
        """Obtener productos de un vendedor específico."""
        return db.query(Product).filter(Product.seller_id == seller_id).offset(skip).limit(limit).all()

    @staticmethod
    def update(
        db: Session,
        product_id: int,
        product_data: ProductCreateDTO,
        seller_id: int,
        *,
        brand_name: str,
        category_name: str,
    ) -> Product:
        """Actualizar un producto. Solo el dueño puede actualizar."""
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.seller_id == seller_id
        ).first()
        
        if not product:
            return None
        
        product.name = product_data.name
        product.description = product_data.description
        product.price = product_data.price
        product.stock = product_data.stock
        product.brand = brand_name
        product.brand_id = product_data.brand_id
        product.category = category_name
        product.category_id = product_data.category_id
        product.size = product_data.size
        if product_data.main_image_url:
            product.main_image_url = product_data.main_image_url
        
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete(db: Session, product_id: int, seller_id: int) -> bool:
        """Eliminar un producto. Solo el dueño puede eliminar."""
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.seller_id == seller_id
        ).first()
        
        if not product:
            return False
        
        db.delete(product)
        db.commit()
        return True

    @staticmethod
    def pause(db: Session, product_id: int, seller_id: int) -> Product:
        """Pausar un producto. Solo el dueño puede pausar."""
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.seller_id == seller_id
        ).first()
        
        if not product:
            return None
        
        product.is_paused = True
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def resume(db: Session, product_id: int, seller_id: int) -> Product:
        """Reanudar un producto. Solo el dueño puede reanudar."""
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.seller_id == seller_id
        ).first()
        
        if not product:
            return None
        
        product.is_paused = False
        db.commit()
        db.refresh(product)
        return product
