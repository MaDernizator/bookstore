# app/services/catalog_service.py
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Book, Author
from app.repositories import BookRepository
from app.schemas.book import BookCreate, BookUpdate


def list_books(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    genre_id: Optional[int] = None,
    author_id: Optional[int] = None,
    publisher_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    order_by: Optional[str] = None,
) -> List[Book]:
    repo = BookRepository(db)
    return repo.list_books(
        skip=skip,
        limit=limit,
        q=q,
        genre_id=genre_id,
        author_id=author_id,
        publisher_id=publisher_id,
        min_price=min_price,
        max_price=max_price,
        min_year=min_year,
        max_year=max_year,
        order_by=order_by,
    )



def get_book(db: Session, book_id: int) -> Optional[Book]:
    repo = BookRepository(db)
    return repo.get_by_id(book_id)


def create_book(db: Session, book_in: BookCreate) -> Book:
    repo = BookRepository(db)
    # сначала создаём книгу без авторов
    data = book_in.model_dump(exclude={"author_ids"})
    book = repo.create_book(data)

    # привязываем авторов, если есть
    if book_in.author_ids:
        authors = (
            db.query(Author)
            .filter(Author.author_id.in_(book_in.author_ids))
            .all()
        )
        book.authors = authors
        db.add(book)
        db.commit()
        db.refresh(book)

    return book


def update_book(db: Session, book: Book, book_in: BookUpdate) -> Book:
    repo = BookRepository(db)
    data = book_in.dict(exclude_unset=True, exclude={"author_ids"})

    if data:
        book = repo.update_book(book, data)

    # если передан список author_ids — обновляем связи
    if book_in.author_ids is not None:
        from app.models import Author  # локальный импорт, чтобы избежать циклов

        authors = (
            db.query(Author)
            .filter(Author.author_id.in_(book_in.author_ids))
            .all()
        )
        book.authors = authors
        db.add(book)
        db.commit()
        db.refresh(book)

    return book


def delete_book(db: Session, book: Book) -> None:
    repo = BookRepository(db)
    repo.delete_book(book)
