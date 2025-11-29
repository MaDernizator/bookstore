# app/schemas/book.py
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict  # добавили ConfigDict


class BookBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: Decimal
    publication_year: Optional[int] = None
    pages: Optional[int] = None
    isbn: Optional[str] = None
    genre_id: Optional[int] = None
    publisher_id: Optional[int] = None
    author_ids: List[int] = []  # список id авторов


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    publication_year: Optional[int] = None
    pages: Optional[int] = None
    isbn: Optional[str] = None
    genre_id: Optional[int] = None
    publisher_id: Optional[int] = None
    author_ids: Optional[List[int]] = None


class BookRead(BookBase):
    book_id: int

    model_config = ConfigDict(from_attributes=True)
