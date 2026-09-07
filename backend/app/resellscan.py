"""ResellScan MVP -- Phase 1: scan/upload -> AI identifies clothing.

Isolated from the storefront/checkout code on purpose: new table, new
router, own Cloudinary folder. A slow or broken AI call here must never be
able to affect real customers checking out on the live shop.

AIAnalysisService is a clean interface so a different vision provider can
be swapped in later without touching the route/model code. If no provider
is configured (no GEMINI_API_KEY), analysis returns a clear "not
configured" result instead of failing or fabricating data.
"""
import json
import base64
import os
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import models
from .db import get_db

router = APIRouter(prefix="/api/admin/resellscan", tags=["resellscan"])

NOT_CONFIGURED_MESSAGE = "External service not configured"

VALID_CONDITIONS = {
    "NEW_WITH_TAGS", "NEW_WITHOUT_TAGS", "EXCELLENT",
    "VERY_GOOD", "GOOD", "FAIR", "POOR",
}

# The scanner speaks the AI enum (NEW_WITH_TAGS..POOR); the storefront Product
# uses the Spanish scale shown to customers. Map between them when publishing so
# the created product matches what the admin form would produce by hand.
CONDITION_TO_PRODUCT = {
    "NEW_WITH_TAGS": "Como nuevo",
    "NEW_WITHOUT_TAGS": "Como nuevo",
    "EXCELLENT": "Como nuevo",
    "VERY_GOOD": "Muy bueno",
    "GOOD": "Bueno",
    "FAIR": "Aceptable",
    "POOR": "Aceptable",
}
DEFAULT_PRODUCT_CONDITION = "Muy bueno"

# Best-effort mapping from the free-text AI category to a storefront category
# (must match the admin product form / frontend list). Unknown categories fall
# back to "Accesorios" so publishing never fails just because the AI used an
# unexpected word; the admin can correct it afterwards.
CATEGORY_KEYWORDS = {
    "Chaquetas": ["chaqueta", "jacket", "blazer", "abrigo", "coat", "cazadora", "americana"],
    "Vestidos": ["vestido", "dress"],
    "Camisas": ["camisa", "shirt", "blusa", "blouse", "camiseta", "t-shirt", "tee", "top", "jersey", "sudadera", "hoodie", "sweater"],
    "Pantalones": ["pantalon", "pantalón", "trouser", "pant", "jean", "vaquero", "falda", "skirt", "short"],
    "Zapatos": ["zapato", "shoe", "sneaker", "zapatilla", "bota", "boot", "sandalia", "tacon"],
    "Bolsos": ["bolso", "bag", "mochila", "backpack", "cartera", "clutch"],
    "Accesorios": ["accesorio", "accessory", "cinturon", "belt", "bufanda", "scarf", "gorro", "hat", "guante", "joya", "collar"],
}


def _map_condition(scan_condition):
    return CONDITION_TO_PRODUCT.get(scan_condition or "", DEFAULT_PRODUCT_CONDITION)


def _map_category(scan_category):
    text = (scan_category or "").strip().lower()
    if not text:
        return "Accesorios"
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "Accesorios"


def _fallback_title(item) -> str:
    parts = [item.brand, item.product_name, item.size, item.colour]
    title = " ".join(p for p in parts if p)
    return title.strip() or "Prenda sin identificar"


class PublishIn(BaseModel):
    """Publish a scanned item as a storefront product. Price is the only field
    the admin must supply by hand; everything else defaults to the AI's
    (optionally edited) suggestions. title/description/category/size/color/brand
    are optional overrides so the admin can tweak the draft before publishing."""
    price: float
    title: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    condition: Optional[str] = None
    original_price: Optional[float] = None


RECOMMENDED_PHOTO_LABELS = [
    "front", "back", "logo", "size_label", "care_label",
    "sku_code", "hardware", "detail",
]


# ---------- AIAnalysisService interface ----------
class AIAnalysisService:
    """Clean interface so the vision provider is swappable later."""

    def analyze(self, images: List[bytes], labels: List[str]) -> dict:
        raise NotImplementedError


class NotConfiguredAnalysisService(AIAnalysisService):
    def analyze(self, images: List[bytes], labels: List[str]) -> dict:
        return {"error": NOT_CONFIGURED_MESSAGE}


