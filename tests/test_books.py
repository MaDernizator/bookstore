# tests/test_books.py
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Author, Book, Genre, Publisher, User
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


def test_books_filters_and_sorting(client: TestClient, db_session, create_user):
    # админ
    admin = create_user("adminfilter@example.com", "adminpass", is_admin=True)
    admin_token = create_access_token({"sub": admin.email})

    # создаём несколько книг с уникальным префиксом в названии
    def create_book(title, price, year):
        resp = client.post(
            "/api/books/",
            json={
                "title": title,
                "description": "",
                "price": price,
                "publication_year": year,
                "pages": 100,
                "isbn": None,
                "genre_id": None,
                "publisher_id": None,
                "author_ids": [],
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201

    create_book("Filt Cheap Book", 100, 2020)
    create_book("Filt Middle Book", 300, 2022)
    create_book("Filt Expensive Book", 500, 2024)

    # фильтр по min_price — смотрим только наши книги с префиксом "Filt"
    resp = client.get("/api/books?min_price=200&q=Filt")
    assert resp.status_code == 200
    books = resp.json()
    titles = {b["title"] for b in books}
    assert "Filt Cheap Book" not in titles
    assert "Filt Middle Book" in titles
    assert "Filt Expensive Book" in titles

    # сортировка по цене по убыванию — тоже только по нашим ("q=Filt")
    resp = client.get("/api/books?order_by=price_desc&q=Filt")
    assert resp.status_code == 200
    books = resp.json()
    # теперь первое и последнее — именно наши, без влияния других тестов
    assert books[0]["title"] == "Filt Expensive Book"
    assert books[-1]["title"] == "Filt Cheap Book"


def test_admin_create_book_creates_missing_relations(
    client: TestClient, db_session, create_user
):
    admin = create_user(
        "adminrelations@example.com",
        "adminpass",
        is_admin=True,
    )
    token = create_access_token({"sub": admin.email})

    payload = {
        "title": "Book with relations",
        "description": "",
        "price": 750,
        "publication_year": 2023,
        "pages": 320,
        "isbn": None,
        "genre_id": None,
        "publisher_id": None,
        "author_ids": [],
        "genre_name": "Test Genre X",
        "publisher_name": "Test Publisher Y",
        "author_names": ["Author One", "Author Two"],
    }

    resp = client.post(
        "/api/books/",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    created = resp.json()

    # убедились, что сущности создались в БД
    genre = db_session.query(Genre).filter_by(name=payload["genre_name"]).first()
    publisher = (
        db_session.query(Publisher)
        .filter_by(name=payload["publisher_name"])
        .first()
    )
    authors = (
        db_session.query(Author)
        .filter(Author.full_name.in_(payload["author_names"]))
        .all()
    )
    db_book = (
        db_session.query(Book)
        .filter(Book.book_id == created["book_id"])
        .first()
    )

    assert genre is not None
    assert publisher is not None
    assert len(authors) == len(payload["author_names"])
    assert db_book is not None
    assert db_book.genre_id == genre.genre_id
    assert db_book.publisher_id == publisher.publisher_id
    assert {a.full_name for a in db_book.authors} == set(payload["author_names"])


def test_admin_update_book_all_fields(client: TestClient, db_session, create_user):
    admin = create_user("adminupdate@example.com", "adminpass", is_admin=True)
    token = create_access_token({"sub": admin.email})

    create_resp = client.post(
        "/api/books/",
        json={
            "title": "Original",
            "description": "",
            "price": 100,
            "publication_year": 2020,
            "pages": 200,
            "isbn": "111-222",
            "genre_id": None,
            "publisher_id": None,
            "author_ids": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 201
    book_id = create_resp.json()["book_id"]

    update_payload = {
        "title": "Updated Title",
        "description": "Updated description",
        "price": 555,
        "publication_year": 2026,
        "pages": 321,
        "isbn": "999-888",
        "genre_name": "Updated Genre",
        "publisher_name": "Updated Publisher",
        "author_names": ["Updated Author One", "Updated Author Two"],
    }

    resp = client.put(
        f"/api/books/{book_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200
    updated = resp.json()
    assert updated["title"] == update_payload["title"]
    assert updated["description"] == update_payload["description"]
    assert float(updated["price"]) == update_payload["price"]
    assert updated["publication_year"] == update_payload["publication_year"]
    assert updated["pages"] == update_payload["pages"]
    assert updated["isbn"] == update_payload["isbn"]

    db_book = db_session.query(Book).get(book_id)
    assert db_book is not None
    assert db_book.genre is not None and db_book.genre.name == update_payload["genre_name"]
    assert db_book.publisher is not None and db_book.publisher.name == update_payload["publisher_name"]
    assert {a.full_name for a in db_book.authors} == set(update_payload["author_names"])
