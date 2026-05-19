from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.users.repositories.user_repository import UserRepository
from app.users.schemas import UserProfileDTO, UserProfileUpdateDTO

ALLOWED_AVATAR_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class ProfileService:
    @staticmethod
    def _avatars_dir() -> Path:
        settings = get_settings()
        path = Path(settings.upload_dir) / "avatars"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def get_own_profile(db: Session, user_id: int) -> UserProfileDTO:
        db_user = UserRepository.get_by_id(db, user_id)
        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")
        return UserProfileDTO.from_orm(db_user)

    @staticmethod
    def update_own_profile(db: Session, user_id: int, data: UserProfileUpdateDTO) -> UserProfileDTO:
        db_user = UserRepository.get_by_id(db, user_id)
        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        if data.username and data.username != db_user.username:
            if UserRepository.exists_username(db, data.username):
                raise ValueError(f"El nombre de usuario '{data.username}' ya está en uso")

        updated = UserRepository.update_profile(db, user_id, data)
        if not updated:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")
        return UserProfileDTO.from_orm(updated)

    @staticmethod
    def _remove_old_avatar_file(profile_image_url: str | None) -> None:
        if not profile_image_url or not profile_image_url.startswith("/uploads/avatars/"):
            return
        settings = get_settings()
        relative = profile_image_url.removeprefix("/uploads/avatars/")
        old_path = Path(settings.upload_dir) / "avatars" / relative
        if old_path.is_file():
            old_path.unlink(missing_ok=True)

    @staticmethod
    async def save_avatar(db: Session, user_id: int, file: UploadFile) -> UserProfileDTO:
        db_user = UserRepository.get_by_id(db, user_id)
        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        content_type = (file.content_type or "").lower()
        if content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
            raise ValueError("Formato de imagen no permitido. Usá JPEG, PNG o WebP.")

        settings = get_settings()
        body = await file.read()
        if len(body) > settings.avatar_max_bytes:
            raise ValueError(
                f"La imagen supera el tamaño máximo ({settings.avatar_max_bytes // (1024 * 1024)} MB)."
            )
        if not body:
            raise ValueError("El archivo está vacío.")

        ext = ALLOWED_AVATAR_CONTENT_TYPES[content_type]
        avatars_dir = ProfileService._avatars_dir()
        filename = f"{user_id}{ext}"
        dest = avatars_dir / filename

        ProfileService._remove_old_avatar_file(db_user.profile_image_url)

        for existing in avatars_dir.glob(f"{user_id}.*"):
            if existing != dest:
                existing.unlink(missing_ok=True)

        with open(dest, "wb") as f:
            f.write(body)

        public_url = f"/uploads/avatars/{filename}"
        updated = UserRepository.set_profile_image_url(db, user_id, public_url)
        return UserProfileDTO.from_orm(updated)
