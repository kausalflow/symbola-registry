"""Interface for spikinglabs/link-crypto."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["auth", "open", "seal", "link", "route", "new_ids"]
    link_key: str | None = Field(None, description="The key from the meeting link (base64url).")
    room_id: str | None = None
    sealed: str | None = Field(None, description="open: base64 text as stored on a room server.")
    plaintext: str | None = Field(None, description="seal: base64 of the bytes to seal.")
    iv: str | None = Field(None, description="seal: base64 of 12 bytes to use as the nonce; random if absent (tests only).")
    kind: Literal["meeting", "series"] | None = None
    id: str | None = None
    key: str | None = None
    origin: str | None = None
    pathname: str | None = None
    share_url: str | None = None
    hash: str | None = None


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result: Any = Field(description="Depends on op.")
