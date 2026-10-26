"""Interface for spikinglabs/backup."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["make", "read", "merge"]
    now: str | None = Field(None, description="make: the moment written as exportedAt (ISO 8601 UTC with milliseconds).")
    data: dict[str, Any] | None = Field(None, description="make: {local, docs} to save.")
    passphrase: str | None = None
    salt: str | None = Field(None, description="make: base64 of 16 bytes for the key derivation; random if absent (tests only).")
    iv: str | None = Field(None, description="make: base64 of 12 bytes for the nonce; random if absent (tests only).")
    file: dict[str, Any] | str | None = Field(None, description="read: the backup file (JSON, or its text).")
    current: dict[str, str] | None = Field(None, description="merge: what this browser's storage holds.")
    incoming: dict[str, str] | None = Field(None, description="merge: the backup's local entries.")
    take_identity: bool = False


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result: Any = Field(description="Depends on op.")
