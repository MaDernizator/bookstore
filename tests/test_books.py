# tests/test_books.py
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User
from app.services.auth_service import create_access_token


def get_admin_token(db: Session):
    # ищем первого админа
    admin: User | None = (
        db.query(User)
        .filter(User.is_admin.is_(True))
        .first()
    )
    if not admin:
        raise RuntimeError("Admin user not found in test DB")
    return create_access_token({"sub": admin.email})


def test_admin_create_and_list_books(client: TestClient, db_session, create_user):
    # подготовка: создаём админа
    admin = create_user("admin@example.com", "adminpass", is_admin=True)
    token = get_admin_token(db_session)

    # создаём книгу
    resp = client.post(
        "/api/books/",
        json={
            "title": "Test Book",
            "description": "Just a test",
            "price": 500,
            "publication_year": 2024,
            "pages": 100,
            "isbn": "123-456",
            "genre_id": None,
            "publisher_id": None,
            "author_ids": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    book = resp.json()
    assert book["title"] == "Test Book"
    book_id = book["book_id"]

    # список книг (без авторизации)
    resp = client.get("/api/books")
    assert resp.status_code == 200
    books = resp.json()
    assert len(books) >= 1

    # получение по id
    resp = client.get(f"/api/books/{book_id}")
    assert resp.status_code == 200
    book2 = resp.json()
    assert book2["book_id"] == book_id
