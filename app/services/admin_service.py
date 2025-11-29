# app/services/admin_service.py
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Genre, Author, Publisher, User, Order
from app.repositories import (
    GenreRepository,
    AuthorRepository,
    PublisherRepository,
    UserRepository,
    OrderRepository,
)
from app.schemas.genre import GenreCreate, GenreUpdate
from app.schemas.author import AuthorCreate, AuthorUpdate
from app.schemas.publisher import PublisherCreate, PublisherUpdate


# --- ЖАНРЫ ---


def list_genres(db: Session) -> List[Genre]:
    repo = GenreRepository(db)
    return repo.list_all()


def create_genre(db: Session, data: GenreCreate) -> Genre:
    repo = GenreRepository(db)
    return repo.create(data.model_dump())


def update_genre(db: Session, genre_id: int, data: GenreUpdate) -> Optional[Genre]:
    repo = GenreRepository(db)
    genre = repo.get_by_id(genre_id)
    if not genre:
        return None
    updated = repo.update(genre, data.model_dump(exclude_unset=True))
    return updated


def delete_genre(db: Session, genre_id: int) -> bool:
    repo = GenreRepository(db)
    genre = repo.get_by_id(genre_id)
    if not genre:
        return False
    repo.delete(genre)
    return True


# --- АВТОРЫ ---


def list_authors(db: Session) -> List[Author]:
    repo = AuthorRepository(db)
    return repo.list_all()


def create_author(db: Session, data: AuthorCreate) -> Author:
    repo = AuthorRepository(db)
    return repo.create(data.model_dump())


def update_author(db: Session, author_id: int, data: AuthorUpdate) -> Optional[Author]:
    repo = AuthorRepository(db)
    author = repo.get_by_id(author_id)
    if not author:
        return None
    updated = repo.update(author, data.model_dump(exclude_unset=True))
    return updated


def delete_author(db: Session, author_id: int) -> bool:
    repo = AuthorRepository(db)
    author = repo.get_by_id(author_id)
    if not author:
        return False
    repo.delete(author)
    return True


# --- ИЗДАТЕЛЬСТВА ---


def list_publishers(db: Session) -> List[Publisher]:
    repo = PublisherRepository(db)
    return repo.list_all()


def create_publisher(db: Session, data: PublisherCreate) -> Publisher:
    repo = PublisherRepository(db)
    return repo.create(data.model_dump())


def update_publisher(
    db: Session,
    publisher_id: int,
    data: PublisherUpdate,
) -> Optional[Publisher]:
    repo = PublisherRepository(db)
    publisher = repo.get_by_id(publisher_id)
    if not publisher:
        return None
    updated = repo.update(publisher, data.model_dump(exclude_unset=True))
    return updated


def delete_publisher(db: Session, publisher_id: int) -> bool:
    repo = PublisherRepository(db)
    publisher = repo.get_by_id(publisher_id)
    if not publisher:
        return False
    repo.delete(publisher)
    return True


# --- ПОЛЬЗОВАТЕЛИ ---


def list_users(db: Session) -> List[User]:
    repo = UserRepository(db)
    return db.query(User).order_by(User.created_at.desc()).all()


def set_user_admin(db: Session, user_id: int, is_admin: bool) -> Optional[User]:
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        return None
    user.is_admin = is_admin
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- ЗАКАЗЫ ---


def list_all_orders(db: Session) -> List[Order]:
    repo = OrderRepository(db)
    # можно использовать репозиторий напрямую
    return db.query(Order).order_by(Order.created_at.desc()).all()


def get_order_by_id(db: Session, order_id: int) -> Optional[Order]:
    repo = OrderRepository(db)
    return repo.get_by_id(order_id)


def update_order_status(
    db: Session,
    order_id: int,
    status: str,
) -> Optional[Order]:
    repo = OrderRepository(db)
    order = repo.get_by_id(order_id)
    if not order:
        return None
    order.status = status
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
