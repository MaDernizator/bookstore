from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AddressBase(BaseModel):
    city: str = Field(..., min_length=2, max_length=255)
    street: str = Field(..., min_length=2, max_length=255)
    house: str = Field(..., min_length=1, max_length=50)
    postal_code: str = Field(..., min_length=3, max_length=20)
    is_default: Optional[bool] = False


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    city: Optional[str] = Field(None, min_length=2, max_length=255)
    street: Optional[str] = Field(None, min_length=2, max_length=255)
    house: Optional[str] = Field(None, min_length=1, max_length=50)
    postal_code: Optional[str] = Field(None, min_length=3, max_length=20)
    is_default: Optional[bool] = None


class AddressRead(AddressBase):
    address_id: int

    model_config = ConfigDict(from_attributes=True)
