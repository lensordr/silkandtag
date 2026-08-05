import io
import os
import secrets
import shutil
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import models, schemas, auth, square_client, email_client
from .db import Base, engine, get_db

Base.metadata.create_all(bind=engine)


def _ensure_column(table: str, column: str, ddl_type: str):
    """Idempotent, cross-DB (SQLite + Postgres) "add column if missing".
    SQLAlchemy's create_all() only creates brand-new tables, it never alters
    existing ones, so schema additions need this on every boot."""
    with engine.connect() as conn:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
            conn.commit()
        except Exception:
            pass  # column already exists


_ensure_column("orders", "access_token", "VARCHAR DEFAULT ''")
_ensure_column("orders", "promo_code", "VARCHAR DEFAULT ''")
_ensure_column("orders", "discount_amount", "FLOAT DEFAULT 0.0")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Silk & Tag API")

# Only these origins may call the API from a browser. Wildcard "*" was
# removed: it combined with allow_credentials to accept any site, which
# would let a malicious page piggyback logged-in admin requests.
DEFAULT_ORIGINS = (
    "https://www.silkandtag.com,https://silkandtag.com,"
    "https://silkandtag-gamma.vercel.app,"
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3020,http://127.0.0.1:3020"
)
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,  # auth uses a Bearer header, not cookies -- no credentials needed
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


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------- Login rate limiting (in-memory; single dyno) ----------
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 15 * 60
_login_attempts: dict[str, list[float]] = defaultdict(list)


def check_login_rate_limit(ip: str):
    now = time.time()
    attempts = _login_attempts[ip]
    attempts[:] = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
    if len(attempts) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Intentalo de nuevo en unos minutos.")


def record_login_failure(ip: str):
    _login_attempts[ip].append(time.time())


def record_login_success(ip: str):
    _login_attempts.pop(ip, None)


# ---------- Stale reservation cleanup ----------
# A checkout that starts but is never paid would otherwise lock that product
# as "reserved" forever, since nothing else ever reverted it. Self-heals on
# every read/write instead of needing a separate scheduled job/dyno.
RESERVATION_TIMEOUT_MINUTES = 10


def expire_stale_reservations(db: Session):
    cutoff = datetime.utcnow() - timedelta(minutes=RESERVATION_TIMEOUT_MINUTES)
    stale_orders = (
        db.query(models.Order)
        .filter(models.Order.status == "pending_payment", models.Order.created_at < cutoff)
        .all()
    )
    if not stale_orders:
        return
    for order in stale_orders:
        order.status = "expired"
        for item in order.items:
            if item.product and item.product.status == "reserved":
                item.product.status = "available"
    db.commit()


# ---------- Upload validation ----------
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


CLOUDINARY_ENABLED = bool(os.environ.get("CLOUDINARY_CLOUD_NAME"))
if CLOUDINARY_ENABLED:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )


def save_upload(img: UploadFile) -> str:
    data = img.file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen supera el tamano maximo (8MB)")
    try:
        with Image.open(io.BytesIO(data)) as im:
            im.verify()  # confirms it's really a decodable image, not just a renamed file
            detected_format = im.format
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=400, detail="El archivo no es una imagen valida")

    if CLOUDINARY_ENABLED:
        result = cloudinary.uploader.upload(
            io.BytesIO(data),
            folder="silkandtag/products",
            public_id=uuid.uuid4().hex,
            resource_type="image",
        )
        return result["secure_url"]

    ext = ALLOWED_IMAGE_TYPES.get(img.content_type)
    if not ext:
        ext = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}.get(detected_format or "", ".jpg")

    fname = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, fname)
    with open(dest, "wb") as f:
        f.write(data)
    return f"/uploads/{fname}"


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "silk-and-tag-api"}


# ---------- Auth ----------
@app.post("/api/admin/login", response_model=schemas.LoginOut)
def login(data: schemas.LoginIn, request: Request):
    ip = client_ip(request)
    check_login_rate_limit(ip)
    if not auth.verify_credentials(data.username, data.password):
        record_login_failure(ip)
        raise HTTPException(status_code=401, detail="Usuario o contrasena incorrectos")
    record_login_success(ip)
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
    expire_stale_reservations(db)
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
    expire_stale_reservations(db)
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
    image_urls = [save_upload(img) for img in images if img.filename]

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

    new_urls = [save_upload(img) for img in images if img.filename]

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
SHIPPING_RATES = {"correos": 4.95, "seur": 6.95}
DEFAULT_SHIPPING_METHOD = "correos"
FREE_SHIPPING_THRESHOLD = 80.0


