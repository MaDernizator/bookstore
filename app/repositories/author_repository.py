# app/repositories/author_repository.py
from typing import Optional, List

from sqlalchemy.orm import Session

from app.models import Author
from .base import BaseRepository


class AuthorRepository(BaseRepository[Author]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Author)

    def get_by_id(self, author_id: int) -> Optional[Author]:
        return self.get(author_id)

    def list_all(self) -> List[Author]:
        return self.list()
