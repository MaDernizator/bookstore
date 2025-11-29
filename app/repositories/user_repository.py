# app/repositories/user_repository.py
from typing import Optional

from sqlalchemy.orm import Session

from app.models import User
from .base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, User)

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.get(user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.email == email)
            .first()
        )