def require_order_access(order: models.Order, token: str):
    """Order ids are small sequential integers and easy to guess/enumerate.
    A random per-order token (known only to whoever created/paid the order)
    is required to read or pay it, so a stranger can't browse other
    customers' names, emails, phone numbers and addresses. 404 (not 403) on
    mismatch, so it doesn't even confirm the order id exists."""
    if not order.access_token or not token or not secrets.compare_digest(order.access_token, token):
        raise HTTPException(status_code=404, detail="Pedido no encontrado")


def _find_valid_promo(db: Session, raw_code: str):
    """Looks up a promo code and returns (promo, error_message). error_message
    is empty when the code is usable. Centralised so the checkout-time
    validate endpoint and the actual order-creation discount use identical
    rules."""
    code = (raw_code or "").strip().upper()
    if not code:
        return None, ""
    promo = db.query(models.PromoCode).filter(models.PromoCode.code == code).first()
    if not promo:
        return None, "Codigo no valido"
    if not promo.active:
        return None, "Este codigo ya no esta activo"
    if promo.used_count >= promo.max_uses:
        return None, "Este codigo ya ha sido utilizado"
    if promo.expires_at and datetime.utcnow() > promo.expires_at:
        return None, "Este codigo ha caducado"
    return promo, ""


@app.post("/api/promocodes/validate", response_model=schemas.PromoValidateOut)
def validate_promocode(data: schemas.PromoValidateIn, db: Session = Depends(get_db)):
    """Public, no auth -- lets the checkout page preview the discount before
    the customer submits the order."""
    promo, error = _find_valid_promo(db, data.code)
    if error:
        return schemas.PromoValidateOut(valid=False, message=error)
    if not promo:
        return schemas.PromoValidateOut(valid=False, message="Codigo no valido")
    return schemas.PromoValidateOut(valid=True, discount_percent=promo.discount_percent)


