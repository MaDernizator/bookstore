# app/schemas/publisher.py
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PublisherBase(BaseModel):
    name: str


class PublisherCreate(PublisherBase):
    pass


class PublisherUpdate(BaseModel):
    name: Optional[str] = None


class PublisherRead(PublisherBase):
    publisher_id: int

    model_config = ConfigDict(from_attributes=True)
