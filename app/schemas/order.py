# app/schemas/order.py
from datetime import datetime
from decimal import Decimal
from typing import List

from pydantic import BaseModel


class OrderItemRead(BaseModel):
    order_item_id: int
    book_id: int
    quantity: int
    price: Decimal

    class Config:
        orm_mode = True


class OrderRead(BaseModel):
    order_id: int
    user_id: int
    created_at: datetime
    total_amount: Decimal
    status: str
    items: List[OrderItemRead] = []

    class Config:
        orm_mode = True
