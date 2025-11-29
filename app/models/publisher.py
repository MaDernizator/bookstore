from sqlalchemy import Column, Integer, String
from ..database import Base


class Publisher(Base):
    __tablename__ = "publishers"

    publisher_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
