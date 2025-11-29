# app/api/router.py
from fastapi import APIRouter

from app.api.routes import auth, books, cart, orders, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(books.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(admin.router)
