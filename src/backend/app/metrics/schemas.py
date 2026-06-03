from pydantic import BaseModel


class MetricPointDTO(BaseModel):
    label: str
    value: float


class TopProductMetricDTO(BaseModel):
    product_name: str
    units: int
    total: float


class RecentSaleMetricDTO(BaseModel):
    id: int
    buyer: str
    total: float
    payment_method: str
    created_at: str


class TodayMetricsDTO(BaseModel):
    date: str
    total_sales: float
    order_count: int
    items_sold: int
    average_ticket: float
    payment_methods: list[MetricPointDTO]
    sales_by_hour: list[MetricPointDTO]
    top_products: list[TopProductMetricDTO]
    recent_sales: list[RecentSaleMetricDTO]


class PeriodMetricsDTO(BaseModel):
    from_date: str
    to_date: str
    days: int
    total_sales: float
    order_count: int
    items_sold: int
    average_ticket: float
    payment_methods: list[MetricPointDTO]
    sales_over_time: list[MetricPointDTO]
    top_products: list[TopProductMetricDTO]
    recent_sales: list[RecentSaleMetricDTO]
