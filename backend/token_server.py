import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from livekit.api import AccessToken
from livekit.api.access_token import VideoGrants

load_dotenv()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")

if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET or not LIVEKIT_URL:
    # We don't raise here to keep FastAPI importable, but requests will fail with 500
    missing = [
        name
        for name, value in [
            ("LIVEKIT_API_KEY", LIVEKIT_API_KEY),
            ("LIVEKIT_API_SECRET", LIVEKIT_API_SECRET),
            ("LIVEKIT_URL", LIVEKIT_URL),
        ]
        if not value
    ]
    print(f"WARNING: Missing LiveKit env vars: {', '.join(missing)}")


class TokenRequest(BaseModel):
    room_name: str
    identity: str
    # Optional: metadata you might use later
    metadata: Optional[str] = None
    # Optional: expiration in hours (default 6)
    expires_in_hours: int = 6


class TokenResponse(BaseModel):
    token: str
    url: str


app = FastAPI(title="LiveKit Token Server", version="1.0.0")

# Allow all origins in dev; tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/token", response_model=TokenResponse)
def create_token(req: TokenRequest) -> TokenResponse:
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET or not LIVEKIT_URL:
        raise HTTPException(
            status_code=500,
            detail="LiveKit configuration is missing on the server.",
        )

    if not req.room_name.strip():
        raise HTTPException(status_code=400, detail="room_name is required")
    if not req.identity.strip():
        raise HTTPException(status_code=400, detail="identity is required")

    # Configure grants – allow join, publish and subscribe in this room
    grants = VideoGrants(
        room=req.room_name,
        room_join=True,
        can_publish=True,
        can_subscribe=True,
    )

    expires_in = timedelta(hours=max(1, req.expires_in_hours))
    token_builder = (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(req.identity)
        .with_grants(grants)
        .with_ttl(expires_in)
    )
    if req.metadata:
        token_builder = token_builder.with_metadata(req.metadata)

    jwt = token_builder.to_jwt()

    return TokenResponse(token=jwt, url=LIVEKIT_URL)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "livekit_url": LIVEKIT_URL,
        "has_key": bool(LIVEKIT_API_KEY),
    }

