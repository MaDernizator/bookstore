# app/api/routes/__init__.py
from . import auth  # чтобы можно было импортировать в router.py

__all__ = ["auth", "books"]
