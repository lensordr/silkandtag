import os
import shutil
import uuid
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models, schemas, auth, square_client
from .db import Base, engine, get_db

Base.metadata.create_all(bind=engine)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Silk & Tag API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def require_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.split(" ", 1)[1]
    payload = auth.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Sesion invalida o expirada")
    return payload


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "silk-and-tag-api"}


# ---------- Auth ----------
@app.post("/api/admin/login", response_model=schemas.LoginOut)
def login(data: schemas.LoginIn):
    if not auth.verify_credentials(data.username, data.password):
        raise HTTPException(status_code=401, detail="Usuario o contrasena incorrectos")
    return {"token": auth.create_token(data.username)}


# ---------- Public products ----------
@app.get("/api/products", response_model=List[schemas.ProductOut])
def list_products(
    category: Optional[str] = None,
    size: Optional[str] = None,
    status: Optional[str] = "available",
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Product)
    if status:
        query = query.filter(models.Product.status == status)
    if category:
        query = query.filter(models.Product.category == category)
    if size:
        query = query.filter(models.Product.size == size)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Product.title.ilike(like)) | (models.Product.brand.ilike(like))
        )
    return query.order_by(models.Product.created_at.desc()).all()


@app.get("/api/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


# ---------- Admin products ----------
@app.get("/api/admin/products", response_model=List[schemas.ProductOut])
def admin_list_products(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()


@app.post("/api/admin/products", response_model=schemas.ProductOut)
def create_product(
    title: str = Form(...),
    description: str = Form(""),
    brand: str = Form(""),
    category: str = Form(""),
    size: str = Form(""),
    condition: str = Form("Muy bueno"),
    color: str = Form(""),
    price: float = Form(...),
    original_price: Optional[float] = Form(None),
    status: str = Form("available"),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    image_urls = []
    for img in images:
        if not img.filename:
            continue
        ext = os.path.splitext(img.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, fname)
        with open(dest, "wb") as f:
            shutil.copyfileobj(img.file, f)
        image_urls.append(f"/uploads/{fname}")

    product = models.Product(
        title=title,
        description=description,
        brand=brand,
        category=category,
        size=size,
        condition=condition,
        color=color,
        price=price,
        original_price=original_price,
        status=status,
        image_urls=",".join(image_urls),
    )
    db.add(product)
    db.flush()
    product.code = f"ST-{product.id:04d}"
    db.commit()
    db.refresh(product)
    return product


@app.put("/api/admin/products/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    original_price: Optional[float] = Form(None),
    status: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    replace_images: bool = Form(False),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for field, value in [
        ("title", title), ("description", description), ("brand", brand),
        ("category", category), ("size", size), ("condition", condition),
        ("color", color), ("price", price), ("original_price", original_price),
        ("status", status),
    ]:
        if value is not None:
            setattr(product, field, value)

    new_urls = []
    for img in images:
        if not img.filename:
            continue
        ext = os.path.splitext(img.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, fname)
        with open(dest, "wb") as f:
            shutil.copyfileobj(img.file, f)
        new_urls.append(f"/uploads/{fname}")

    if new_urls:
        if replace_images:
            product.image_urls = ",".join(new_urls)
        else:
            existing = product.images_list()
            product.image_urls = ",".join(existing + new_urls)

    db.commit()
    db.refresh(product)
    return product


@app.delete("/api/admin/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(product)
    db.commit()
    return {"ok": True}


# ---------- Orders ----------
SHIPPING_FLAT_RATE = 4.95


@app.post("/api/orders", response_model=schemas.OrderOut)
def create_order(data: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail="El pedido no tiene articulos")

    products = []
    subtotal = 0.0
    for item in data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
        if product.status != "available":
            raise HTTPException(status_code=400, detail=f"'{product.title}' ya no esta disponible")
        products.append(product)
        subtotal += product.price

    shipping_cost = SHIPPING_FLAT_RATE
    order = models.Order(
        customer_name=data.customer_name,
        email=data.email,
        phone=data.phone,
        address_line=data.address_line,
        city=data.city,
        postal_code=data.postal_code,
        province=data.province,
        notes=data.notes,
        status="pending_payment",
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        total=subtotal + shipping_cost,
    )
    db.add(order)
    db.flush()

    for product in products:
        db.add(models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            title=product.title,
            code=product.code,
            price=product.price,
        ))
        product.status = "reserved"

    db.commit()
    db.refresh(order)
    return order


@app.get("/api/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


@app.post("/api/orders/{order_id}/pay", response_model=schemas.OrderOut)
def pay_order(order_id: int, data: schemas.PayOrderIn, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if order.status != "pending_payment":
        raise HTTPException(status_code=400, detail="Este pedido ya no esta pendiente de pago")

    try:
        payment = square_client.create_payment(
            source_id=data.source_id,
            amount_eur=order.total,
            reference_id=str(order.id),
            note=f"Silk & Tag pedido #{order.id}",
        )
    except square_client.SquarePaymentError as e:
        raise HTTPException(status_code=402, detail=str(e))

    payment_status = payment.get("status")
    if payment_status in ("COMPLETED", "APPROVED"):
        order.status = "paid"
        order.payment_provider = "square"
        order.payment_reference = payment.get("id", "")
        for item in order.items:
            if item.product and item.product.status != "sold":
                item.product.status = "sold"
        db.commit()
        db.refresh(order)
        return order

    raise HTTPException(status_code=402, detail=f"El pago no se pudo completar (estado: {payment_status})")


@app.post("/api/webhooks/square")
async def square_webhook(request: Request, db: Session = Depends(get_db)):
    """Fallback auto-reconciliation: Square calls this when a payment status
    changes asynchronously (captures, refunds, disputes). Matches the
    payment's reference_id back to our internal order id -- no manual
    lookup needed. Requires a public HTTPS URL registered in the Square
    dashboard once the site is deployed; safe to leave unused on localhost."""
    body = await request.body()

    if square_client.SQUARE_WEBHOOK_SIGNATURE_KEY:
        signature = request.headers.get("x-square-hmacsha256-signature", "")
        if not square_client.verify_webhook_signature(str(request.url), body, signature):
            raise HTTPException(status_code=401, detail="Firma de webhook invalida")

    payload = await request.json()
    event_type = payload.get("type", "")

    if event_type == "payment.updated":
        payment = payload.get("data", {}).get("object", {}).get("payment", {})
        reference_id = payment.get("reference_id")
        square_status = payment.get("status")
        if reference_id:
            order = db.query(models.Order).filter(models.Order.id == int(reference_id)).first()
            if order:
                if square_status in ("COMPLETED", "APPROVED") and order.status == "pending_payment":
                    order.status = "paid"
                    order.payment_provider = "square"
                    order.payment_reference = payment.get("id", "")
                    for item in order.items:
                        if item.product and item.product.status != "sold":
                            item.product.status = "sold"
                elif square_status == "FAILED" and order.status == "pending_payment":
                    order.payment_provider = "square"
                elif square_status == "CANCELED" and order.status == "pending_payment":
                    order.payment_provider = "square"
                db.commit()

    return {"ok": True}


@app.get("/api/admin/orders", response_model=List[schemas.OrderOut])
def admin_list_orders(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()


@app.put("/api/admin/orders/{order_id}", response_model=schemas.OrderOut)
def admin_update_order(
    order_id: int,
    data: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if data.status is not None:
        order.status = data.status
        if data.status == "cancelled":
            for item in order.items:
                if item.product:
                    item.product.status = "available"
        if data.status in ("paid", "shipped", "delivered"):
            for item in order.items:
                if item.product and item.product.status != "sold":
                    item.product.status = "sold"
    if data.tracking_number is not None:
        order.tracking_number = data.tracking_number
    if data.shipping_provider is not None:
        order.shipping_provider = data.shipping_provider
    if data.payment_reference is not None:
        order.payment_reference = data.payment_reference

    db.commit()
    db.refresh(order)
    return order


@app.delete("/api/admin/orders/{order_id}")
def admin_delete_order(order_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(order)
    db.commit()
    return {"ok": True}
