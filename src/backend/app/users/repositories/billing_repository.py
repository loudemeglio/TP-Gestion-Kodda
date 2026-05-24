from sqlalchemy.orm import Session

from app.users.models import UserBillingInfo
from app.users.schemas import BillingInfoUpsertDTO


class BillingRepository:
    @staticmethod
    def get_by_user_id(db: Session, user_id: int) -> UserBillingInfo | None:
        return db.query(UserBillingInfo).filter(UserBillingInfo.user_id == user_id).first()

    @staticmethod
    def upsert(db: Session, user_id: int, data: BillingInfoUpsertDTO, billing_email: str) -> UserBillingInfo:
        row = BillingRepository.get_by_user_id(db, user_id)
        if row is None:
            row = UserBillingInfo(user_id=user_id)
            db.add(row)

        row.legal_name = data.legal_name
        row.tax_id = data.tax_id
        row.tax_condition = data.tax_condition.value
        row.billing_address = data.billing_address
        row.city = data.city
        row.province = data.province
        row.postal_code = data.postal_code
        row.billing_email = billing_email

        db.commit()
        db.refresh(row)
        return row
