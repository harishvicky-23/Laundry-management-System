from sqlalchemy import Column, Integer, String, Enum as SQLEnum
from sqlalchemy.orm import relationship
from models.enums import UserRole

from config.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(50), unique=True, nullable=False)

    password = Column(String(255), nullable=False)

    role = Column(SQLEnum(UserRole), nullable=False)

    student = relationship(
        "Student",
        back_populates="user",
        uselist=False
    )

    attendant = relationship(
        "Attendant",
        back_populates="user",
        uselist=False
    )

