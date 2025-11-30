from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.repositories import AddressRepository, UserRepository
from app.schemas.address import AddressCreate, AddressRead, AddressUpdate
from app.schemas.user import PasswordUpdate, UserProfile, UserUpdate
from app.services import auth_service

router = APIRouter(prefix="/users", tags=["users"])


def _validate_password_complexity(password: str) -> None:
    has_length = len(password) >= 8
    has_letter = any(ch.isalpha() for ch in password)
    has_digit = any(ch.isdigit() for ch in password)
    has_special = any(not ch.isalnum() for ch in password)
    if not (has_length and has_letter and has_digit and has_special):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль должен быть не короче 8 символов и содержать буквы, цифры и специальный символ",
        )


def _serialize_profile(user, addresses) -> UserProfile:
    return UserProfile(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        is_admin=user.is_admin,
        addresses=addresses,
    )


@router.get("/me", response_model=UserProfile)
def get_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    address_repo = AddressRepository(db)
    addresses = address_repo.list_by_user(current_user.user_id)
    return _serialize_profile(current_user, addresses)


@router.put("/me", response_model=UserProfile)
def update_profile(
    payload: UserUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    repo = UserRepository(db)
    existing = repo.get_by_email(payload.email)
    if existing and existing.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    updated = repo.update(
        current_user,
        {
            "email": payload.email,
            "full_name": payload.full_name,
            "phone": payload.phone,
        },
    )

    addresses = AddressRepository(db).list_by_user(updated.user_id)
    return _serialize_profile(updated, addresses)


@router.post("/me/password")
def change_password(
    payload: PasswordUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    if not auth_service.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )

    _validate_password_complexity(payload.new_password)

    current_user.password_hash = auth_service.get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()

    return {"detail": "Пароль обновлён"}


@router.get("/me/addresses", response_model=List[AddressRead])
def list_addresses(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    repo = AddressRepository(db)
    return repo.list_by_user(current_user.user_id)


@router.post("/me/addresses", response_model=AddressRead, status_code=status.HTTP_201_CREATED)
def create_address(
    payload: AddressCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    repo = AddressRepository(db)
    should_be_default = payload.is_default or not repo.list_by_user(current_user.user_id)
    if should_be_default:
        repo.unset_default_for_user(current_user.user_id)

    data = payload.model_dump()
    data["user_id"] = current_user.user_id
    data["is_default"] = bool(should_be_default)
    return repo.create(data)


@router.put("/me/addresses/{address_id}", response_model=AddressRead)
def update_address(
    address_id: int,
    payload: AddressUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    repo = AddressRepository(db)
    db_obj = repo.get_for_user(current_user.user_id, address_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Адрес не найден")

    update_data = payload.model_dump(exclude_unset=True)
    make_default = update_data.get("is_default") is True

    if make_default:
        repo.unset_default_for_user(current_user.user_id)
    elif update_data.get("is_default") is False and db_obj.is_default:
        # если убираем признак по умолчанию, но других адресов нет — оставляем
        other_addresses = [a for a in repo.list_by_user(current_user.user_id) if a.address_id != address_id]
        if not other_addresses:
            update_data.pop("is_default", None)

    updated = repo.update(db_obj, update_data)
    return updated


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    repo = AddressRepository(db)
    db_obj = repo.get_for_user(current_user.user_id, address_id)
    if not db_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Адрес не найден")

    was_default = db_obj.is_default
    repo.delete(db_obj)

    if was_default:
        remaining = repo.list_by_user(current_user.user_id)
        if remaining:
            repo.unset_default_for_user(current_user.user_id)
            first = remaining[0]
            repo.update(first, {"is_default": True})

    return None
