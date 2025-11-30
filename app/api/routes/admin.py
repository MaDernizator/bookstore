# app/api/routes/admin.py
import base64
import binascii
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_current_admin
from app.schemas.genre import GenreCreate, GenreUpdate, GenreRead
from app.schemas.author import AuthorCreate, AuthorUpdate, AuthorRead
from app.schemas.publisher import PublisherCreate, PublisherUpdate, PublisherRead
from app.schemas.admin import UserAdminRead, UserAdminUpdate, OrderStatusUpdate
from app.schemas.order import OrderRead
from app.services import admin_service

from app.schemas.book import BookRead, BookCoverUpload
from app.repositories import BookRepository
from app.models import Book
from app.database import Base

router = APIRouter(prefix="/admin", tags=["admin"])


# --- ЖАНРЫ ---


@router.get("/genres", response_model=List[GenreRead])
def admin_list_genres(
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    return admin_service.list_genres(db)


@router.post("/genres", response_model=GenreRead, status_code=status.HTTP_201_CREATED)
def admin_create_genre(
        genre_in: GenreCreate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    return admin_service.create_genre(db, genre_in)


@router.put("/genres/{genre_id}", response_model=GenreRead)
def admin_update_genre(
        genre_id: int,
        genre_in: GenreUpdate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    genre = admin_service.update_genre(db, genre_id, genre_in)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    return genre


@router.delete("/genres/{genre_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_genre(
        genre_id: int,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    ok = admin_service.delete_genre(db, genre_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Genre not found")
    return None


# --- АВТОРЫ ---


@router.get("/authors", response_model=List[AuthorRead])
def admin_list_authors(
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    return admin_service.list_authors(db)


@router.post("/authors", response_model=AuthorRead, status_code=status.HTTP_201_CREATED)
def admin_create_author(
        author_in: AuthorCreate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    return admin_service.create_author(db, author_in)


@router.put("/authors/{author_id}", response_model=AuthorRead)
def admin_update_author(
        author_id: int,
        author_in: AuthorUpdate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    author = admin_service.update_author(db, author_id, author_in)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return author


@router.delete("/authors/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_author(
        author_id: int,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    ok = admin_service.delete_author(db, author_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Author not found")
    return None


# --- ИЗДАТЕЛЬСТВА ---


@router.get("/publishers", response_model=List[PublisherRead])
def admin_list_publishers(
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    return admin_service.list_publishers(db)


@router.post(
    "/publishers",
    response_model=PublisherRead,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_publisher(
        publisher_in: PublisherCreate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    return admin_service.create_publisher(db, publisher_in)


@router.put("/publishers/{publisher_id}", response_model=PublisherRead)
def admin_update_publisher(
        publisher_id: int,
        publisher_in: PublisherUpdate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    publisher = admin_service.update_publisher(db, publisher_id, publisher_in)
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    return publisher


@router.delete("/publishers/{publisher_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_publisher(
        publisher_id: int,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    ok = admin_service.delete_publisher(db, publisher_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Publisher not found")
    return None


# --- ПОЛЬЗОВАТЕЛИ ---


@router.get("/users", response_model=List[UserAdminRead])
def admin_list_users(
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    users = admin_service.list_users(db)
    return users


@router.patch("/users/{user_id}", response_model=UserAdminRead)
def admin_update_user(
        user_id: int,
        user_update: UserAdminUpdate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    user = admin_service.set_user_admin(db, user_id, user_update.is_admin)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- ЗАКАЗЫ ---


@router.get("/orders", response_model=List[OrderRead])
def admin_list_orders(
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    return admin_service.list_all_orders(db)


@router.get("/orders/{order_id}", response_model=OrderRead)
def admin_get_order(
        order_id: int,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    order = admin_service.get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/orders/{order_id}/status", response_model=OrderRead)
def admin_update_order_status(
        order_id: int,
        status_update: OrderStatusUpdate,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    order = admin_service.update_order_status(db, order_id, status_update.status)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/books/{book_id}/cover", response_model=BookRead)
async def admin_upload_book_cover(
        book_id: int,
        payload: BookCoverUpload,
        db: Session = Depends(get_db_session),
        admin=Depends(get_current_admin),
):
    # находим книгу
    book_repo = BookRepository(db)
    book = book_repo.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # готовим путь для сохранения
    # BASE_DIR тот же, что и в main.py: app/...
    from app.main import BASE_DIR  # чтобы не дублировать логику

    covers_dir = os.path.join(BASE_DIR, "static", "covers")
    os.makedirs(covers_dir, exist_ok=True)

    try:
        file_bytes = base64.b64decode(payload.content)
    except binascii.Error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректные данные файла")

    max_size = 5 * 1024 * 1024
    if len(file_bytes) > max_size:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл слишком большой")

    ext = os.path.splitext(payload.filename or "")[1] or ".jpg"
    filename = f"book_{book_id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(covers_dir, filename)

    # сохраняем файл
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    # сохраняем путь в книгу
    book.cover_image = f"/static/covers/{filename}"
    db.add(book)
    db.commit()
    db.refresh(book)

    return book
