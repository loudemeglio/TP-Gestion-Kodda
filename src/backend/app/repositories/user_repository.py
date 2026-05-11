from sqlalchemy.orm import Session
from app.models import User, UserRole
from app.schemas import UserCreateDTO, UserUpdateDTO


class UserRepository:
    """Repository para operaciones con la tabla de usuarios"""

    @staticmethod
    def create(db: Session, user_data: UserCreateDTO, hashed_password: str) -> User:
        """Crear un nuevo usuario"""
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            weight=user_data.weight,
            height=user_data.height,
            address=user_data.address,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User:
        """Obtener usuario por ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> User:
        """Obtener usuario por nombre de usuario"""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> User:
        """Obtener usuario por email"""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        """Obtener todos los usuarios con paginación"""
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def update(db: Session, user_id: int, user_data: UserUpdateDTO, hashed_password: str = None) -> User:
        """Actualizar un usuario"""
        db_user = UserRepository.get_by_id(db, user_id)
        
        if not db_user:
            return None
        
        if user_data.username is not None:
            db_user.username = user_data.username
        if user_data.email is not None:
            db_user.email = user_data.email
        if hashed_password is not None:
            db_user.hashed_password = hashed_password
        if user_data.weight is not None:
            db_user.weight = user_data.weight
        if user_data.height is not None:
            db_user.height = user_data.height
        if user_data.address is not None:
            db_user.address = user_data.address
        
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def delete(db: Session, user_id: int) -> bool:
        """Eliminar un usuario"""
        db_user = UserRepository.get_by_id(db, user_id)
        
        if not db_user:
            return False
        
        db.delete(db_user)
        db.commit()
        return True

    @staticmethod
    def exists_username(db: Session, username: str) -> bool:
        """Verificar si existe un usuario con ese username"""
        return db.query(User).filter(User.username == username).first() is not None

    @staticmethod
    def exists_email(db: Session, email: str) -> bool:
        """Verificar si existe un usuario con ese email"""
        return db.query(User).filter(User.email == email).first() is not None

    @staticmethod
    def change_role(db: Session, user_id: int, new_role: UserRole) -> User:
        """Cambiar el rol de un usuario"""
        db_user = UserRepository.get_by_id(db, user_id)
        
        if not db_user:
            return None
        
        db_user.role = new_role
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def get_by_role(db: Session, role: UserRole, skip: int = 0, limit: int = 100):
        """Obtener todos los usuarios con un rol específico"""
        return db.query(User).filter(User.role == role).offset(skip).limit(limit).all()
