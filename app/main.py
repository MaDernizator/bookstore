# app/main.py
import os

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .api.router import api_router
from .database import SessionLocal, engine
from .models import Base
from .repositories import UserRepository
from .services.auth_service import get_password_hash

app = FastAPI(title="Bookstore")

# Ensure all database tables exist (create missing tables such as new Address)
Base.metadata.create_all(bind=engine)


def _create_default_admin() -> None:
    """Create the default admin user if it doesn't exist."""

    db = SessionLocal()
    try:
        repo = UserRepository(db)
        admin = repo.get_by_email("admin@example.com")
        if not admin:
            repo.create(
                {
                    "email": "admin@example.com",
                    "password_hash": get_password_hash("123456"),
                    "full_name": "Admin",
                    "phone": None,
                    "is_admin": True,
                }
            )
    finally:
        db.close()


_create_default_admin()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

app.mount(
    "/static",
    StaticFiles(directory=os.path.join(BASE_DIR, "static")),
    name="static",
)


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/books/{book_id}", response_class=HTMLResponse, include_in_schema=False)
def book_detail(book_id: int, request: Request):
    return templates.TemplateResponse(
        "book_detail.html",
        {"request": request, "book_id": book_id},
    )


@app.get("/cart", response_class=HTMLResponse, include_in_schema=False)
def cart_page(request: Request):
    return templates.TemplateResponse("cart.html", {"request": request})


@app.get("/login", response_class=HTMLResponse, include_in_schema=False)
def login_page(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})


@app.get("/register", response_class=HTMLResponse, include_in_schema=False)
def register_page(request: Request):
    return templates.TemplateResponse("auth/register.html", {"request": request})


@app.get("/admin", response_class=HTMLResponse, include_in_schema=False)
def admin_page(request: Request):
    return templates.TemplateResponse("admin/index.html", {"request": request})


@app.get("/orders", response_class=HTMLResponse, include_in_schema=False)
def orders_page(request: Request):
    return templates.TemplateResponse("orders.html", {"request": request})


@app.get("/profile", response_class=HTMLResponse, include_in_schema=False)
def profile_page(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})


app.include_router(api_router, prefix="/api")
