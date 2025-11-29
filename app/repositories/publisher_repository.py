# app/repositories/publisher_repository.py
from typing import Optional, List

from sqlalchemy.orm import Session

from app.models import Publisher
from .base import BaseRepository


class PublisherRepository(BaseRepository[Publisher]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Publisher)

    def get_by_id(self, publisher_id: int) -> Optional[Publisher]:
        return self.get(publisher_id)

    def list_all(self) -> List[Publisher]:
        return self.list()
