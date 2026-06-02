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
    def aggregate_totals(db: Session, seller_id: int, start: datetime, end: datetime) -> tuple[float, int, int]:
        row = (
            db.query(
                func.coalesce(func.sum(SellerStatsRepository._line_total_expr()), 0).label("revenue"),
                func.coalesce(func.sum(OrderItem.quantity), 0).label("units"),
                func.count(func.distinct(OrderItem.order_id)).label("orders"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                Order.created_at >= start,
                Order.created_at < end,
            )
            .one()
        )
        return (
            round(float(row.revenue or 0), 2),
            int(row.orders or 0),
            int(row.units or 0),
        )

    @staticmethod
    def sales_by_day(db: Session, seller_id: int, start: datetime, end: datetime) -> list[tuple[date, float]]:
        rows = (
            db.query(
                func.date(Order.created_at).label("bucket"),
                func.sum(SellerStatsRepository._line_total_expr()).label("total"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                Order.created_at >= start,
                Order.created_at < end,
            )
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
            .all()
        )
        return [(row.bucket, round(float(row.total or 0), 2)) for row in rows]

    @staticmethod
    def top_products(
        db: Session, seller_id: int, start: datetime, end: datetime, limit: int = 5
    ) -> list[tuple[str, int, float]]:
        rows = (
            db.query(
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("units"),
                func.sum(SellerStatsRepository._line_total_expr()).label("total"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                Order.created_at >= start,
                Order.created_at < end,
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
    def by_category(db: Session, seller_id: int, start: datetime, end: datetime) -> list[tuple[str, float]]:
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
                Order.created_at >= start,
                Order.created_at < end,
            )
            .group_by(category_label)
            .order_by(func.sum(SellerStatsRepository._line_total_expr()).desc())
            .all()
        )
        return [(row.category, round(float(row.total or 0), 2)) for row in rows]

    @staticmethod
    def count_line_items(db: Session, seller_id: int, start: datetime, end: datetime) -> int:
        return (
            db.query(func.count(OrderItem.id))
            .join(Order, Order.id == OrderItem.order_id)
            .filter(
                OrderItem.seller_id == seller_id,
                Order.created_at >= start,
                Order.created_at < end,
            )
            .scalar()
            or 0
        )

    @staticmethod
    def list_line_items(
        db: Session,
        seller_id: int,
        start: datetime,
        end: datetime,
        skip: int = 0,
        limit: int = 50,
    ) -> list[tuple[OrderItem, datetime, str, str | None, str | None]]:
        rows = (
            db.query(OrderItem, Order.created_at, User.username, Product.category, Product.size)
            .join(Order, Order.id == OrderItem.order_id)
            .join(User, User.id == Order.user_id)
            .outerjoin(Product, Product.id == OrderItem.product_id)
            .filter(
                OrderItem.seller_id == seller_id,
                Order.created_at >= start,
                Order.created_at < end,
            )
            .order_by(Order.created_at.desc(), OrderItem.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return rows
