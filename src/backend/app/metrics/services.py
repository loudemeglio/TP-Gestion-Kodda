from datetime import datetime, time, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.metrics.schemas import (
    MetricPointDTO,
    RecentSaleMetricDTO,
    TodayMetricsDTO,
    TopProductMetricDTO,
)
from app.orders.models import Order, OrderItem, PaymentMethod
from app.users.models import User


class MetricsService:
    @staticmethod
    def today(db: Session) -> TodayMetricsDTO:
        today = datetime.now().date()
        start = datetime.combine(today, time.min)
        end = start + timedelta(days=1)

        orders = (
            db.query(Order)
            .options(joinedload(Order.items), joinedload(Order.user))
            .filter(Order.created_at >= start, Order.created_at < end)
            .order_by(Order.created_at.desc())
            .all()
        )

        total_sales = round(sum(order.total or 0 for order in orders), 2)
        order_count = len(orders)
        items_sold = sum(item.quantity for order in orders for item in (order.items or []))
        average_ticket = round(total_sales / order_count, 2) if order_count else 0.0

        payment_totals: dict[str, float] = {}
        hourly_totals = {hour: 0.0 for hour in range(24)}

        for order in orders:
            payment = order.payment_method
            payment_label = payment.value if isinstance(payment, PaymentMethod) else str(payment)
            payment_totals[payment_label] = payment_totals.get(payment_label, 0.0) + (order.total or 0)
            if order.created_at:
                hourly_totals[order.created_at.hour] += order.total or 0

        top_rows = (
            db.query(
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("units"),
                func.sum(OrderItem.unit_price * OrderItem.quantity).label("total"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.created_at >= start, Order.created_at < end)
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.quantity).desc(), func.sum(OrderItem.unit_price * OrderItem.quantity).desc())
            .limit(5)
            .all()
        )

        return TodayMetricsDTO(
            date=today.isoformat(),
            total_sales=total_sales,
            order_count=order_count,
            items_sold=items_sold,
            average_ticket=average_ticket,
            payment_methods=[
                MetricPointDTO(label=label, value=round(value, 2))
                for label, value in sorted(payment_totals.items(), key=lambda item: item[1], reverse=True)
            ],
            sales_by_hour=[
                MetricPointDTO(label=f"{hour:02d}:00", value=round(value, 2))
                for hour, value in hourly_totals.items()
            ],
            top_products=[
                TopProductMetricDTO(
                    product_name=row.product_name,
                    units=int(row.units or 0),
                    total=round(float(row.total or 0), 2),
                )
                for row in top_rows
            ],
            recent_sales=[
                RecentSaleMetricDTO(
                    id=order.id,
                    buyer=order.user.username if isinstance(order.user, User) else f"Usuario #{order.user_id}",
                    total=round(order.total or 0, 2),
                    payment_method=order.payment_method.value
                    if isinstance(order.payment_method, PaymentMethod)
                    else str(order.payment_method),
                    created_at=order.created_at.isoformat() if order.created_at else "",
                )
                for order in orders[:5]
            ],
        )
