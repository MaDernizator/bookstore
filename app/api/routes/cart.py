# app/api/routes/cart.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_current_user
from app.schemas.cart import CartRead, CartItemCreate, CartItemUpdate
from app.services import cart_service

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/", response_model=CartRead)
def get_my_cart(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    cart = cart_service.get_cart(db, current_user.user_id)
    return cart


@router.post("/items", response_model=CartRead, status_code=status.HTTP_201_CREATED)
def add_item(
    item_in: CartItemCreate,
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    cart = cart_service.add_item_to_cart(db, current_user.user_id, item_in)
    return cart


@router.patch("/items/{cart_item_id}", response_model=CartRead)
def update_item(
    cart_item_id: int,
    item_in: CartItemUpdate,
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    cart = cart_service.update_cart_item(
        db,
        current_user.user_id,
        cart_item_id,
        item_in,
    )
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )
    return cart


@router.delete("/items/{cart_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    cart_item_id: int,
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    ok = cart_service.remove_cart_item(
        db,
        current_user.user_id,
        cart_item_id,
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )
    return None


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_my_cart(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    cart_service.clear_cart(db, current_user.user_id)
    return None
