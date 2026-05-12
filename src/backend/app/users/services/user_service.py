import bcrypt
from sqlalchemy.orm import Session

from app.users.models import User, UserRole as UserRoleModel
from app.users.repositories.user_repository import UserRepository
from app.users.schemas import UserCreateDTO, UserDTO, UserRole, UserUpdateDTO


class UserService:
    """Service para la lógica de negocio de usuarios"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Encriptar una contraseña"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verificar si una contraseña coincide con su hash"""
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

    @staticmethod
    def create_user(db: Session, user_data: UserCreateDTO) -> UserDTO:
        """Crear un nuevo usuario con validaciones"""
        if UserRepository.exists_username(db, user_data.username):
            raise ValueError(f"El nombre de usuario '{user_data.username}' ya está en uso")

        if UserRepository.exists_email(db, user_data.email):
            raise ValueError(f"El email '{user_data.email}' ya está registrado")

        hashed_password = UserService.hash_password(user_data.password)

        db_user = UserRepository.create(db, user_data, hashed_password)
        return UserDTO.from_orm(db_user)

    @staticmethod
    def get_user(db: Session, user_id: int) -> UserDTO:
        """Obtener un usuario por ID"""
        db_user = UserRepository.get_by_id(db, user_id)

        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        return UserDTO.from_orm(db_user)

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> UserDTO:
        """Obtener un usuario por nombre de usuario"""
        db_user = UserRepository.get_by_username(db, username)

        if not db_user:
            raise ValueError(f"Usuario '{username}' no encontrado")

        return UserDTO.from_orm(db_user)

    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list[UserDTO]:
        """Obtener todos los usuarios"""
        users = UserRepository.get_all(db, skip, limit)
        return [UserDTO.from_orm(user) for user in users]

    @staticmethod
    def update_user(db: Session, user_id: int, user_data: UserUpdateDTO) -> UserDTO:
        """Actualizar un usuario"""
        db_user = UserRepository.get_by_id(db, user_id)

        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        if user_data.username and user_data.username != db_user.username:
            if UserRepository.exists_username(db, user_data.username):
                raise ValueError(f"El nombre de usuario '{user_data.username}' ya está en uso")

        if user_data.email and user_data.email != db_user.email:
            if UserRepository.exists_email(db, user_data.email):
                raise ValueError(f"El email '{user_data.email}' ya está registrado")

        hashed_password = None
        if user_data.password:
            hashed_password = UserService.hash_password(user_data.password)

        updated_user = UserRepository.update(db, user_id, user_data, hashed_password)
        return UserDTO.from_orm(updated_user)

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Eliminar un usuario"""
        success = UserRepository.delete(db, user_id)

        if not success:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        return True

    @staticmethod
    def promote_to_admin(db: Session, user_id: int) -> UserDTO:
        """Promover un usuario a ADMIN"""
        db_user = UserRepository.get_by_id(db, user_id)

        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        updated_user = UserRepository.change_role(db, user_id, UserRoleModel.ADMIN)
        return UserDTO.from_orm(updated_user)

    @staticmethod
    def demote_from_admin(db: Session, user_id: int) -> UserDTO:
        """Degradar un usuario a USER"""
        db_user = UserRepository.get_by_id(db, user_id)

        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        updated_user = UserRepository.change_role(db, user_id, UserRoleModel.USER)
        return UserDTO.from_orm(updated_user)

    @staticmethod
    def change_user_role(db: Session, user_id: int, new_role: UserRole) -> UserDTO:
        """Cambiar el rol de un usuario a uno específico"""
        db_user = UserRepository.get_by_id(db, user_id)

        if not db_user:
            raise ValueError(f"Usuario con ID {user_id} no encontrado")

        updated_user = UserRepository.change_role(db, user_id, UserRoleModel[new_role.value.upper()])
        return UserDTO.from_orm(updated_user)

    @staticmethod
    def get_users_by_role(db: Session, role: UserRole, skip: int = 0, limit: int = 100) -> list[UserDTO]:
        """Obtener todos los usuarios con un rol específico"""
        users = UserRepository.get_by_role(db, UserRoleModel[role.value.upper()], skip, limit)
        return [UserDTO.from_orm(user) for user in users]
