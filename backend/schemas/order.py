from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models.enums import OrderStatus


class OrderItemServiceResponse(BaseModel):
    name: str
    class Config:
        from_attributes = True


class OrderItemCreate(BaseModel):
    service_id: int
    quantity: float


class OrderItemResponse(BaseModel):
    quantity: float
    unit_price: float
    subtotal: float 
    service: OrderItemServiceResponse

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    student_id: int
    items: List[OrderItemCreate]

class StudentOrderResponse(BaseModel):
    id: int
    total_amount: float
    status: OrderStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: list[OrderItemResponse]

    class Config:
        from_attributes = True

class StudentSummaryResponse(BaseModel):
    name: str
    roll_number: str
    hostel_name: str

    class Config:
        from_attributes = True

class AttendantOrderResponse(BaseModel):
    id: int
    total_amount: float
    status: OrderStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    student: StudentSummaryResponse
    attendant_name: str

    items: list[OrderItemResponse]

    class Config:
        from_attributes = True
        
class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderStatusResponse(BaseModel):
    id: int
    status: OrderStatus

    class Config:
        from_attributes = True
