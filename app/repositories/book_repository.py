# app/repositories/book_repository.py
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
    ) -> List[Book]:
        query = self.db.query(Book)

        if q:
            pattern = f"%{q}%"
            query = query.filter(Book.title.ilike(pattern))

        if genre_id:
            query = query.filter(Book.genre_id == genre_id)

        if author_id:
            query = query.join(Book.authors).filter(Author.author_id == author_id)

        return (
            query
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create_book(self, data: dict) -> Book:
        return self.create(data)

    def update_book(self, book: Book, data: dict) -> Book:
        return self.update(book, data)

    def delete_book(self, book: Book) -> None:
        self.delete(book)
