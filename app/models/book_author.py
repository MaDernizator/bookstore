from sqlalchemy import Column, Integer, ForeignKey, PrimaryKeyConstraint
from ..database import Base


class BookAuthor(Base):
    __tablename__ = "book_authors"

    book_id = Column(Integer, ForeignKey("books.book_id"), nullable=False)
    author_id = Column(Integer, ForeignKey("authors.author_id"), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("book_id", "author_id", name="pk_book_author"),
    )
