"""Interface for spikinglabs/save-guard."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Step(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: Any = Field(description="The whole log the app wants to save.")
    allow_shrink: bool = Field(False, description="The parent chose something that removes items (e.g. 'delete everything').")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    steps: list[Step]


class Result(BaseModel):
    model_config = ConfigDict(extra="forbid")

    saved: bool
    refused: Literal["too-new", "malformed", "shrunk"] | None


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    results: list[Result]
