from datetime import datetime

from pydantic import BaseModel

from app.metrics.schemas import MetricPointDTO, TopProductMetricDTO


class SellerStatsSummaryDTO(BaseModel):
    from_date: str
    to_date: str
    total_revenue: float
    order_count: int
    units_sold: int
    average_ticket: float
    sales_over_time: list[MetricPointDTO]
    top_products: list[TopProductMetricDTO]
    by_category: list[MetricPointDTO]


class SellerSoldItemRowDTO(BaseModel):
    order_id: int
    sold_at: datetime
    product_id: int | None
    product_name: str
    quantity: int
    unit_price: float
    line_total: float
    category: str | None = None
    size: str | None = None
    buyer_username: str


class SellerLineItemsPageDTO(BaseModel):
    items: list[SellerSoldItemRowDTO]
    total: int
    skip: int
    limit: int
