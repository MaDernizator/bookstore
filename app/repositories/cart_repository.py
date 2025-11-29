# app/repositories/cart_repository.py
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Cart, CartItem
from .base import BaseRepository


class CartRepository(BaseRepository[Cart]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Cart)

    def get_cart_by_user(self, user_id: int) -> Optional[Cart]:
        return (
            self.db.query(Cart)
            .filter(Cart.user_id == user_id)
            .first()
        )

    def create_cart_for_user(self, user_id: int) -> Cart:
        cart = Cart(user_id=user_id)
        self.db.add(cart)
        self.db.commit()
        self.db.refresh(cart)
        return cart

    def add_item(self, cart: Cart, book_id: int, quantity: int = 1) -> CartItem:
        # проверим, есть ли уже такая книга в корзине
        item = next((i for i in cart.items if i.book_id == book_id), None)
        if item:
            item.quantity += quantity
        else:
            item = CartItem(cart_id=cart.cart_id, book_id=book_id, quantity=quantity)
            self.db.add(item)

        self.db.commit()
        self.db.refresh(item)
        return item

    def update_item_quantity(self, item: CartItem, quantity: int) -> CartItem:
        item.quantity = quantity
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove_item(self, item: CartItem) -> None:
        self.db.delete(item)
        self.db.commit()

    def clear_cart(self, cart: Cart) -> None:
        for item in list(cart.items):
            self.db.delete(item)
        self.db.commit()
