# app/schemas/order.py
from datetime import datetime
from decimal import Decimal
from typing import List

from pydantic import BaseModel, ConfigDict


class OrderItemRead(BaseModel):
    order_item_id: int
    book_id: int
    quantity: int
    price: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderRead(BaseModel):
    order_id: int
    user_id: int
    created_at: datetime
    total_amount: Decimal
    status: str
    items: List[OrderItemRead] = []

    model_config = ConfigDict(from_attributes=True)
