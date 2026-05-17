from sqlalchemy.orm import Session

from app.products.models import Product
from app.products.schemas import ProductCreateDTO


class ProductRepository:
    """Repository para operaciones con la tabla de productos."""

    @staticmethod
    def create(db: Session, product_data: ProductCreateDTO, seller_id: int) -> Product:
        """Crear un nuevo producto."""
        db_product = Product(
            name=product_data.name,
            description=product_data.description,
            price=product_data.price,
            stock=product_data.stock,
            category=product_data.category,
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
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        """Obtener todos los productos con paginación."""
        return db.query(Product).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_seller(db: Session, seller_id: int, skip: int = 0, limit: int = 100):
        """Obtener productos de un vendedor específico."""
        return db.query(Product).filter(Product.seller_id == seller_id).offset(skip).limit(limit).all()
