from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.metrics.schemas import PeriodMetricsDTO, TodayMetricsDTO
from app.metrics.services import MetricsService
from app.users.deps.auth import require_admin
from app.users.models import User

router = APIRouter(prefix="/api/admin/metrics", tags=["admin"])


@router.get("/today", response_model=TodayMetricsDTO)
def today_metrics(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return MetricsService.today(db)


@router.get("/period", response_model=PeriodMetricsDTO)
def period_metrics(
    days: int = Query(..., description="Cantidad de días del período (30 o 90)"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return MetricsService.period(db, days)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
