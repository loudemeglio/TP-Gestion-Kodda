from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.metrics.schemas import TodayMetricsDTO
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
