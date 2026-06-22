from sqlalchemy.orm import Session

from app.catalog.services.catalog_service import CatalogAdminService
from app.products.filters import ProductCatalogFilters
from app.products.models import Product
from app.products.repositories.product_repository import ProductRepository
from app.products.schemas import ProductCreateDTO, ProductDTO
from app.users.repositories.user_repository import UserRepository


class ProductService:
    """Service para la lógica de negocio de productos."""

    @staticmethod
    def _to_dto(product: Product) -> ProductDTO:
        """Construye ProductDTO incluyendo seller_username desde la relación ORM."""
        dto = ProductDTO.model_validate(product)
        seller_username = product.seller.username if product.seller else None
        return dto.model_copy(update={"seller_username": seller_username})

    @staticmethod
    def _validate_catalog_refs(db: Session, product_data: ProductCreateDTO) -> tuple[str, str]:
        brand = CatalogAdminService.resolve_active_brand(db, product_data.brand_id)
        category = CatalogAdminService.resolve_active_category(db, product_data.category_id)
        return brand.name, category.name

    @staticmethod
    def create_product(db: Session, product_data: ProductCreateDTO, seller_id: int) -> ProductDTO:
        """Crear un nuevo producto con validaciones de negocio."""
        if product_data.price <= 0:
            raise ValueError("El precio debe ser mayor a 0")

        if product_data.stock < 0:
            raise ValueError("El stock no puede ser negativo")

        brand_name, category_name = ProductService._validate_catalog_refs(db, product_data)
        db_product = ProductRepository.create(
            db, product_data, seller_id, brand_name=brand_name, category_name=category_name
        )
        return ProductService._to_dto(db_product)

    @staticmethod
    def get_user_products(db: Session, seller_id: int, skip: int = 0, limit: int = 100) -> list[ProductDTO]:
        """Obtener todos los productos del usuario actual."""
        products = ProductRepository.get_by_seller(db, seller_id, skip, limit)
        return [ProductService._to_dto(product) for product in products]

    @staticmethod
    def get_all_active_products(db: Session, skip: int = 0, limit: int = 100) -> list[ProductDTO]:
        """Obtener todos los productos activos (no pausados) del catálogo."""
        products = ProductRepository.get_all_active(db, skip, limit)
        return [ProductService._to_dto(product) for product in products]

    @staticmethod
    def get_all_active_products_except_user(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        filters: ProductCatalogFilters | None = None,
    ) -> list[ProductDTO]:
        """Obtener productos activos de otros usuarios, con filtros opcionales."""
        products = ProductRepository.get_all_active_except_user(
            db, user_id, skip, limit, filters=filters
        )
        return [ProductService._to_dto(product) for product in products]

    @staticmethod
    def get_active_products_by_seller(
        db: Session,
        seller_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ProductDTO]:
        """Productos activos de un vendedor para su perfil público."""
        seller = UserRepository.get_by_id(db, seller_id)
        if not seller:
            raise ValueError("Vendedor no encontrado")

        products = ProductRepository.get_active_by_seller(db, seller_id, skip, limit)
        return [ProductService._to_dto(product) for product in products]

    @staticmethod
    def get_active_product_detail_for_catalog(
        db: Session,
        product_id: int,
        current_user_id: int,
    ) -> ProductDTO:
        """Detalle de producto activo del catálogo para un comprador autenticado."""
        product = ProductRepository.get_active_by_id_except_user(db, product_id, current_user_id)
        if not product:
            raise ValueError("Producto no encontrado o no disponible en el catálogo")
        return ProductService._to_dto(product)

    @staticmethod
    def update_product(db: Session, product_id: int, product_data: ProductCreateDTO, seller_id: int) -> ProductDTO:
        """Actualizar un producto. Solo el dueño puede actualizar."""
        if product_data.price <= 0:
            raise ValueError("El precio debe ser mayor a 0")

        if product_data.stock < 0:
            raise ValueError("El stock no puede ser negativo")

        brand_name, category_name = ProductService._validate_catalog_refs(db, product_data)
        db_product = ProductRepository.update(
            db,
            product_id,
            product_data,
            seller_id,
            brand_name=brand_name,
            category_name=category_name,
        )
        if not db_product:
            raise ValueError("Producto no encontrado o no tienes permisos para editarlo")

        return ProductService._to_dto(db_product)

    @staticmethod
    def delete_product(db: Session, product_id: int, seller_id: int) -> bool:
        """Eliminar un producto. Solo el dueño puede eliminar."""
        success = ProductRepository.delete(db, product_id, seller_id)
        if not success:
            raise ValueError("Producto no encontrado o no tienes permisos para eliminarlo")
        return success

    @staticmethod
    def pause_product(db: Session, product_id: int, seller_id: int) -> ProductDTO:
        """Pausar un producto. Solo el dueño puede pausar."""
        db_product = ProductRepository.pause(db, product_id, seller_id)
        if not db_product:
            raise ValueError("Producto no encontrado o no tienes permisos para pausarlo")
        return ProductService._to_dto(db_product)

    @staticmethod
    def resume_product(db: Session, product_id: int, seller_id: int) -> ProductDTO:
        """Reanudar un producto. Solo el dueño puede reanudar, excepto si fue pausado por moderación."""
        product = ProductRepository.get_by_id(db, product_id)
        if not product or product.seller_id != seller_id:
            raise ValueError("Producto no encontrado o no tienes permisos para reanudarlo")
        if product.pause_reason:
            raise PermissionError(
                "Esta publicación fue pausada por un moderador. "
                "Para solicitar su reactivación debés crear un ticket de soporte."
            )
        db_product = ProductRepository.resume(db, product_id, seller_id)
        return ProductService._to_dto(db_product)
