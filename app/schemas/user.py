# app/schemas/user.py
from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field  # добавили ConfigDict

from .address import AddressRead


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None


class UserRead(UserBase):
    user_id: int
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)


class UserProfile(UserRead):
    addresses: List[AddressRead] = []


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str
