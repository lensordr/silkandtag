from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, default="")  # internal SKU e.g. ST-0007, shown to admin for packing
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    brand = Column(String, default="")
    category = Column(String, default="")  # e.g. Chaquetas, Vestidos, Camisas, Pantalones, Zapatos, Bolsos, Accesorios
    size = Column(String, default="")
    condition = Column(String, default="Muy bueno")  # Como nuevo, Muy bueno, Bueno, Aceptable
    color = Column(String, default="")
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    status = Column(String, default="available")  # available, sold, reserved
    image_urls = Column(Text, default="")  # comma-separated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def images_list(self):
        return [u for u in (self.image_urls or "").split(",") if u]


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, default="")
    address_line = Column(String, nullable=False)
    city = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    province = Column(String, default="")
    notes = Column(Text, default="")

    status = Column(String, default="pending_payment")
    # pending_payment -> paid -> shipped -> delivered -> cancelled
    payment_provider = Column(String, default="manual")  # will become "square"
    payment_reference = Column(String, default="")
    shipping_provider = Column(String, default="")  # to be set once carrier is integrated
    tracking_number = Column(String, default="")

    subtotal = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Random per-order secret. Required (in addition to the sequential id) to
    # fetch or pay this order, so order ids can't be enumerated by guessing
    # small integers to read other customers' names/addresses/emails.
    access_token = Column(String, default="", index=True)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    title = Column(String)
    code = Column(String, default="")  # snapshot of the product code at order time, for packing
    price = Column(Float)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
