# app/schemas/admin.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserAdminRead(BaseModel):
    user_id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    is_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserAdminUpdate(BaseModel):
    is_admin: bool


class OrderStatusUpdate(BaseModel):
    status: str
