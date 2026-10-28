"""Interface for spikinglabs/reminders."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["alerts", "medicine", "backup", "recall-match", "recall-lists"]
    now: str = Field(description="ISO 8601 UTC.")
    child: dict[str, Any] | None = Field(None, description="alerts: {dob}.")
    episode: dict[str, Any] | None = Field(None, description="alerts: {start, end?}.")
    entries: list[dict[str, Any]] = Field(default_factory=list, description="alerts, medicine: logged entries.")
    meds: list[dict[str, Any]] = Field(default_factory=list, description="medicine: the medicine list.")
    state: dict[str, Any] | None = Field(None, description="backup: example, children, snooze, backed_up_at, changed_at.")
    products: list[dict[str, Any]] = Field(default_factory=list, description="recall-*: the family's product list.")
    recall: dict[str, Any] | None = Field(None, description="recall-match: {title, company}.")
    recalls: list[dict[str, Any]] = Field(default_factory=list, description="recall-lists: the recall list.")
    countries: list[str] | None = None
    seen: list[str] = Field(default_factory=list)
    feed_seen: list[str] = Field(default_factory=list)


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    alerts: list[Any] | None = Field(None, description="alerts: [{kind, symptoms?}]; recall-lists: ids.")
    medicines: list[dict[str, Any]] | None = None
    due: Literal["never", "stale"] | None = Field(None, description="backup")
    matched: str | None = Field(None, description="recall-match")
    new: list[str] | None = Field(None, description="recall-lists")
