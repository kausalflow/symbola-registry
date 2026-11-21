"""Interface for spikinglabs/ai-redaction."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    children: list[dict[str, Any]] = Field(description="[{id, name, deleted?}]")
    me: str = ""
    entries: list[dict[str, Any]] = Field(default_factory=list, description="[{by?, deleted?}]")
    child: str | None = Field(None, description="Id of the child the call is about.")
    system: str
    user: str
    images: int = 0
    provider: Literal["own-key", "device", "off"] = "own-key"
    reply: Any = Field(None, description="What the AI service answers.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: str = Field(description="The system text as sent.")
    user: str = Field(description="The redacted user text, plus the image note.")
    via: Literal["own-key", "device"]
    result: Any = Field(description="The answer with names put back.")