@app.post("/api/orders", response_model=schemas.OrderOut)
def create_order(data: schemas.OrderCreate, db: Session = Depends(get_db)):
    expire_stale_reservations(db)

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

    promo = None
    discount_amount = 0.0
    promo_code_stored = ""
    if data.promo_code:
        promo, error = _find_valid_promo(db, data.promo_code)
        if error:
            raise HTTPException(status_code=400, detail=error)
        if promo:
            discount_amount = round(subtotal * promo.discount_percent / 100, 2)
            promo_code_stored = promo.code

    shipping_method = data.shipping_method if data.shipping_method in SHIPPING_RATES else DEFAULT_SHIPPING_METHOD
    shipping_cost = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_RATES[shipping_method]
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
        shipping_provider=shipping_method,
        discount_amount=discount_amount,
        promo_code=promo_code_stored,
        total=round(subtotal - discount_amount + shipping_cost, 2),
        access_token=secrets.token_urlsafe(24),
    )
    db.add(order)
    if promo:
        promo.used_count += 1
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
def get_order(order_id: int, t: str = "", db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    require_order_access(order, t)
    return order


@app.post("/api/orders/{order_id}/pay", response_model=schemas.OrderOut)
def pay_order(order_id: int, data: schemas.PayOrderIn, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    require_order_access(order, data.access_token)
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
        try:
            email_client.send_order_confirmation(order)
        except Exception:
            pass  # email is best-effort -- never block a confirmed payment
        return order

    raise HTTPException(status_code=402, detail=f"El pago no se pudo completar (estado: {payment_status})")


@app.post("/api/webhooks/square")
async def square_webhook(request: Request, db: Session = Depends(get_db)):
    """Fallback auto-reconciliation: Square calls this when a payment status
    changes asynchronously (captures, refunds, disputes). Matches the
    payment's reference_id back to our internal order id -- no manual
    lookup needed. Requires a public HTTPS URL registered in the Square
    dashboard, and SQUARE_WEBHOOK_SIGNATURE_KEY set once that's done.

    Fails closed: with no signature key configured, this endpoint refuses
    every request instead of trusting an unsigned payload. Anyone can POST
    arbitrary JSON to a public URL, so accepting unsigned "payment complete"
    events would let a stranger mark any order paid for free."""
    if not square_client.SQUARE_WEBHOOK_SIGNATURE_KEY:
        raise HTTPException(status_code=503, detail="Webhook no configurado")

    body = await request.body()
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
                just_paid = False
                if square_status in ("COMPLETED", "APPROVED") and order.status == "pending_payment":
                    order.status = "paid"
                    order.payment_provider = "square"
                    order.payment_reference = payment.get("id", "")
                    for item in order.items:
                        if item.product and item.product.status != "sold":
                            item.product.status = "sold"
                    just_paid = True
                elif square_status == "FAILED" and order.status == "pending_payment":
                    order.payment_provider = "square"
                elif square_status == "CANCELED" and order.status == "pending_payment":
                    order.payment_provider = "square"
                db.commit()
                if just_paid:
                    try:
                        email_client.send_order_confirmation(order)
                    except Exception:
                        pass  # email is best-effort -- never block webhook processing

    return {"ok": True}


@app.get("/api/admin/orders", response_model=List[schemas.OrderOut])
def admin_list_orders(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()


@app.get("/api/admin/analytics")
def admin_analytics(db: Session = Depends(get_db), _=Depends(require_admin)):
    products = db.query(models.Product).all()
    orders = db.query(models.Order).all()

    by_category: dict[str, dict[str, int]] = {}
    by_status = {"available": 0, "reserved": 0, "sold": 0}
    for p in products:
        cat = p.category or "Sin categoria"
        by_category.setdefault(cat, {"available": 0, "reserved": 0, "sold": 0, "total": 0})
        by_category[cat]["total"] += 1
        if p.status in by_category[cat]:
            by_category[cat][p.status] += 1
        if p.status in by_status:
            by_status[p.status] += 1

    orders_by_status: dict[str, int] = {}
    revenue_paid = 0.0
    revenue_orders = 0
    for o in orders:
        orders_by_status[o.status] = orders_by_status.get(o.status, 0) + 1
        if o.status in ("paid", "shipped", "delivered"):
            revenue_paid += o.total
            revenue_orders += 1

    return {
        "total_products": len(products),
        "products_by_status": by_status,
        "products_by_category": [
            {"category": cat, **counts} for cat, counts in sorted(by_category.items())
        ],
        "orders_by_status": orders_by_status,
        "revenue": {"total": round(revenue_paid, 2), "orders_count": revenue_orders},
    }


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
            if order.promo_code:
                promo = db.query(models.PromoCode).filter(models.PromoCode.code == order.promo_code).first()
                if promo and promo.used_count > 0:
                    promo.used_count -= 1
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


# ---------- Admin promo codes ----------
def _generate_promo_code(db: Session, instagram_username: str) -> str:
    """Auto-generates a readable code from the Instagram handle (e.g.
    @maria.style -> MARIASTYLE10), falling back to a random suffix on
    collision so the admin never has to think of a code by hand."""
    base = "".join(ch for ch in instagram_username.upper() if ch.isalnum())[:12]
    base = base or "TAG"
    candidate = f"{base}10"
    while db.query(models.PromoCode).filter(models.PromoCode.code == candidate).first():
        candidate = f"{base}{secrets.token_hex(2).upper()}"
    return candidate


@app.get("/api/admin/promocodes", response_model=List[schemas.PromoCodeOut])
def admin_list_promocodes(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(models.PromoCode).order_by(models.PromoCode.created_at.desc()).all()


@app.post("/api/admin/promocodes", response_model=schemas.PromoCodeOut)
def admin_create_promocode(
    data: schemas.PromoCodeCreate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    code = (data.code or "").strip().upper() or _generate_promo_code(db, data.instagram_username)
    if db.query(models.PromoCode).filter(models.PromoCode.code == code).first():
        raise HTTPException(status_code=400, detail=f"El codigo '{code}' ya existe")
    promo = models.PromoCode(
        code=code,
        instagram_username=data.instagram_username.strip().lstrip("@"),
        discount_percent=data.discount_percent,
        max_uses=data.max_uses,
        expires_at=data.expires_at,
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@app.put("/api/admin/promocodes/{promo_id}", response_model=schemas.PromoCodeOut)
def admin_update_promocode(
    promo_id: int,
    data: schemas.PromoCodeUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    promo = db.query(models.PromoCode).filter(models.PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Codigo no encontrado")
    if data.active is not None:
        promo.active = data.active
    if data.discount_percent is not None:
        promo.discount_percent = data.discount_percent
    if data.max_uses is not None:
        promo.max_uses = data.max_uses
    if data.expires_at is not None:
        promo.expires_at = data.expires_at
    db.commit()
    db.refresh(promo)
    return promo


@app.delete("/api/admin/promocodes/{promo_id}")
def admin_delete_promocode(promo_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    promo = db.query(models.PromoCode).filter(models.PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Codigo no encontrado")
    db.delete(promo)
    db.commit()
    return {"ok": True}
