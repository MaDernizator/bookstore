# app/api/router.py
from fastapi import APIRouter

from app.api.routes import auth, books

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(books.router)
