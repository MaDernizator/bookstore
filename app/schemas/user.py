# app/schemas/user.py
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict  # добавили ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    user_id: int
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)
