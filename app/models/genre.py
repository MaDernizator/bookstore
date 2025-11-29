from sqlalchemy import Column, Integer, String
from ..database import Base


class Genre(Base):
    __tablename__ = "genres"

    genre_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
