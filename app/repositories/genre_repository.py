# app/repositories/genre_repository.py
from typing import Optional, List

from sqlalchemy.orm import Session

from app.models import Genre
from .base import BaseRepository


class GenreRepository(BaseRepository[Genre]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Genre)

    def get_by_id(self, genre_id: int) -> Optional[Genre]:
        return self.get(genre_id)

    def get_by_name(self, name: str) -> Optional[Genre]:
        return self.db.query(Genre).filter(Genre.name == name).first()

    def list_all(self) -> List[Genre]:
        return self.list()
