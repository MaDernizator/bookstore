from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Book, Author
from .base import BaseRepository


class BookRepository(BaseRepository[Book]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Book)

    def get_by_id(self, book_id: int) -> Optional[Book]:
        return self.get(book_id)

    def list_books(
            self,
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
        query = self.db.query(Book)

        if q:
            pattern = f"%{q}%"
            query = query.filter(Book.title.ilike(pattern))

        if genre_id:
            query = query.filter(Book.genre_id == genre_id)

        if author_id:
            query = query.join(Book.authors).filter(Author.author_id == author_id)

        if publisher_id:
            query = query.filter(Book.publisher_id == publisher_id)

        if min_price is not None:
            query = query.filter(Book.price >= min_price)

        if max_price is not None:
            query = query.filter(Book.price <= max_price)

        if min_year is not None:
            query = query.filter(Book.publication_year >= min_year)

        if max_year is not None:
            query = query.filter(Book.publication_year <= max_year)

        if order_by:
            if order_by == "price_asc":
                query = query.order_by(Book.price.asc())
            elif order_by == "price_desc":
                query = query.order_by(Book.price.desc())
            elif order_by == "year_asc":
                query = query.order_by(Book.publication_year.asc())
            elif order_by == "year_desc":
                query = query.order_by(Book.publication_year.desc())
            elif order_by == "title_asc":
                query = query.order_by(Book.title.asc())
            elif order_by == "title_desc":
                query = query.order_by(Book.title.desc())

        # ВАЖНО: ВСЕГДА возвращаем список, даже если он пустой
        return query.offset(skip).limit(limit).all()

    def create_book(self, data: dict) -> Book:
        return self.create(data)

    def update_book(self, book: Book, data: dict) -> Book:
        return self.update(book, data)

    def delete_book(self, book: Book) -> None:
        self.delete(book)
