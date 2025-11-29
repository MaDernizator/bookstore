# app/api/routes/orders.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_current_user
from app.schemas.order import OrderRead
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    order = order_service.create_order_from_cart(db, current_user.user_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty",
        )
    return order


@router.get("/", response_model=List[OrderRead])
def list_my_orders(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    orders = order_service.list_orders_for_user(db, current_user.user_id)
    return orders


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: int,
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    order = order_service.get_order_for_user(
        db,
        current_user.user_id,
        order_id,
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    return order
