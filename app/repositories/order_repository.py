# app/repositories/order_repository.py
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Order, OrderItem, Cart
from .base import BaseRepository


class OrderRepository(BaseRepository[Order]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Order)

    def get_by_id(self, order_id: int) -> Optional[Order]:
        return self.get(order_id)

    def list_by_user(self, user_id: int) -> List[Order]:
        return (
            self.db.query(Order)
            .filter(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
            .all()
        )

    def create_from_cart(self, user_id: int, cart: Cart) -> Order:
        # считаем сумму
        total_amount = 0
        for item in cart.items:
            total_amount += float(item.book.price) * item.quantity  # type: ignore[operator]

        order = Order(
            user_id=user_id,
            total_amount=total_amount,
            status="created",
        )
        self.db.add(order)
        self.db.flush()  # чтобы получить order_id до коммита

        for item in cart.items:
            order_item = OrderItem(
                order_id=order.order_id,
                book_id=item.book_id,
                quantity=item.quantity,
                price=item.book.price,
            )
            self.db.add(order_item)

        # очищаем корзину
        for item in list(cart.items):
            self.db.delete(item)

        self.db.commit()
        self.db.refresh(order)
        return order
