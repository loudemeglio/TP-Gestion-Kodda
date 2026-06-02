from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.orders.models import Order, OrderItem
from app.products.models import Product
from app.users.models import User


class SellerStatsRepository:
    EXPORT_MAX_ROWS = 10_000

    @staticmethod
    def _line_total_expr():
        return OrderItem.unit_price * OrderItem.quantity

    @staticmethod
    def _order_in_date_range(start_day: date, end_day: date):
        order_day = func.date(Order.created_at)
        return order_day >= start_day, order_day <= end_day

    @staticmethod
    def aggregate_totals(
        db: Session, seller_id: int, start_day: date, end_day: date
    ) -> tuple[float, int, int]:
        date_from, date_to = SellerStatsRepository._order_in_date_range(start_day, end_day)
        row = (
            db.query(
                func.coalesce(func.sum(SellerStatsRepository._line_total_expr()), 0).label("revenue"),
                func.coalesce(func.sum(OrderItem.quantity), 0).label("units"),
                func.count(func.distinct(OrderItem.order_id)).label("orders"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                date_from,
                date_to,
            )
            .one()
        )
        return (
            round(float(row.revenue or 0), 2),
            int(row.orders or 0),
            int(row.units or 0),
        )

    @staticmethod
    def sales_by_day(db: Session, seller_id: int, start_day: date, end_day: date) -> list[tuple[date, float]]:
        date_from, date_to = SellerStatsRepository._order_in_date_range(start_day, end_day)
        rows = (
            db.query(
                func.date(Order.created_at).label("bucket"),
                func.sum(SellerStatsRepository._line_total_expr()).label("total"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                date_from,
                date_to,
            )
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
            .all()
        )
        return [(row.bucket, round(float(row.total or 0), 2)) for row in rows]

    @staticmethod
    def top_products(
        db: Session, seller_id: int, start_day: date, end_day: date, limit: int = 5
    ) -> list[tuple[str, int, float]]:
        date_from, date_to = SellerStatsRepository._order_in_date_range(start_day, end_day)
        rows = (
            db.query(
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("units"),
                func.sum(SellerStatsRepository._line_total_expr()).label("total"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                date_from,
                date_to,
            )
            .group_by(OrderItem.product_name)
            .order_by(
                func.sum(OrderItem.quantity).desc(),
                func.sum(SellerStatsRepository._line_total_expr()).desc(),
            )
            .limit(limit)
            .all()
        )
        return [
            (row.product_name, int(row.units or 0), round(float(row.total or 0), 2))
            for row in rows
        ]

    @staticmethod
    def by_category(db: Session, seller_id: int, start_day: date, end_day: date) -> list[tuple[str, float]]:
        date_from, date_to = SellerStatsRepository._order_in_date_range(start_day, end_day)
        category_label = func.coalesce(Product.category, "Sin categoría")
        rows = (
            db.query(
                category_label.label("category"),
                func.sum(SellerStatsRepository._line_total_expr()).label("total"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .outerjoin(Product, Product.id == OrderItem.product_id)
            .filter(
                OrderItem.seller_id == seller_id,
                date_from,
                date_to,
            )
            .group_by(category_label)
            .order_by(func.sum(SellerStatsRepository._line_total_expr()).desc())
            .all()
        )
        return [(row.category, round(float(row.total or 0), 2)) for row in rows]

    @staticmethod
    def count_line_items(db: Session, seller_id: int, start_day: date, end_day: date) -> int:
        date_from, date_to = SellerStatsRepository._order_in_date_range(start_day, end_day)
        return (
            db.query(func.count(OrderItem.id))
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                date_from,
                date_to,
            )
            .scalar()
            or 0
        )

    @staticmethod
    def list_line_items(
        db: Session,
        seller_id: int,
        start_day: date,
        end_day: date,
        skip: int = 0,
        limit: int = 50,
    ) -> list[tuple[OrderItem, datetime, str, str | None, str | None]]:
        date_from, date_to = SellerStatsRepository._order_in_date_range(start_day, end_day)
        rows = (
            db.query(OrderItem, Order.created_at, User.username, Product.category, Product.size)
            .join(Order, Order.id == OrderItem.order_id)
            .join(User, User.id == Order.user_id)
            .outerjoin(Product, Product.id == OrderItem.product_id)
            .filter(
                OrderItem.seller_id == seller_id,
                date_from,
                date_to,
            )
            .order_by(Order.created_at.desc(), OrderItem.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return rows
