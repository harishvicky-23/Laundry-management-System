from sqlalchemy import (
    Column,
    Integer,
    Float,
    ForeignKey
)
from sqlalchemy.orm import relationship

from config.db import Base


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)

    order_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False
    )

    service_id = Column(
        Integer,
        ForeignKey("services.id"),
        nullable=False
    )

    quantity = Column(Float, nullable=False)

    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)


    order = relationship(
        "Order",
        back_populates="items"
    )

    service = relationship(
        "Service",
        back_populates="order_items"
    )