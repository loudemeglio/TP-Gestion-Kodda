from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.seller_analytics.schemas import SellerLineItemsPageDTO, SellerStatsSummaryDTO
from app.seller_analytics.services.seller_stats_service import SellerStatsService
from app.users.deps.auth import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/seller/stats", tags=["seller-stats"])


@router.get("/summary", response_model=SellerStatsSummaryDTO)
def seller_stats_summary(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return SellerStatsService.summary(db, current_user.id, from_date, to_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/line-items", response_model=SellerLineItemsPageDTO)
def seller_stats_line_items(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return SellerStatsService.line_items(db, current_user.id, from_date, to_date, skip, limit)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/export")
def seller_stats_export(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    format: str = Query("csv", pattern="^csv$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    del format  # solo CSV en MVP
    try:
        content, filename = SellerStatsService.export_csv(db, current_user.id, from_date, to_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return Response(
        content=content.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
