"""Interface for spikinglabs/merge."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["merge", "covered", "unknown", "is-aura"]
    local: dict[str, Any] | None = Field(None, description="merge: this phone's log (collections, example, child).")
    incoming: Any = Field(None, description="merge: the other copy.")
    mine: dict[str, Any] | None = Field(None, description="covered: this phone's collections.")
    theirs: dict[str, Any] | None = Field(None, description="covered: the remote copy's collections.")
    log: Any = Field(None, description="unknown, is-aura: a saved log.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result: Any = Field(description="Depends on op.")
