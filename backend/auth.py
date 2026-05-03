import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer()
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = os.getenv("CLERK_JWKS_URL")
        if not jwks_url:
            raise RuntimeError("CLERK_JWKS_URL environment variable is not set")
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "RS512"],
            options={"verify_aud": False, "leeway": 60},
        )
        return data["sub"]
    except Exception as e:
        print(f"[auth] JWT verification failed: {type(e).__name__}: {e}")
        # Try re-fetching JWKS keys in case they were rotated
        global _jwks_client
        _jwks_client = None
        try:
            client = _get_jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)
            data = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "RS512"],
                options={"verify_aud": False, "leeway": 60},
            )
            return data["sub"]
        except Exception as e2:
            print(f"[auth] JWT retry also failed: {type(e2).__name__}: {e2}")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
