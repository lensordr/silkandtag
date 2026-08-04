import os
import time
import jwt

ADMIN_USERNAME = os.environ.get("SILKTAG_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("SILKTAG_ADMIN_PASSWORD", "silktag2026")
JWT_SECRET = os.environ.get("SILKTAG_JWT_SECRET", "dev-secret-change-me-in-production")
JWT_ALGO = "HS256"
TOKEN_TTL_SECONDS = 60 * 60 * 12  # 12h


def verify_credentials(username: str, password: str) -> bool:
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD


def create_token(username: str) -> str:
    payload = {"sub": username, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        return None
