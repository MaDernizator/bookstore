# app/schemas/genre.py
from typing import Optional
from pydantic import BaseModel, ConfigDict


class GenreBase(BaseModel):
    name: str


class GenreCreate(GenreBase):
    pass


class GenreUpdate(BaseModel):
    name: Optional[str] = None


class GenreRead(GenreBase):
    genre_id: int

    model_config = ConfigDict(from_attributes=True)
