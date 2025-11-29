# app/main.py
import os

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .api.router import api_router

app = FastAPI(title="Bookstore")

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


app.include_router(api_router, prefix="/api")
