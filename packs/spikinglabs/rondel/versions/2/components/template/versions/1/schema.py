"""Interface for spikinglabs/template."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["parse", "to_yaml", "roundtrip", "new_version", "design_checks", "from_meeting", "builtin"]
    yaml: str | None = None
    id_prefix: str = ""
    template: dict[str, Any] | None = Field(None, description="A template as the app holds it (camelCase: durationMin, showAuthors...).")
    taken: list[str] = Field(default_factory=list, description="new_version: names already in use.")
    view: dict[str, Any] | None = Field(None, description="from_meeting: {meta: {title, type, settings, seriesName}, columns, agenda}.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result: Any = Field(description="Depends on op.")
