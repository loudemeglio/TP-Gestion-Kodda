from sqlalchemy.orm import Session

from app.users.repositories.billing_repository import BillingRepository
from app.users.repositories.user_repository import UserRepository
from app.users.schemas import BillingInfoDTO, BillingInfoUpsertDTO

_CUIT_WEIGHTS = (5, 4, 3, 2, 7, 6, 5, 4, 3, 2)
_VALID_CUIT_PREFIXES = frozenset(
    {
        "20",
        "23",
        "24",
        "27",
        "30",
        "33",
        "34",
    }
)


def _validate_cuit(tax_id: str) -> None:
    if not tax_id.isdigit() or len(tax_id) != 11:
        raise ValueError("El CUIT/CUIL debe tener 11 dígitos numéricos.")

    prefix = tax_id[:2]
    if prefix not in _VALID_CUIT_PREFIXES:
        raise ValueError("El prefijo del CUIT/CUIL no es válido.")

    body = [int(d) for d in tax_id[:10]]
    total = sum(d * w for d, w in zip(body, _CUIT_WEIGHTS))
    remainder = total % 11
    check = 11 - remainder
    if check == 11:
        check = 0
    elif check == 10:
        check = 9

    if check != int(tax_id[10]):
        raise ValueError("El CUIT/CUIL no es válido (dígito verificador incorrecto).")


class BillingService:
    @staticmethod
    def get_own_billing(db: Session, user_id: int) -> BillingInfoDTO:
        row = BillingRepository.get_by_user_id(db, user_id)
        if not row:
            raise LookupError("No tenés datos de facturación registrados.")
        return BillingInfoDTO.model_validate(row)

    @staticmethod
    def upsert_own_billing(db: Session, user_id: int, data: BillingInfoUpsertDTO) -> BillingInfoDTO:
        db_user = UserRepository.get_by_id(db, user_id)
        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        _validate_cuit(data.tax_id)

        billing_email = (data.billing_email or db_user.email).strip()
        row = BillingRepository.upsert(db, user_id, data, billing_email)
        return BillingInfoDTO.model_validate(row)