IDENTIFICATION_PROMPT = """You are assisting a second-hand branded clothing reseller. You are shown several photos of ONE physical clothing item (order and labels of photos may include: front, back, logo, size_label, care_label, sku_code, hardware, detail).

Look ONLY at what is visibly present in these photos. Extract clothing identification data and return STRICT JSON matching exactly this shape, nothing else, no markdown fences:

{
  "brand": string or null,
  "brand_confidence": number 0-1 or null,
  "product_name": string or null,
  "product_name_confidence": number 0-1 or null,
  "category": string or null,
  "category_confidence": number 0-1 or null,
  "gender": string or null,
  "colour": string or null,
  "colour_confidence": number 0-1 or null,
  "size": string or null,
  "size_confidence": number 0-1 or null,
  "sku": string or null,
  "sku_confidence": number 0-1 or null,
  "style_code": string or null,
  "material": string or null,
  "estimated_retail_price": number or null,
  "condition": one of ["NEW_WITH_TAGS","NEW_WITHOUT_TAGS","EXCELLENT","VERY_GOOD","GOOD","FAIR","POOR"] or null,
  "condition_confidence": number 0-1 or null,
  "defects": array of short strings (e.g. "minor pilling on sleeve"), empty array if none visible,
  "visible_features": array of short strings describing notable visible details (logos, labels, hardware, stitching -- purely descriptive, not a verdict),
  "suggested_title": string in SPANISH or null,
  "suggested_description": string in SPANISH or null
}

LISTING COPY (suggested_title / suggested_description):
- Write them in SPANISH, in the style of a second-hand marketplace listing (like Vinted).
- suggested_title: short (max ~60 chars), like "Marca Prenda Talla Color" (e.g. "Zara Blazer entallado Talla M Negro"). Use only fields you actually identified; omit any you couldn't determine, never invent them.
- suggested_description: 2-4 short natural sentences a reseller would write: what the item is, brand, colour, size, material and condition, and honestly mention any visible defect. Do NOT invent measurements, materials, or a price. If little is known, keep it short rather than padding with guesses.
- If you cannot identify the item at all, return null for both.

CRITICAL RULES:
- NEVER invent a SKU or style code. If no code is clearly legible in the photos, return null for sku and style_code.
- If a field cannot be determined from the photos, return null (or "unknown" only where the field is inherently descriptive text), never guess a plausible-sounding value.
- confidence scores reflect how certain YOU are given only these photos, not how "good" the item looks.
- Base condition/defects only on what is visibly damaged, worn, stained, faded, pilled, torn, or otherwise imperfect in the photos.
- Output ONLY the JSON object, no commentary before or after."""


