import csv
import io
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.metrics.schemas import MetricPointDTO, TopProductMetricDTO
from app.seller_analytics.repositories.seller_stats_repository import SellerStatsRepository
from app.seller_analytics.schemas import (
    SellerLineItemsPageDTO,
    SellerSoldItemRowDTO,
    SellerStatsSummaryDTO,
)


class SellerStatsService:
    DEFAULT_RANGE_DAYS = 30
    MAX_RANGE_DAYS = 366

    @staticmethod
    def _parse_date_range(
        from_date: date | None,
        to_date: date | None,
    ) -> tuple[datetime, datetime, date, date]:
        today = datetime.now(timezone.utc).date()
        end_day = to_date or today
        start_day = from_date or (end_day - timedelta(days=SellerStatsService.DEFAULT_RANGE_DAYS))

        if start_day > end_day:
            raise ValueError("La fecha 'from' no puede ser posterior a 'to'.")
        if (end_day - start_day).days > SellerStatsService.MAX_RANGE_DAYS:
            raise ValueError(f"El rango no puede superar {SellerStatsService.MAX_RANGE_DAYS} días.")

        # Límites en UTC (created_at se persiste con timezone en PostgreSQL).
        start = datetime.combine(start_day, time.min, tzinfo=timezone.utc)
        end = datetime.combine(end_day + timedelta(days=1), time.min, tzinfo=timezone.utc)
        return start, end, start_day, end_day

    @staticmethod
    def _build_sales_over_time(
        db: Session,
        seller_id: int,
        start_day: date,
        end_day: date,
    ) -> list[MetricPointDTO]:
        daily: dict[date, float] = {}
        current = start_day
        while current <= end_day:
            daily[current] = 0.0
            current += timedelta(days=1)

        for bucket, total in SellerStatsRepository.sales_by_day(db, seller_id, start_day, end_day):
            if bucket in daily:
                daily[bucket] = total

        return [
            MetricPointDTO(label=day.isoformat(), value=daily[day])
            for day in sorted(daily.keys())
        ]

    @staticmethod
    def _row_to_dto(
        item,
        sold_at: datetime,
        buyer_username: str,
        category: str | None,
        size: str | None,
    ) -> SellerSoldItemRowDTO:
        line_total = round(item.unit_price * item.quantity, 2)
        return SellerSoldItemRowDTO(
            order_id=item.order_id,
            sold_at=sold_at,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=line_total,
            category=category,
            size=size,
            buyer_username=buyer_username,
        )

    @staticmethod
    def summary(
        db: Session,
        seller_id: int,
        from_date: date | None,
        to_date: date | None,
    ) -> SellerStatsSummaryDTO:
        _start, _end, start_day, end_day = SellerStatsService._parse_date_range(from_date, to_date)

        total_revenue, order_count, units_sold = SellerStatsRepository.aggregate_totals(
            db, seller_id, start_day, end_day
        )
        average_ticket = round(total_revenue / order_count, 2) if order_count else 0.0

        top_rows = SellerStatsRepository.top_products(db, seller_id, start_day, end_day)
        category_rows = SellerStatsRepository.by_category(db, seller_id, start_day, end_day)

        return SellerStatsSummaryDTO(
            from_date=start_day.isoformat(),
            to_date=end_day.isoformat(),
            total_revenue=total_revenue,
            order_count=order_count,
            units_sold=units_sold,
            average_ticket=average_ticket,
            sales_over_time=SellerStatsService._build_sales_over_time(
                db, seller_id, start_day, end_day
            ),
            top_products=[
                TopProductMetricDTO(product_name=name, units=units, total=total)
                for name, units, total in top_rows
            ],
            by_category=[
                MetricPointDTO(label=label, value=value) for label, value in category_rows
            ],
        )

    @staticmethod
    def line_items(
        db: Session,
        seller_id: int,
        from_date: date | None,
        to_date: date | None,
        skip: int = 0,
        limit: int = 50,
    ) -> SellerLineItemsPageDTO:
        _start, _end, start_day, end_day = SellerStatsService._parse_date_range(from_date, to_date)
        total = SellerStatsRepository.count_line_items(db, seller_id, start_day, end_day)
        rows = SellerStatsRepository.list_line_items(db, seller_id, start_day, end_day, skip, limit)
        items = [
            SellerStatsService._row_to_dto(item, sold_at, buyer, category, size)
            for item, sold_at, buyer, category, size in rows
        ]
        return SellerLineItemsPageDTO(
            items=items,
            total=total,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    def export_csv(
        db: Session,
        seller_id: int,
        from_date: date | None,
        to_date: date | None,
    ) -> tuple[str, str]:
        _start, _end, start_day, end_day = SellerStatsService._parse_date_range(from_date, to_date)
        rows = SellerStatsRepository.list_line_items(
            db,
            seller_id,
            start_day,
            end_day,
            skip=0,
            limit=SellerStatsRepository.EXPORT_MAX_ROWS,
        )

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            [
                "fecha",
                "orden_id",
                "producto",
                "categoria",
                "talle",
                "cantidad",
                "precio_unitario",
                "total_linea",
                "comprador",
            ]
        )
        for item, sold_at, buyer, category, size in rows:
            line_total = round(item.unit_price * item.quantity, 2)
            writer.writerow(
                [
                    sold_at.isoformat() if sold_at else "",
                    item.order_id,
                    item.product_name,
                    category or "",
                    size or "",
                    item.quantity,
                    item.unit_price,
                    line_total,
                    buyer,
                ]
            )

        filename = f"mis-ventas_{start_day.isoformat()}_{end_day.isoformat()}.csv"
        return buffer.getvalue(), filename
