from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    ForeignKey,
    DateTime,
    Enum as SQLEnum,
    func
)

from sqlalchemy.orm import relationship
from datetime import datetime,UTC
from models.enums import OrderStatus
from config.db import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    attendant_id = Column(
        Integer,
        ForeignKey("attendants.id"),
        nullable=False
    )

    total_amount = Column(Float, default=0)

    status = Column(
    SQLEnum(OrderStatus),
    nullable=False,
    default=OrderStatus.QUEUE
)

    created_at = Column(DateTime, default=func.now(), server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), server_default=func.now(), onupdate=func.now())
    
    student = relationship(
        "Student",
        back_populates="orders"
    )

    attendant = relationship(
        "Attendant",
        back_populates="orders"
    )

    items = relationship(
        "OrderItem",
        back_populates="order"
    )

    @property
    def attendant_name(self):
        return self.attendant.name if self.attendant else None
