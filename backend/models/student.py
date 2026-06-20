from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import Numeric

from config.db import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    roll_number = Column(String(20), unique=True, nullable=False)

    name = Column(String(100), nullable=False)

    department = Column(String(100))

    hostel_name = Column(String(100))

    balance = Column(Numeric(precision=10, scale=2), default=0.00)

    user = relationship(
        "User",
        back_populates="student"
    )

    orders = relationship(
        "Order",
        back_populates="student"
    )

    @property
    def username(self):
        return self.user.username if self.user else None