class GeminiAnalysisService(AIAnalysisService):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def analyze(self, images: List[bytes], labels: List[str]) -> dict:
        parts = [{"text": IDENTIFICATION_PROMPT}]
        for label, img_bytes in zip(labels, images):
            parts.append({"text": f"Photo label: {label}"})
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(img_bytes).decode("ascii"),
                }
            })

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        body = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
        }
        try:
            resp = httpx.post(url, params={"key": self.api_key}, json=body, timeout=60.0)
        except httpx.HTTPError as e:
            return {"error": f"No se pudo contactar el servicio de IA: {e}"}

        if resp.status_code != 200:
            return {"error": f"El servicio de IA devolvio un error ({resp.status_code}): {resp.text[:300]}"}

        try:
            payload = resp.json()
            text_out = payload["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text_out)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            return {"error": f"Respuesta de IA no valida: {e}"}

        parsed["_ai_provider"] = self.model
        return parsed


def get_analysis_service() -> AIAnalysisService:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return NotConfiguredAnalysisService()
    model = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
    return GeminiAnalysisService(api_key=api_key, model=model)


# ---------- Routes ----------
from .main import require_admin, save_upload  # noqa: E402  (avoid circular import at module load time)


@router.post("/scan")
def scan_product(
    images: List[UploadFile] = File(...),
    labels: str = Form(default=""),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    if not images:
        raise HTTPException(status_code=400, detail="Sube al menos una foto")
    if len(images) > 8:
        raise HTTPException(status_code=400, detail="Maximo 8 fotos")

    label_list = [l.strip() for l in labels.split(",")] if labels else []
    while len(label_list) < len(images):
        label_list.append("detail")

    raw_bytes = []
    urls = []
    for img in images:
        data = img.file.read()
        img.file.seek(0)
        raw_bytes.append(data)
        urls.append(save_upload(img, folder="silkandtag/resellscan"))

    service = get_analysis_service()
    result = service.analyze(raw_bytes, label_list)

    item = models.ScannedItem(
        image_urls=",".join(urls),
        photo_labels=",".join(label_list),
    )

    if "error" in result:
        item.ai_error = result["error"]
    else:
        item.brand = result.get("brand")
        item.brand_confidence = result.get("brand_confidence")
        item.product_name = result.get("product_name")
        item.product_name_confidence = result.get("product_name_confidence")
        item.category = result.get("category")
        item.category_confidence = result.get("category_confidence")
        item.gender = result.get("gender")
        item.colour = result.get("colour")
        item.colour_confidence = result.get("colour_confidence")
        item.size = result.get("size")
        item.size_confidence = result.get("size_confidence")
        item.sku = result.get("sku")
        item.sku_confidence = result.get("sku_confidence")
        item.style_code = result.get("style_code")
        item.material = result.get("material")
        item.estimated_retail_price = result.get("estimated_retail_price")
        condition = result.get("condition")
        item.condition = condition if condition in VALID_CONDITIONS else None
        item.condition_confidence = result.get("condition_confidence")
        item.defects = ",".join(result.get("defects") or [])
        item.suggested_title = result.get("suggested_title")
        item.suggested_description = result.get("suggested_description")
        item.ai_provider = result.get("_ai_provider", "")
        item.analysis_json = json.dumps(result)

    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.get("/items")
def list_scanned_items(db: Session = Depends(get_db), _=Depends(require_admin)):
    items = db.query(models.ScannedItem).order_by(models.ScannedItem.created_at.desc()).all()
    return [_serialize(i) for i in items]


@router.get("/items/{item_id}")
def get_scanned_item(item_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    item = db.query(models.ScannedItem).filter(models.ScannedItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="No encontrado")
    return _serialize(item)


@router.delete("/items/{item_id}")
def delete_scanned_item(item_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    item = db.query(models.ScannedItem).filter(models.ScannedItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.post("/items/{item_id}/publish")
def publish_scanned_item(
    item_id: int,
    data: PublishIn,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """One-click publish: turn a scanned item into a live storefront Product.

    Reuses everything the AI already identified (title, description, brand,
    category, size, colour, condition, photos). The admin only has to provide a
    price; every other value falls back to the AI suggestion but can be
    overridden in the request. The scanned item is marked "published" and linked
    to the new product so it isn't published twice by accident.
    """
    item = db.query(models.ScannedItem).filter(models.ScannedItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="No encontrado")
    if item.status == "published":
        raise HTTPException(status_code=400, detail="Esta prenda ya se ha publicado como producto")
    if data.price is None or data.price <= 0:
        raise HTTPException(status_code=400, detail="Indica un precio valido")

    title = (data.title or item.suggested_title or _fallback_title(item)).strip()
    description = (data.description if data.description is not None else (item.suggested_description or "")).strip()
    brand = (data.brand if data.brand is not None else (item.brand or "")).strip()
    category = data.category.strip() if data.category else _map_category(item.category)
    size = (data.size if data.size is not None else (item.size or "")).strip()
    color = (data.color if data.color is not None else (item.colour or "")).strip()
    condition = data.condition.strip() if data.condition else _map_condition(item.condition)
    original_price = data.original_price if data.original_price is not None else item.estimated_retail_price

    product = models.Product(
        title=title,
        description=description,
        brand=brand,
        category=category,
        size=size,
        condition=condition,
        color=color,
        price=data.price,
        original_price=original_price,
        status="available",
        image_urls=item.image_urls or "",
    )
    db.add(product)
    db.flush()
    product.code = f"ST-{product.id:04d}"

    item.status = "published"
    db.commit()
    db.refresh(product)

    return {
        "id": product.id,
        "code": product.code,
        "title": product.title,
        "description": product.description,
        "brand": product.brand,
        "category": product.category,
        "size": product.size,
        "condition": product.condition,
        "color": product.color,
        "price": product.price,
        "original_price": product.original_price,
        "status": product.status,
        "image_urls": product.image_urls,
        "created_at": product.created_at.isoformat() if product.created_at else None,
    }


def _serialize(item: models.ScannedItem) -> dict:
    return {
        "id": item.id,
        "image_urls": [u for u in (item.image_urls or "").split(",") if u],
        "photo_labels": [l for l in (item.photo_labels or "").split(",") if l],
        "brand": item.brand,
        "brand_confidence": item.brand_confidence,
        "product_name": item.product_name,
        "product_name_confidence": item.product_name_confidence,
        "category": item.category,
        "category_confidence": item.category_confidence,
        "gender": item.gender,
        "colour": item.colour,
        "colour_confidence": item.colour_confidence,
        "size": item.size,
        "size_confidence": item.size_confidence,
        "sku": item.sku,
        "sku_confidence": item.sku_confidence,
        "style_code": item.style_code,
        "material": item.material,
        "estimated_retail_price": item.estimated_retail_price,
        "condition": item.condition,
        "condition_confidence": item.condition_confidence,
        "defects": [d for d in (item.defects or "").split(",") if d],
        "suggested_title": item.suggested_title,
        "suggested_description": item.suggested_description,
        "ai_provider": item.ai_provider,
        "ai_error": item.ai_error,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }
