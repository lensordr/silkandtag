"""ResellScan Phase 2 -- manually-curated brand/comp reference database.

Simple CRUD only. No AI, no scraping (Vinted blocks scripted access with
Datadome -- confirmed directly, not assumed). The reseller fills this in
by hand from their own research; Phase 3 (authenticity) and Phase 4
(pricing) will read from it, but this module only stores and serves it.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import models
from .db import get_db

router = APIRouter(prefix="/api/admin/reference", tags=["reference"])


class ReferenceEntryIn(BaseModel):
    brand: str
    product_name: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    vinted_price: Optional[float] = None
    website_price: Optional[float] = None
    quick_sale_price: Optional[float] = None
    authenticity_notes: Optional[str] = ""
    source_url: Optional[str] = None


def _serialize(e: models.ReferenceEntry) -> dict:
    return {
        "id": e.id,
        "brand": e.brand,
        "product_name": e.product_name,
        "category": e.category,
        "condition": e.condition,
        "vinted_price": e.vinted_price,
        "website_price": e.website_price,
        "quick_sale_price": e.quick_sale_price,
        "authenticity_notes": e.authenticity_notes,
        "source_url": e.source_url,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }


# ---------- Routes ----------
from .main import require_admin  # noqa: E402  (avoid circular import at module load time)


@router.get("")
def list_entries(db: Session = Depends(get_db), _=Depends(require_admin)):
    entries = db.query(models.ReferenceEntry).order_by(models.ReferenceEntry.brand.asc()).all()
    return [_serialize(e) for e in entries]


@router.post("")
def create_entry(data: ReferenceEntryIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    entry = models.ReferenceEntry(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _serialize(entry)


@router.put("/{entry_id}")
def update_entry(entry_id: int, data: ReferenceEntryIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    entry = db.query(models.ReferenceEntry).filter(models.ReferenceEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No encontrado")
    for field, value in data.model_dump().items():
        setattr(entry, field, value)
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return _serialize(entry)


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    entry = db.query(models.ReferenceEntry).filter(models.ReferenceEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(entry)
    db.commit()
    return {"ok": True}
