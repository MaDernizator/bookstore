# app/schemas/book.py
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field  # добавили ConfigDict


class BookBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: Decimal
    publication_year: Optional[int] = None
    pages: Optional[int] = None
    isbn: Optional[str] = None
    genre_id: Optional[int] = None
    genre_name: Optional[str] = None
    publisher_id: Optional[int] = None
    publisher_name: Optional[str] = None
    author_ids: List[int] = Field(default_factory=list)  # список id авторов
    author_names: List[str] = Field(default_factory=list)
    cover_image: Optional[str] = None  # URL/путь к обложке


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
    genre_name: Optional[str] = None
    publisher_id: Optional[int] = None
    publisher_name: Optional[str] = None
    author_ids: Optional[List[int]] = None
    author_names: Optional[List[str]] = None
    cover_image: Optional[str] = None  # на случай ручного обновления


class BookRead(BookBase):
    book_id: int

    model_config = ConfigDict(from_attributes=True)
