# app/api/routes/dicts.py
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.genre import GenreRead
from app.schemas.author import AuthorRead
from app.schemas.publisher import PublisherRead
from app.services import admin_service

router = APIRouter(prefix="/dicts", tags=["dicts"])


@router.get("/genres", response_model=List[GenreRead])
def list_genres(db: Session = Depends(get_db_session)):
    return admin_service.list_genres(db)


@router.get("/authors", response_model=List[AuthorRead])
def list_authors(db: Session = Depends(get_db_session)):
    return admin_service.list_authors(db)


@router.get("/publishers", response_model=List[PublisherRead])
def list_publishers(db: Session = Depends(get_db_session)):
    return admin_service.list_publishers(db)
