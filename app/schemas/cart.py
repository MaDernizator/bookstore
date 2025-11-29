# app/schemas/cart.py
from typing import List
from pydantic import BaseModel, ConfigDict


class CartItemBase(BaseModel):
    book_id: int
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemRead(BaseModel):
    cart_item_id: int
    book_id: int
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class CartRead(BaseModel):
    cart_id: int
    items: List[CartItemRead] = []

    model_config = ConfigDict(from_attributes=True)
