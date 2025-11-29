# tests/conftest.py
import os
import sys

# --- добавляем корень проекта в sys.path ---
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))  # .../bookstore
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# перед импортом app подменяем DATABASE_URL
os.environ["DATABASE_URL"] = "sqlite:///./app/test.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User
from app.services.auth_service import get_password_hash


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Создаём чистую БД перед тестами и удаляем таблицы после."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    """Отдельная сессия БД для вспомогательных операций в тестах."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def create_user(db_session):
    """Фабрика для создания обычного пользователя в БД напрямую."""
    def _create_user(email: str, password: str, is_admin: bool = False):
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            full_name="Test User",
            phone=None,
            is_admin=is_admin,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create_user
