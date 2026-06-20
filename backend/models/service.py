from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy import Numeric
from config.db import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True)

    name = Column(String(100), unique=True, nullable=False)

    unit = Column(String(20), nullable=False)

    price = Column(Numeric(precision=10, scale=2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    order_items = relationship(
        "OrderItem",
        back_populates="service"
    )
