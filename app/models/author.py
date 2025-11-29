from sqlalchemy import Column, Integer, String
from ..database import Base


class Author(Base):
    __tablename__ = "authors"

    author_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
