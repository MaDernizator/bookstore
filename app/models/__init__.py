# app/models/__init__.py
from ..database import Base
from .user import User

__all__ = [
    "Base",
    "User",
]
