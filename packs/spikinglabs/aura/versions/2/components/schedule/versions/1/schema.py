"""Interface for spikinglabs/schedule."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Child(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dob: str | None = Field(None, description="Birth date, YYYY-MM-DD.")
    name: str = "Mia"
    vax_skip: list[str] = Field(default_factory=list, description="Vaccine keys the parents do not plan.")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["status", "events"]
    plan: Literal["vax", "u", "z"] | None = Field(None, description="status: which schedule.")
    now: str = Field(description="ISO 8601 UTC time.")
    child: Child
    doses: list[dict[str, Any]] = Field(default_factory=list, description="Recorded vaccinations: {against, date, deleted?}.")
    exams: list[dict[str, Any]] = Field(default_factory=list, description="U-Heft checkups: {u, date, deleted?}.")
    visits: list[dict[str, Any]] = Field(default_factory=list, description="Dentist visits: {z, date, deleted?}.")
    appts: list[dict[str, Any]] = Field(default_factory=list, description="Booked appointments (ids a0, a1, ... in this order).")
    vax_plan: Literal["de", "none"] = "de"
    u_plan: Literal["de", "none"] = "de"
    z_plan: Literal["de", "none"] = "de"


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[dict[str, Any]] | None = Field(None, description="status: one entry per item of the plan.")
    open: list[str] | None = Field(None, description="status: keys the Today screen points out.")
    events: list[dict[str, Any]] | None = Field(None, description="events: {uid, date, time, booked}.")
