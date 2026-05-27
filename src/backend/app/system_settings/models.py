from sqlalchemy import Column, Integer, String

from app.core.database import Base


class SystemSetting(Base):
    """Configuración global tipo key/value."""

    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Integer, nullable=False)

