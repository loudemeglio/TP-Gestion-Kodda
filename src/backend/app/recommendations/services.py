from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.products.models import Product
from app.orders.models import Order, OrderItem
from app.users.models import User
from app.recommendations.schemas import (
    RecommendationProduct,
    PersonalRecommendationsResponse,
    UserPreferences,
    PurchaseHistorySummary,
)


class RecommendationService:
    """Servicio para recomendaciones personalizadas."""

    @staticmethod
    def _get_purchase_history(db: Session, user_id: int) -> tuple[list[int], dict]:
        """
        Obtiene historial de compras del usuario.
        Retorna: (product_ids, stats_dict)
        """
        orders = db.query(Order).filter(Order.user_id == user_id).all()
        product_ids = []
        categories = []
        brands = []
        sizes = []
        total_items = 0

        for order in orders:
            for item in order.items:
                if item.product_id:
                    product_ids.append(item.product_id)
                total_items += item.quantity
                
                # Si el producto aún existe, obtenemos su info
                if item.product_id:
                    product = (
                        db.query(Product)
                        .filter(Product.id == item.product_id)
                        .first()
                    )
                    if product:
                        categories.append(product.category)
                        if product.brand:
                            brands.append(product.brand)
                        sizes.append(product.size)

        stats = {
            "product_ids": product_ids,
            "categories": Counter(categories),
            "brands": Counter(brands),
            "sizes": Counter(sizes),
            "total_items": total_items,
        }
        return product_ids, stats

    @staticmethod
    def _calculate_relevance_score(
        product: Product,
        user_categories: Counter,
        user_brands: Counter,
        user_sizes: Counter,
        user_top_size: str | None = None,
        user_bottom_size: str | None = None,
        user_shoe_size: str | None = None,
    ) -> tuple[int, str]:
        """
        Calcula score de relevancia (0-100) y razón.
        """
        score = 0
        reasons = []

        # 1. Categorías similares (85 pts max)
        if product.category in user_categories:
            score += 85
            reasons.append(
                f"Similar a '{product.category}' que compraste"
            )

        # 2. Marcas favoritas (80 pts)
        if product.brand and product.brand in user_brands:
            score += 80 if not reasons else 20
            reasons.append(f"De la marca {product.brand} que te gusta")

        # 3. Talles usuales
        if user_top_size and product.size == user_top_size:
            score += 75 if not reasons else 20
            reasons.append(f"En tu talle {product.size}")
        elif user_bottom_size and product.size == user_bottom_size:
            score += 75 if not reasons else 20
            reasons.append(f"En tu talle {product.size}")
        elif user_shoe_size and product.size == user_shoe_size:
            score += 75 if not reasons else 20
            reasons.append(f"En tu talle {product.size}")

        # 4. Fallback: disponible en catálogo
        if not reasons:
            score = 60
            reasons.append("Disponible en el catálogo")

        # Normalizar score a 0-100
        score = min(score, 100)
        reason = " • ".join(reasons) if reasons else "Recomendado para ti"

        return score, reason

    @staticmethod
    def get_personal_recommendations(
        db: Session,
        user_id: int,
        limit: int = 12,
    ) -> PersonalRecommendationsResponse:
        """
        Obtiene recomendaciones personalizadas para un usuario basadas en:
        - Historial de compras
        - Datos personales (talle, preferencias)
        - Categorías y marcas favoritas
        """
        # Obtener usuario
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("Usuario no encontrado")

        # Obtener historial de compras
        purchased_ids, purchase_stats = RecommendationService._get_purchase_history(
            db, user_id
        )

        # Obtener productos activos que no ha comprado
        query = db.query(Product).filter(
            Product.is_paused == False,
            Product.stock > 0,
            Product.seller_id != user_id,
        )
        
        # Excluir productos ya comprados
        if purchased_ids:
            query = query.filter(~Product.id.in_(purchased_ids))
        
        available_products = query.all()

        # Calcular relevancia y ordenar
        recommendations_with_scores = []
        for product in available_products:
            score, reason = RecommendationService._calculate_relevance_score(
                product,
                purchase_stats["categories"],
                purchase_stats["brands"],
                purchase_stats["sizes"],
                user_top_size=user.top_size,
                user_bottom_size=user.bottom_size,
                user_shoe_size=user.shoe_size,
            )
            recommendations_with_scores.append(
                (product, score, reason)
            )

        # Ordenar por score descendente
        recommendations_with_scores.sort(key=lambda x: x[1], reverse=True)

        # Convertir a DTOs y limitar
        recommendations = []
        for product, score, reason in recommendations_with_scores[:limit]:
            seller_username = product.seller.username if product.seller else None
            rec = RecommendationProduct(
                id=product.id,
                name=product.name,
                price=product.price,
                category=product.category,
                brand=product.brand,
                size=product.size,
                stock=product.stock,
                main_image_url=product.main_image_url,
                seller_id=product.seller_id,
                seller_username=seller_username,
                relevance_score=score,
                reason=reason,
            )
            recommendations.append(rec)

        # Resumen de preferencias
        user_prefs = UserPreferences(
            shoe_size=user.shoe_size,
            top_size=user.top_size,
            bottom_size=user.bottom_size,
            fit_preference=user.fit_preference,
            body_type=user.body_type,
        )

        # Resumen de historial
        favorite_categories = [
            cat for cat, _ in purchase_stats["categories"].most_common(5)
        ]
        favorite_brands = [
            brand for brand, _ in purchase_stats["brands"].most_common(5)
        ]
        most_bought_sizes = [
            size for size, _ in purchase_stats["sizes"].most_common(5)
        ]

        purchase_summary = PurchaseHistorySummary(
            total_purchases=len(set(purchased_ids)),
            total_items=purchase_stats["total_items"],
            favorite_categories=favorite_categories,
            favorite_brands=favorite_brands,
            most_bought_sizes=most_bought_sizes,
        )

        return PersonalRecommendationsResponse(
            user_id=user_id,
            recommendations=recommendations,
            user_preferences=user_prefs,
            purchase_history_summary=purchase_summary,
        )
