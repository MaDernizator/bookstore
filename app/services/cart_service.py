# app/services/cart_service.py
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Cart, CartItem
from app.repositories import CartRepository
from app.schemas.cart import CartItemCreate, CartItemUpdate


def _get_or_create_cart(db: Session, user_id: int) -> Cart:
    repo = CartRepository(db)
    cart = repo.get_cart_by_user(user_id)
    if not cart:
        cart = repo.create_cart_for_user(user_id)
    return cart


def get_cart(db: Session, user_id: int) -> Cart:
    return _get_or_create_cart(db, user_id)


def add_item_to_cart(
    db: Session,
    user_id: int,
    item_in: CartItemCreate,
) -> Cart:
    cart = _get_or_create_cart(db, user_id)
    repo = CartRepository(db)
    repo.add_item(cart, book_id=item_in.book_id, quantity=item_in.quantity)
    db.refresh(cart)
    return cart


def update_cart_item(
    db: Session,
    user_id: int,
    cart_item_id: int,
    item_in: CartItemUpdate,
) -> Optional[Cart]:
    repo = CartRepository(db)
    # найдём корзину и убедимся, что позиция принадлежит этому пользователю
    cart = repo.get_cart_by_user(user_id)
    if not cart:
        return None

    item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_item_id == cart_item_id,
            CartItem.cart_id == cart.cart_id,
        )
        .first()
    )
    if not item:
        return None

    repo.update_item_quantity(item, item_in.quantity)
    db.refresh(cart)
    return cart


def remove_cart_item(
    db: Session,
    user_id: int,
    cart_item_id: int,
) -> bool:
    repo = CartRepository(db)
    cart = repo.get_cart_by_user(user_id)
    if not cart:
        return False

    item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_item_id == cart_item_id,
            CartItem.cart_id == cart.cart_id,
        )
        .first()
    )
    if not item:
        return False

    repo.remove_item(item)
    return True


def clear_cart(db: Session, user_id: int) -> None:
    repo = CartRepository(db)
    cart = repo.get_cart_by_user(user_id)
    if cart:
        repo.clear_cart(cart)
