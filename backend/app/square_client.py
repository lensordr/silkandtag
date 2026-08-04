import os
import uuid
import hmac
import hashlib
import base64
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SQUARE_ENV = os.environ.get("SQUARE_ENV", "sandbox")
SQUARE_APP_ID = os.environ.get("SQUARE_APP_ID", "")
SQUARE_ACCESS_TOKEN = os.environ.get("SQUARE_ACCESS_TOKEN", "")
SQUARE_LOCATION_ID = os.environ.get("SQUARE_LOCATION_ID", "")
SQUARE_WEBHOOK_SIGNATURE_KEY = os.environ.get("SQUARE_WEBHOOK_SIGNATURE_KEY", "")
SQUARE_CURRENCY = os.environ.get("SQUARE_CURRENCY", "EUR")

SQUARE_API_BASE = (
    "https://connect.squareupsandbox.com"
    if SQUARE_ENV == "sandbox"
    else "https://connect.squareup.com"
)
SQUARE_VERSION = "2024-10-17"


class SquarePaymentError(Exception):
    def __init__(self, message: str, details=None):
        super().__init__(message)
        self.details = details or {}


def is_configured() -> bool:
    return bool(SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID)


def create_payment(source_id: str, amount_eur: float, reference_id: str, note: str = "") -> dict:
    """Charge a Square Web Payments SDK token for the given amount (in EUR).

    amount_eur is converted to integer cents, computed server-side from our
    own order total -- never trust an amount sent by the client.
    """
    if not is_configured():
        raise SquarePaymentError("Square no esta configurado en el servidor.")

    amount_cents = round(amount_eur * 100)
    idempotency_key = str(uuid.uuid4())

    payload = {
        "source_id": source_id,
        "idempotency_key": idempotency_key,
        "amount_money": {"amount": amount_cents, "currency": SQUARE_CURRENCY},
        "location_id": SQUARE_LOCATION_ID,
        "reference_id": reference_id,
        "note": note or f"Silk & Tag pedido #{reference_id}",
        "autocomplete": True,
    }

    headers = {
        "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=15.0) as client:
        resp = client.post(f"{SQUARE_API_BASE}/v2/payments", json=payload, headers=headers)

    data = resp.json()

    if resp.status_code >= 400 or "errors" in data:
        errors = data.get("errors", [{"detail": "Error desconocido de Square"}])
        detail = errors[0].get("detail", "Pago rechazado")
        raise SquarePaymentError(detail, details=data)

    payment = data.get("payment", {})
    return payment


def verify_webhook_signature(notification_url: str, body: bytes, signature: str) -> bool:
    """Verify a Square webhook actually came from Square (HMAC-SHA256 over
    the notification URL + raw body, using the webhook signature key from
    the Square dashboard)."""
    if not SQUARE_WEBHOOK_SIGNATURE_KEY or not signature:
        return False
    payload = notification_url.encode("utf-8") + body
    digest = hmac.new(
        SQUARE_WEBHOOK_SIGNATURE_KEY.encode("utf-8"), payload, hashlib.sha256
    ).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, signature)
