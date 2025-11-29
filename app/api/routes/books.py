# app/api/routes/books.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_current_admin
from app.schemas.book import BookCreate, BookRead, BookUpdate
from app.services import catalog_service

router = APIRouter(prefix="/books", tags=["books"])


@router.get("/", response_model=List[BookRead])
def list_books(
    q: Optional[str] = Query(None, description="Поиск по названию"),
    genre_id: Optional[int] = Query(None),
    author_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session),
):
    books = catalog_service.list_books(
        db=db,
        skip=skip,
        limit=limit,
        q=q,
        genre_id=genre_id,
        author_id=author_id,
    )
    return books


@router.get("/{book_id}", response_model=BookRead)
def get_book(
    book_id: int,
    db: Session = Depends(get_db_session),
):
    book = catalog_service.get_book(db, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    return book


# --- Админские операции ---


@router.post("/", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(
    book_in: BookCreate,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    return catalog_service.create_book(db, book_in)


@router.put("/{book_id}", response_model=BookRead)
def update_book(
    book_id: int,
    book_in: BookUpdate,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    book = catalog_service.get_book(db, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    return catalog_service.update_book(db, book, book_in)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db_session),
    admin=Depends(get_current_admin),
):
    book = catalog_service.get_book(db, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    catalog_service.delete_book(db, book)
    return None
