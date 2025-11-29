# app/api/router.py
from fastapi import APIRouter

api_router = APIRouter()

# позже сюда будем подключать:
# from .routes import auth, books, cart, ...
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
