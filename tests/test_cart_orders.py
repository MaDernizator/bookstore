# tests/test_cart_orders.py
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.auth_service import create_access_token
from app.models import User


def make_token_for_user(user: User) -> str:
    return create_access_token({"sub": user.email})


def test_cart_and_order_flow(client: TestClient, db_session: Session, create_user):
    # создаём админа и обычного пользователя
    admin = create_user("admin2@example.com", "adminpass", is_admin=True)
    user = create_user("user2@example.com", "userpass", is_admin=False)

    admin_token = make_token_for_user(admin)
    user_token = make_token_for_user(user)

    # админ создаёт книгу
    resp = client.post(
        "/api/books/",
        json={
            "title": "Cart Test Book",
            "description": "Book for cart test",
            "price": 300,
            "publication_year": 2023,
            "pages": 200,
            "isbn": "987-654",
            "genre_id": None,
            "publisher_id": None,
            "author_ids": [],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    book = resp.json()
    book_id = book["book_id"]

    # пользователь добавляет книгу в корзину
    resp = client.post(
        "/api/cart/items",
        json={"book_id": book_id, "quantity": 2},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    cart = resp.json()
    assert len(cart["items"]) == 1
    assert cart["items"][0]["book_id"] == book_id

    # проверяем корзину
    resp = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    cart = resp.json()
    assert len(cart["items"]) == 1

    # оформляем заказ
    resp = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 201
    order = resp.json()
    assert order["user_id"] == user.user_id
    assert len(order["items"]) == 1
    assert float(order["total_amount"]) > 0

    # корзина должна быть очищена
    resp = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    cart = resp.json()
    assert len(cart["items"]) == 0

    # список заказов пользователя
    resp = client.get(
        "/api/orders",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    orders = resp.json()
    assert len(orders) >= 1
