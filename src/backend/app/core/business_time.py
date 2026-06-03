from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import Date, cast, literal

BUSINESS_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
BUSINESS_TZ_NAME = "America/Argentina/Buenos_Aires"


def business_today() -> date:
    return datetime.now(BUSINESS_TZ).date()


def order_business_day(column):
    """Fecha calendario de la orden en horario de Argentina (timestamptz → date)."""
    local_ts = column.op("AT TIME ZONE")(literal(BUSINESS_TZ_NAME))
    return cast(local_ts, Date)
