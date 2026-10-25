"""Interface for kausalflow/scenario-issues. After editing, run `symbolon schema .` to regenerate schema/*.json."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    """A scenario as a JSON value (`scenario`), or as YAML/JSON document text (`text`, which wins when present)."""

    model_config = ConfigDict(extra="forbid")

    scenario: Any = None
    text: str | None = None


class Error(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    location: str
    has_fix: bool = Field(description="The issue carries a non-empty suggested fix.")
    suggestion: str | None = Field(description="The first name of a 'Did you mean' hint in the fix (the closest known name); null when the fix has none.")


class Warning(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    location: str


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: bool
    errors: list[Error]
    warnings: list[Warning]
