# app/services/order_service.py
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Order, Cart
from app.repositories import CartRepository, OrderRepository


def create_order_from_cart(db: Session, user_id: int) -> Optional[Order]:
    cart_repo = CartRepository(db)
    order_repo = OrderRepository(db)

    cart: Optional[Cart] = cart_repo.get_cart_by_user(user_id)
    if not cart or not cart.items:
        return None

    order = order_repo.create_from_cart(user_id=user_id, cart=cart)
    return order


def list_orders_for_user(db: Session, user_id: int) -> List[Order]:
    repo = OrderRepository(db)
    return repo.list_by_user(user_id)


def get_order_for_user(
    db: Session,
    user_id: int,
    order_id: int,
) -> Optional[Order]:
    repo = OrderRepository(db)
    order = repo.get_by_id(order_id)
    if not order or order.user_id != user_id:
        return None
    return order
