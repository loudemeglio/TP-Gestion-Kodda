"""Pruebas unitarias de esquemas Pydantic (no requieren base de datos)."""

import pytest
from pydantic import ValidationError

from app.schemas import UserCreateDTO, UserUpdateDTO


def test_user_create_dto_minimal_valid():
    dto = UserCreateDTO(
        username="user_ok",
        email="user@example.com",
        password="secret12",
    )
    assert dto.username == "user_ok"
    assert dto.weight is None


def test_user_create_dto_rejects_short_username():
    with pytest.raises(ValidationError):
        UserCreateDTO(
            username="ab",
            email="a@b.com",
            password="secret12",
        )


def test_user_update_dto_empty_is_valid():
    dto = UserUpdateDTO()
    assert dto.username is None
    assert dto.email is None
