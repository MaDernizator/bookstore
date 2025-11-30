from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str) -> str:
    resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_profile_update_and_password_change(client: TestClient, create_user):
    create_user("profile@example.com", "Oldpass1!")
    token = login(client, "profile@example.com", "Oldpass1!")
    headers = {"Authorization": f"Bearer {token}"}

    update_resp = client.put(
        "/api/users/me",
        headers=headers,
        json={
            "full_name": "Updated User",
            "email": "profile@example.com",
            "phone": "+123456789",
        },
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["full_name"] == "Updated User"
    assert updated["phone"] == "+123456789"

    bad_password = client.post(
        "/api/users/me/password",
        headers=headers,
        json={"current_password": "wrong", "new_password": "Newpass1!"},
    )
    assert bad_password.status_code == 400

    change_resp = client.post(
        "/api/users/me/password",
        headers=headers,
        json={"current_password": "Oldpass1!", "new_password": "Newpass1!"},
    )
    assert change_resp.status_code == 200

    new_token = login(client, "profile@example.com", "Newpass1!")
    assert new_token


def test_address_crud_and_default(client: TestClient, create_user):
    create_user("addr@example.com", "Oldpass1!")
    token = login(client, "addr@example.com", "Oldpass1!")
    headers = {"Authorization": f"Bearer {token}"}

    first_resp = client.post(
        "/api/users/me/addresses",
        headers=headers,
        json={
            "city": "Москва",
            "street": "Арбат",
            "house": "1",
            "postal_code": "123456",
            "is_default": False,
        },
    )
    assert first_resp.status_code == 201
    first_addr = first_resp.json()
    assert first_addr["is_default"] is True

    second_resp = client.post(
        "/api/users/me/addresses",
        headers=headers,
        json={
            "city": "Москва",
            "street": "Тверская",
            "house": "2",
            "postal_code": "654321",
            "is_default": False,
        },
    )
    assert second_resp.status_code == 201
    second_addr = second_resp.json()
    assert second_addr["is_default"] is False

    make_default = client.put(
        f"/api/users/me/addresses/{second_addr['address_id']}",
        headers=headers,
        json={"is_default": True},
    )
    assert make_default.status_code == 200
    assert make_default.json()["is_default"] is True

    addresses = client.get("/api/users/me/addresses", headers=headers).json()
    assert any(a["address_id"] == second_addr["address_id"] and a["is_default"] for a in addresses)

    delete_resp = client.delete(
        f"/api/users/me/addresses/{second_addr['address_id']}", headers=headers
    )
    assert delete_resp.status_code == 204

    remaining = client.get("/api/users/me/addresses", headers=headers).json()
    assert remaining
    assert remaining[0]["is_default"] is True
