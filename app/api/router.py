from fastapi import APIRouter

from app.api.routes import auth, books, cart, orders, admin, dicts, users

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(books.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(admin.router)
api_router.include_router(dicts.router)
api_router.include_router(users.router)
