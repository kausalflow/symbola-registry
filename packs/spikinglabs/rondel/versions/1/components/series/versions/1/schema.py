"""Interface for spikinglabs/series."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["period", "base_period", "next_period", "next_after", "decide", "latest", "label", "room", "ics", "document"]
    cadence: Literal["daily", "weekly", "biweekly", "monthly", "none"] | None = None
    date: str | None = Field(None, pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$", description="A calendar date, as the person sees it on their calendar.")
    occ: str | None = None
    period: str | None = None
    occurrences: dict[str, dict[str, Any]] | None = Field(None, description="Meetings of the series by name.")
    series_key: str | None = None
    id: str | None = None
    info: dict[str, Any] | None = None
    link: str | None = None
    now: str | None = Field(None, description="A UTC moment, ISO 8601 with milliseconds.")
    update: str | None = Field(None, description="document: a base64 Yjs update of a series document.")
    steps: list[dict[str, Any]] = Field(default_factory=list, description="document: changes to make, each {op, args}.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result: Any = Field(description="Depends on op.")
