from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
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
    discount_amount = Column(Float, default=0.0)
    promo_code = Column(String, default="")
    total = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Random per-order secret. Required (in addition to the sequential id) to
    # fetch or pay this order, so order ids can't be enumerated by guessing
    # small integers to read other customers' names/addresses/emails.
    access_token = Column(String, default="", index=True)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class PromoCode(Base):
    """Discount codes handed out manually by the admin, mainly for the
    Instagram-tag reward: customer tags @silkandtag on a story/post after
    receiving their order, admin creates a one-time 10% code for them here.
    Not self-service -- there is no automatic Instagram verification, the
    admin decides when a tag qualifies."""
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    instagram_username = Column(String, default="")  # who it was issued to, for admin reference
    discount_percent = Column(Float, default=10.0)
    max_uses = Column(Integer, default=1)
    used_count = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


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
