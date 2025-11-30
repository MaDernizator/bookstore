# tests/test_auth.py
from fastapi.testclient import TestClient


def test_register_and_login_and_me(client: TestClient):
    # регистрация
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "user1@example.com",
            "full_name": "User One",
            "phone": "123",
            "password": "qwerty123",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "user1@example.com"
    assert data["is_admin"] is False

    # логин
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "user1@example.com",
            "password": "qwerty123",
        },
    )
    assert resp.status_code == 200
    token_data = resp.json()
    assert "access_token" in token_data

    # /auth/me
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    assert resp.status_code == 200
    me = resp.json()
    assert me["email"] == "user1@example.com"
