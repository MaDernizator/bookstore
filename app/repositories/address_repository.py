from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Address
from .base import BaseRepository


class AddressRepository(BaseRepository[Address]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Address)

    def list_by_user(self, user_id: int) -> List[Address]:
        return (
            self.db.query(Address)
            .filter(Address.user_id == user_id)
            .order_by(Address.is_default.desc(), Address.address_id.asc())
            .all()
        )

    def get_for_user(self, user_id: int, address_id: int) -> Optional[Address]:
        return (
            self.db.query(Address)
            .filter(Address.user_id == user_id, Address.address_id == address_id)
            .first()
        )

    def unset_default_for_user(self, user_id: int) -> None:
        self.db.query(Address).filter(Address.user_id == user_id, Address.is_default.is_(True)).update(
            {Address.is_default: False}
        )
        self.db.commit()
