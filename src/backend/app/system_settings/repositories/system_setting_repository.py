from sqlalchemy.orm import Session

from app.system_settings.models import SystemSetting


class SystemSettingRepository:
    @staticmethod
    def get_int(db: Session, key: str, default: int | None = None) -> int | None:
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row is None:
            return default
        return row.value

    @staticmethod
    def upsert_int(db: Session, key: str, value: int) -> SystemSetting:
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row is None:
            row = SystemSetting(key=key, value=value)
            db.add(row)
        else:
            row.value = value
        db.commit()
        db.refresh(row)
        return row

