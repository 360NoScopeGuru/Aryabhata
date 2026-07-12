"""Tests for auth.py's JWT verification — the security-critical path every
other route depends on. Mocks the JWKS client so no real Clerk instance is
needed."""

import datetime
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import auth

TEST_USER_ID = "user_test123"


def _make_credentials(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


class FakeSigningKey:
    def __init__(self, key):
        self.key = key


@pytest.fixture
def rsa_keypair():
    from cryptography.hazmat.primitives.asymmetric import rsa

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def _sign(private_key, claims: dict, headers: dict | None = None) -> str:
    return jwt.encode(claims, private_key, algorithm="RS256", headers=headers)


def test_valid_token_returns_sub(rsa_keypair):
    private_key, public_key = rsa_keypair
    claims = {
        "sub": TEST_USER_ID,
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
    }
    token = _sign(private_key, claims)

    fake_client = MagicMock()
    fake_client.get_signing_key_from_jwt.return_value = FakeSigningKey(public_key)
    with patch.object(auth, "_get_jwks_client", return_value=fake_client):
        result = auth.get_current_user(_make_credentials(token))

    assert result == TEST_USER_ID


def test_expired_token_rejected(rsa_keypair):
    private_key, public_key = rsa_keypair
    claims = {
        "sub": TEST_USER_ID,
        "exp": datetime.datetime.now(datetime.UTC) - datetime.timedelta(hours=1, minutes=10),
    }
    token = _sign(private_key, claims)

    fake_client = MagicMock()
    fake_client.get_signing_key_from_jwt.return_value = FakeSigningKey(public_key)
    with patch.object(auth, "_get_jwks_client", return_value=fake_client):
        with pytest.raises(HTTPException) as exc_info:
            auth.get_current_user(_make_credentials(token))

    assert exc_info.value.status_code == 401


def test_malformed_token_rejected():
    fake_client = MagicMock()
    fake_client.get_signing_key_from_jwt.side_effect = jwt.exceptions.DecodeError("bad token")
    with patch.object(auth, "_get_jwks_client", return_value=fake_client):
        with pytest.raises(HTTPException) as exc_info:
            auth.get_current_user(_make_credentials("not.a.valid.jwt"))

    assert exc_info.value.status_code == 401


def test_wrong_signature_rejected(rsa_keypair):
    """Token signed by a different key than the one JWKS returns must be rejected."""
    private_key, _ = rsa_keypair
    from cryptography.hazmat.primitives.asymmetric import rsa

    other_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    claims = {
        "sub": TEST_USER_ID,
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
    }
    token = _sign(private_key, claims)

    fake_client = MagicMock()
    # JWKS returns a DIFFERENT public key than the one that signed the token
    fake_client.get_signing_key_from_jwt.return_value = FakeSigningKey(other_private_key.public_key())
    with patch.object(auth, "_get_jwks_client", return_value=fake_client):
        with pytest.raises(HTTPException) as exc_info:
            auth.get_current_user(_make_credentials(token))

    assert exc_info.value.status_code == 401


def test_key_rotation_retries_once(rsa_keypair):
    """First decode attempt fails (stale cached JWKS), second succeeds after
    the cache is cleared — this is auth.py's rotation-handling behavior."""
    private_key, public_key = rsa_keypair
    claims = {
        "sub": TEST_USER_ID,
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
    }
    token = _sign(private_key, claims)

    failing_client = MagicMock()
    failing_client.get_signing_key_from_jwt.side_effect = jwt.exceptions.PyJWKClientError("stale")

    working_client = MagicMock()
    working_client.get_signing_key_from_jwt.return_value = FakeSigningKey(public_key)

    call_count = {"n": 0}

    def _get_client_side_effect():
        call_count["n"] += 1
        return failing_client if call_count["n"] == 1 else working_client

    with patch.object(auth, "_get_jwks_client", side_effect=_get_client_side_effect):
        result = auth.get_current_user(_make_credentials(token))

    assert result == TEST_USER_ID
    assert call_count["n"] == 2


def test_azp_matching_allowed_origin_accepted(rsa_keypair):
    private_key, public_key = rsa_keypair
    claims = {
        "sub": TEST_USER_ID,
        "azp": "http://localhost:5173",
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
    }
    token = _sign(private_key, claims)

    fake_client = MagicMock()
    fake_client.get_signing_key_from_jwt.return_value = FakeSigningKey(public_key)
    with (
        patch.object(auth, "_get_jwks_client", return_value=fake_client),
        patch.object(auth, "_authorized_parties", ["http://localhost:5173"]),
    ):
        result = auth.get_current_user(_make_credentials(token))

    assert result == TEST_USER_ID


def test_azp_untrusted_origin_rejected(rsa_keypair):
    private_key, public_key = rsa_keypair
    claims = {
        "sub": TEST_USER_ID,
        "azp": "https://evil.example.com",
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
    }
    token = _sign(private_key, claims)

    fake_client = MagicMock()
    fake_client.get_signing_key_from_jwt.return_value = FakeSigningKey(public_key)
    with (
        patch.object(auth, "_get_jwks_client", return_value=fake_client),
        patch.object(auth, "_authorized_parties", ["http://localhost:5173"]),
    ):
        with pytest.raises(HTTPException) as exc_info:
            auth.get_current_user(_make_credentials(token))

    assert exc_info.value.status_code == 401


def test_missing_azp_claim_not_enforced(rsa_keypair):
    """Tokens without an azp claim at all are accepted regardless of
    ALLOWED_ORIGINS — this is the deliberate fail-open-on-missing-claim
    behavior since we haven't validated Clerk's real token shape yet."""
    private_key, public_key = rsa_keypair
    claims = {
        "sub": TEST_USER_ID,
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1),
    }
    token = _sign(private_key, claims)

    fake_client = MagicMock()
    fake_client.get_signing_key_from_jwt.return_value = FakeSigningKey(public_key)
    with (
        patch.object(auth, "_get_jwks_client", return_value=fake_client),
        patch.object(auth, "_authorized_parties", ["http://localhost:5173"]),
    ):
        result = auth.get_current_user(_make_credentials(token))

    assert result == TEST_USER_ID
