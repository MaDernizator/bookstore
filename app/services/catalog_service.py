# app/services/catalog_service.py
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Book, Author
from app.repositories import (
    AuthorRepository,
    BookRepository,
    GenreRepository,
    PublisherRepository,
)
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
    genre_repo = GenreRepository(db)
    publisher_repo = PublisherRepository(db)
    author_repo = AuthorRepository(db)

    data = book_in.model_dump(
        exclude={"author_ids", "author_names", "genre_name", "publisher_name"}
    )

    genre_id = book_in.genre_id
    if genre_id is None and book_in.genre_name:
        name = book_in.genre_name.strip()
        if name:
            genre = genre_repo.get_by_name(name)
            if not genre:
                genre = genre_repo.create({"name": name})
            genre_id = genre.genre_id

    publisher_id = book_in.publisher_id
    if publisher_id is None and book_in.publisher_name:
        name = book_in.publisher_name.strip()
        if name:
            publisher = publisher_repo.get_by_name(name)
            if not publisher:
                publisher = publisher_repo.create({"name": name})
            publisher_id = publisher.publisher_id

    author_ids = list(book_in.author_ids or [])
    for name in book_in.author_names:
        clean_name = name.strip()
        if not clean_name:
            continue
        author = author_repo.get_by_name(clean_name)
        if not author:
            author = author_repo.create({"full_name": clean_name})
        author_ids.append(author.author_id)

    data["genre_id"] = genre_id
    data["publisher_id"] = publisher_id

    book = repo.create_book(data)

    if author_ids:
        authors = (
            db.query(Author)
            .filter(Author.author_id.in_(author_ids))
            .all()
        )
        book.authors = authors
        db.add(book)
        db.commit()
        db.refresh(book)

    return book


def update_book(db: Session, book: Book, book_in: BookUpdate) -> Book:
    repo = BookRepository(db)
    genre_repo = GenreRepository(db)
    publisher_repo = PublisherRepository(db)
    author_repo = AuthorRepository(db)

    data = book_in.model_dump(
        exclude_unset=True,
        exclude={"author_ids", "author_names", "genre_name", "publisher_name"},
    )

    # жанр: либо по id, либо создаём/находим по названию
    genre_id = None
    if "genre_id" in book_in.model_fields_set:
        genre_id = book_in.genre_id
    if book_in.genre_name is not None:
        genre_name = book_in.genre_name.strip()
        if genre_name:
            genre = genre_repo.get_by_name(genre_name)
            if not genre:
                genre = genre_repo.create({"name": genre_name})
            genre_id = genre.genre_id
        else:
            genre_id = None
    if "genre_id" in book_in.model_fields_set or book_in.genre_name is not None:
        data["genre_id"] = genre_id

    # издательство: по id или названию
    publisher_id = None
    if "publisher_id" in book_in.model_fields_set:
        publisher_id = book_in.publisher_id
    if book_in.publisher_name is not None:
        publisher_name = book_in.publisher_name.strip()
        if publisher_name:
            publisher = publisher_repo.get_by_name(publisher_name)
            if not publisher:
                publisher = publisher_repo.create({"name": publisher_name})
            publisher_id = publisher.publisher_id
        else:
            publisher_id = None
    if "publisher_id" in book_in.model_fields_set or book_in.publisher_name is not None:
        data["publisher_id"] = publisher_id

    # остальные поля
    if data:
        book = repo.update_book(book, data)

    # авторы: по id или по списку имён
    new_author_ids = None
    if book_in.author_ids is not None:
        new_author_ids = list(book_in.author_ids)
    elif book_in.author_names is not None:
        new_author_ids = []
        for name in book_in.author_names:
            clean_name = name.strip()
            if not clean_name:
                continue
            author = author_repo.get_by_name(clean_name)
            if not author:
                author = author_repo.create({"full_name": clean_name})
            new_author_ids.append(author.author_id)

    if new_author_ids is not None:
        authors = (
            db.query(Author)
            .filter(Author.author_id.in_(new_author_ids))
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
