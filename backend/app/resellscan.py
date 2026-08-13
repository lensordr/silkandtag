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
  "visible_features": array of short strings describing notable visible details (logos, labels, hardware, stitching -- purely descriptive, not a verdict)
}

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
        "ai_provider": item.ai_provider,
        "ai_error": item.ai_error,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }
