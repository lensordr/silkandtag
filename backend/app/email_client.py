"""Order confirmation emails via Resend.

Failure here must never break the payment flow: if the email send fails
(bad API key, Resend outage, etc.) the order is still correctly marked
paid. Callers should wrap send_order_confirmation in a try/except and just
log, not raise.
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "Silk & Tag <pedidos@silkandtag.com>")
RESEND_API_URL = "https://api.resend.com/emails"


def _order_items_html(order) -> str:
    rows = ""
    for item in order.items:
        rows += (
            f"<tr>"
            f"<td style='padding:8px 0;border-bottom:1px solid #eee;'>{item.title}"
            f"<br><span style='color:#888;font-size:12px;'>Ref: {item.code}</span></td>"
            f"<td style='padding:8px 0;border-bottom:1px solid #eee;text-align:right;'>{item.price:.2f} EUR</td>"
            f"</tr>"
        )
    return rows


def send_order_confirmation(order) -> bool:
    """Sends the 'payment confirmed' email to the customer. Returns True if
    Resend accepted the request, False otherwise (never raises)."""
    if not RESEND_API_KEY:
        return False

    items_html = _order_items_html(order)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;">
      <h2 style="color:#111;">Gracias por tu compra, {order.customer_name}</h2>
      <p>Hemos confirmado el pago de tu pedido <strong>#{order.id}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        {items_html}
        <tr>
          <td style="padding:8px 0;">Envio</td>
          <td style="padding:8px 0;text-align:right;">{order.shipping_cost:.2f} EUR</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:bold;">Total</td>
          <td style="padding:8px 0;text-align:right;font-weight:bold;">{order.total:.2f} EUR</td>
        </tr>
      </table>
      <p><strong>Direccion de envio:</strong><br>
      {order.address_line}<br>
      {order.postal_code} {order.city}, {order.province}</p>
      <p style="color:#888;font-size:13px;margin-top:24px;">
        Te avisaremos por aqui en cuanto tu pedido sea enviado.<br>
        Silk & Tag
      </p>
    </div>
    """

    try:
        resp = httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": RESEND_FROM_EMAIL,
                "to": [order.email],
                "subject": f"Pedido #{order.id} confirmado - Silk & Tag",
                "html": html,
            },
            timeout=10,
        )
        return resp.status_code < 300
    except Exception:
        return False
