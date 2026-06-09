from pydantic import BaseModel


class RecommendationProduct(BaseModel):
    """Producto recomendado con score y razón."""

    id: int
    name: str
    price: float
    category: str
    brand: str | None
    size: str
    stock: int
    main_image_url: str | None
    seller_id: int
    seller_username: str | None
    relevance_score: int  # 0-100
    reason: str  # Por qué se recomienda

    class Config:
        from_attributes = True


class UserPreferences(BaseModel):
    """Preferencias y tallas del usuario."""

    shoe_size: str | None
    top_size: str | None
    bottom_size: str | None
    fit_preference: str | None
    body_type: str | None


class PurchaseHistorySummary(BaseModel):
    """Resumen del historial de compras."""

    total_purchases: int
    total_items: int
    favorite_categories: list[str]
    favorite_brands: list[str]
    most_bought_sizes: list[str]


class PersonalRecommendationsResponse(BaseModel):
    """Respuesta con recomendaciones personalizadas."""

    user_id: int
    recommendations: list[RecommendationProduct]
    user_preferences: UserPreferences
    purchase_history_summary: PurchaseHistorySummary
