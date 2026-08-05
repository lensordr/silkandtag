from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class ProductBase(BaseModel):
    title: str
    description: str = ""
    brand: str = ""
    category: str = ""
    size: str = ""
    condition: str = "Muy bueno"
    color: str = ""
    price: float
    original_price: Optional[float] = None
    status: str = "available"


class ProductOut(ProductBase):
    id: int
    code: str = ""
    image_urls: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    condition: Optional[str] = None
    color: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    status: Optional[str] = None


class OrderItemIn(BaseModel):
    product_id: int


class OrderCreate(BaseModel):
    customer_name: str
    email: EmailStr
    phone: str = ""
    address_line: str
    city: str
    postal_code: str
    province: str = ""
    notes: str = ""
    items: List[OrderItemIn]


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    title: str
    code: str = ""
    price: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    customer_name: str
    email: str
    phone: str
    address_line: str
    city: str
    postal_code: str
    province: str
    notes: str
    status: str
    payment_provider: str
    payment_reference: str
    shipping_provider: str
    tracking_number: str
    subtotal: float
    shipping_cost: float
    total: float
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class PayOrderIn(BaseModel):
    source_id: str  # card token from the Square Web Payments SDK


class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_provider: Optional[str] = None
    payment_reference: Optional[str] = None


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
