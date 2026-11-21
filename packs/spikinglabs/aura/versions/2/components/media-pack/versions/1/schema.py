"""Interface for spikinglabs/media-pack."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Upload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    type: str
    bytes_b64: str


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["pack", "unpack"]
    data: dict[str, Any] = Field(description="A saved log (or one with references, for unpack).")
    existing: list[str] = Field(default_factory=list, description="pack: file names already in the media folder.")
    media: dict[str, str] = Field(default_factory=dict, description="unpack: file name -> bytes (base64).")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: dict[str, Any]
    uploads: list[Upload] | None = Field(None, description="pack: the files to add to the media folder.")
    missing: int | None = Field(None, description="unpack: items left out because a file is missing.")
