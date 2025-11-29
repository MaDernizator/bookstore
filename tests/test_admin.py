# tests/test_admin.py
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.auth_service import create_access_token
from app.models import User


def make_token(user: User) -> str:
    return create_access_token({"sub": user.email})


def test_admin_access_and_basic_endpoints(client: TestClient, db_session: Session, create_user):
    # создаём админа и обычного пользователя
    admin = create_user("admintest@example.com", "adminpass", is_admin=True)
    user = create_user("usertest@example.com", "userpass", is_admin=False)

    admin_token = make_token(admin)
    user_token = make_token(user)

    # не-админ не может получить список пользователей
    resp = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403

    # админ может
    resp = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    users = resp.json()
    assert any(u["email"] == "admintest@example.com" for u in users)

    # админ может создать жанр
    resp = client.post(
        "/api/admin/genres",
        json={"name": "Test Genre"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    genre = resp.json()
    assert genre["name"] == "Test Genre"

    # список жанров
    resp = client.get(
        "/api/admin/genres",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    genres = resp.json()
    assert any(g["name"] == "Test Genre" for g in genres)
