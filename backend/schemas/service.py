from pydantic import BaseModel
from decimal import Decimal
class ServiceCreate(BaseModel):
    name: str
    unit: str
    price: float


class ServiceUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    price: float | None = None


class ServiceResponse(BaseModel):
    id: int
    name: str
    unit: str
    price: Decimal
    is_active: bool = True

    class Config:
        from_attributes = True