from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.business_time import BUSINESS_TZ, business_today, order_business_day
from app.metrics.schemas import (
    MetricPointDTO,
    PeriodMetricsDTO,
    RecentSaleMetricDTO,
    TodayMetricsDTO,
    TopProductMetricDTO,
)
from app.orders.models import Order, OrderItem, PaymentMethod
from app.users.models import User


class MetricsService:
    ALLOWED_PERIOD_DAYS = {30, 90}

    @staticmethod
    def _order_day_filters(start_day: date, end_day: date):
        order_day = order_business_day(Order.created_at)
        return order_day >= start_day, order_day <= end_day

    @staticmethod
    def _fetch_orders(db: Session, start_day: date, end_day: date) -> list[Order]:
        date_from, date_to = MetricsService._order_day_filters(start_day, end_day)
        return (
            db.query(Order)
            .options(joinedload(Order.items), joinedload(Order.user))
            .filter(date_from, date_to)
            .order_by(Order.created_at.desc())
            .all()
        )

    @staticmethod
    def _payment_label(payment) -> str:
        return payment.value if isinstance(payment, PaymentMethod) else str(payment)

    @staticmethod
    def _top_products(
        db: Session,
        start_day: date,
        end_day: date,
        limit: int = 5,
    ) -> list[TopProductMetricDTO]:
        date_from, date_to = MetricsService._order_day_filters(start_day, end_day)
        top_rows = (
            db.query(
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("units"),
                func.sum(OrderItem.unit_price * OrderItem.quantity).label("total"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(date_from, date_to)
            .group_by(OrderItem.product_name)
            .order_by(
                func.sum(OrderItem.quantity).desc(),
                func.sum(OrderItem.unit_price * OrderItem.quantity).desc(),
            )
            .limit(limit)
            .all()
        )
        return [
            TopProductMetricDTO(
                product_name=row.product_name,
                units=int(row.units or 0),
                total=round(float(row.total or 0), 2),
            )
            for row in top_rows
        ]

    @staticmethod
    def _recent_sales(orders: list[Order], limit: int = 5) -> list[RecentSaleMetricDTO]:
        return [
            RecentSaleMetricDTO(
                id=order.id,
                buyer=order.user.username if isinstance(order.user, User) else f"Usuario #{order.user_id}",
                total=round(order.total or 0, 2),
                payment_method=MetricsService._payment_label(order.payment_method),
                created_at=order.created_at.isoformat() if order.created_at else "",
            )
            for order in orders[:limit]
        ]

    @staticmethod
    def _aggregate_orders(orders: list[Order]) -> tuple[float, int, int, float]:
        total_sales = round(sum(order.total or 0 for order in orders), 2)
        order_count = len(orders)
        items_sold = sum(item.quantity for order in orders for item in (order.items or []))
        average_ticket = round(total_sales / order_count, 2) if order_count else 0.0
        return total_sales, order_count, items_sold, average_ticket

    @staticmethod
    def _payment_totals(orders: list[Order]) -> list[MetricPointDTO]:
        payment_totals: dict[str, float] = {}
        for order in orders:
            label = MetricsService._payment_label(order.payment_method)
            payment_totals[label] = payment_totals.get(label, 0.0) + (order.total or 0)
        return [
            MetricPointDTO(label=label, value=round(value, 2))
            for label, value in sorted(payment_totals.items(), key=lambda item: item[1], reverse=True)
        ]

    @staticmethod
    def _sales_by_hour(orders: list[Order]) -> list[MetricPointDTO]:
        hourly_totals = {hour: 0.0 for hour in range(24)}
        for order in orders:
            if order.created_at:
                local_time = order.created_at.astimezone(BUSINESS_TZ)
                hourly_totals[local_time.hour] += order.total or 0
        return [
            MetricPointDTO(label=f"{hour:02d}:00", value=round(value, 2))
            for hour, value in hourly_totals.items()
        ]

    @staticmethod
    def _sales_by_day(orders: list[Order], start_day: date, end_day: date) -> list[MetricPointDTO]:
        daily_totals: dict[date, float] = {}
        current = start_day
        while current <= end_day:
            daily_totals[current] = 0.0
            current += timedelta(days=1)

        for order in orders:
            if order.created_at:
                day = order.created_at.astimezone(BUSINESS_TZ).date()
                if day in daily_totals:
                    daily_totals[day] += order.total or 0

        return [
            MetricPointDTO(label=day.isoformat(), value=round(value, 2))
            for day, value in sorted(daily_totals.items())
        ]

    @staticmethod
    def today(db: Session) -> TodayMetricsDTO:
        today = business_today()
        orders = MetricsService._fetch_orders(db, today, today)
        total_sales, order_count, items_sold, average_ticket = MetricsService._aggregate_orders(orders)

        return TodayMetricsDTO(
            date=today.isoformat(),
            total_sales=total_sales,
            order_count=order_count,
            items_sold=items_sold,
            average_ticket=average_ticket,
            payment_methods=MetricsService._payment_totals(orders),
            sales_by_hour=MetricsService._sales_by_hour(orders),
            top_products=MetricsService._top_products(db, today, today),
            recent_sales=MetricsService._recent_sales(orders),
        )

    @staticmethod
    def period(db: Session, days: int) -> PeriodMetricsDTO:
        if days not in MetricsService.ALLOWED_PERIOD_DAYS:
            raise ValueError(f"El período debe ser uno de: {sorted(MetricsService.ALLOWED_PERIOD_DAYS)}")

        end_day = business_today()
        start_day = end_day - timedelta(days=days - 1)
        orders = MetricsService._fetch_orders(db, start_day, end_day)
        total_sales, order_count, items_sold, average_ticket = MetricsService._aggregate_orders(orders)

        return PeriodMetricsDTO(
            from_date=start_day.isoformat(),
            to_date=end_day.isoformat(),
            days=days,
            total_sales=total_sales,
            order_count=order_count,
            items_sold=items_sold,
            average_ticket=average_ticket,
            payment_methods=MetricsService._payment_totals(orders),
            sales_over_time=MetricsService._sales_by_day(orders, start_day, end_day),
            top_products=MetricsService._top_products(db, start_day, end_day),
            recent_sales=MetricsService._recent_sales(orders),
        )
