"""Interface for spikinglabs/ics."""

from pydantic import BaseModel, ConfigDict, Field


class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")

    uid: str
    at: str = Field(description="Start as a local clock time without zone, e.g. 2026-11-04T09:30.")
    time: str = Field("", description="'' for an all-day event, else 'HH:MM'.")
    title: str
    details: str = ""
    location: str | None = None
    booked: bool = False


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    now: str = Field(description="ISO 8601 UTC.")
    href: str = Field(description="The address the app is open at.")
    events: list[Event]


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ics: str
    filename: str
    google_url: str | None
