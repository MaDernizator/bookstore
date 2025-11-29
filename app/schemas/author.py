# app/schemas/author.py
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuthorBase(BaseModel):
    full_name: str


class AuthorCreate(AuthorBase):
    pass


class AuthorUpdate(BaseModel):
    full_name: Optional[str] = None


class AuthorRead(AuthorBase):
    author_id: int

    model_config = ConfigDict(from_attributes=True)
