from pydantic import BaseModel
from typing import List
from schemas.order import StudentOrderResponse



class StudentCreate(BaseModel):
    username: str
    password: str
    roll_number: str
    name: str
    department: str | None = None
    hostel_name: str | None = None
    balance: float = 0


class StudentUpdate(BaseModel):
    roll_number: str | None = None
    name: str | None = None
    department: str | None = None
    hostel_name: str | None = None
    balance: float | None = None


class StudentResponse(BaseModel):
    id: int
    user_id: int
    username: str
    roll_number: str
    name: str
    department: str | None
    hostel_name: str | None
    balance: float

    class Config:
        from_attributes = True


class StudentDashboardDataResponse(BaseModel):
    profile: StudentResponse
    all_orders: List[StudentOrderResponse]
    recent_orders: List[StudentOrderResponse]



class TopUpRequest(BaseModel):
    amount: float