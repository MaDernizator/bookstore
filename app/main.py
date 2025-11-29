# app/main.py
import os
from fastapi import FastAPI, Request
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


@app.get("/", include_in_schema=False)
def read_root(request: Request):
    # временный простой шаблон
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "title": "Bookstore"},
    )


app.include_router(api_router, prefix="/api")
