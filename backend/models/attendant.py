from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from config.db import Base


class Attendant(Base):
    __tablename__ = "attendants"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    name = Column(String(100), nullable=False)

    phone = Column(String(15))

    user = relationship(
        "User",
        back_populates="attendant"
    )

    orders = relationship(
        "Order",
        back_populates="attendant"
    )

    @property
    def username(self):
        return self.user.username if self.user else None
