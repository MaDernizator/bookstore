from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.book import BookRead


class CartItemBase(BaseModel):
    book_id: int
    quantity: int


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemRead(BaseModel):
    cart_item_id: int
    book_id: int
    quantity: int
    # Вложенный объект книги, чтобы на фронте видеть название и цену
    book: Optional[BookRead] = None

    model_config = ConfigDict(from_attributes=True)


class CartRead(BaseModel):
    items: List[CartItemRead]

    model_config = ConfigDict(from_attributes=True)
