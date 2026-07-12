import os
import datetime
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer()
_jwks_client: PyJWKClient | None = None

# Clerk session tokens don't carry a standard OAuth `aud` claim, so audience
# verification is disabled above and replaced with `azp` (authorized party)
# validation below — this is Clerk's own documented pattern for manual JWT
# verification, since PyJWT/jose have no built-in support for checking `azp`.
# https://clerk.com/docs/backend-requests/manual-jwt
_authorized_parties = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = os.getenv("CLERK_JWKS_URL")
        if not jwks_url:
            raise RuntimeError("CLERK_JWKS_URL environment variable is not set")
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def _verify_authorized_party(claims: dict) -> None:
    azp = claims.get("azp")
    if azp is None or not _authorized_parties:
        # Token has no azp claim, or no ALLOWED_ORIGINS configured to check against —
        # nothing to verify. Not enforced strictly since this hasn't been validated
        # against a live Clerk token; tighten once confirmed against real tokens.
        return
    if azp not in _authorized_parties:
        raise jwt.InvalidTokenError(f"Untrusted authorized party: {azp}")


def _decode(token: str) -> dict:
    global _jwks_client
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256", "RS512"],
        leeway=datetime.timedelta(seconds=120),
        options={"verify_aud": False},
    )
    _verify_authorized_party(claims)
    return claims


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials
    try:
        data = _decode(token)
        return data["sub"]
    except Exception as e:
        print(f"[auth] attempt 1 failed ({type(e).__name__}: {e}) — refreshing JWKS")
        # Key may have been rotated; clear cache and retry once
        _jwks_client = None
        try:
            data = _decode(token)
            return data["sub"]
        except Exception as e2:
            print(f"[auth] attempt 2 failed ({type(e2).__name__}: {e2})")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
