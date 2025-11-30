# app/services/auth_service.py
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.models import User
from app.repositories import UserRepository
from app.schemas.auth import TokenData

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# --- Работа с паролем ---


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# --- JWT ---


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return TokenData(email=email)
    except JWTError:
        return None


# --- Работа с пользователями ---


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    repo = UserRepository(db)
    user = repo.get_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def register_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    phone: Optional[str] = None,
) -> User:
    repo = UserRepository(db)

    existing = repo.get_by_email(email)
    if existing:
        raise ValueError("User with this email already exists")

    hashed_password = get_password_hash(password)
    user_data = {
        "email": email,
        "password_hash": hashed_password,
        "full_name": full_name,
        "phone": phone,
        "is_admin": False,
    }
    user = repo.create(user_data)
    return user
