from pydantic import BaseModel, Field


class SystemSettingsMaxScamReportsDTO(BaseModel):
    max_scam_reports: int = Field(..., ge=1)

    @classmethod
    def from_setting_row(cls, key: str, value: int):
        if key != "max_scam_reports":
            raise ValueError("Clave de configuración inesperada.")
        return cls(max_scam_reports=value)

