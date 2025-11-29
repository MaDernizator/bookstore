from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


class Book(Base):
    __tablename__ = "books"

    book_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    publication_year = Column(Integer, nullable=True)
    pages = Column(Integer, nullable=True)
    isbn = Column(String(50), unique=True, nullable=True)

    cover_image = Column(String, nullable=True)

    genre_id = Column(Integer, ForeignKey("genres.genre_id"), nullable=True)
    publisher_id = Column(Integer, ForeignKey("publishers.publisher_id"), nullable=True)

    genre = relationship("Genre", backref="books")
    publisher = relationship("Publisher", backref="books")

    authors = relationship(
        "Author",
        secondary="book_authors",
        backref="books",
    )
