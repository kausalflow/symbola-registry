"""Interface for spikinglabs/growth-percentile."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["percentile", "curve"]
    sex: str | None = Field(None, description="'f' or 'm'; anything else has no table.")
    dob: str | None = Field(None, description="percentile: birth date, YYYY-MM-DD.")
    measure: Literal["weightKg", "heightCm", "headCm"]
    value: float | None = Field(None, description="percentile: the measurement (kg or cm).")
    at: str | None = Field(None, description="percentile: when it was measured (ISO 8601, UTC).")
    months: float | None = Field(None, description="curve: age in months.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    percentile: float | None = Field(None, description="percentile: 0 to 100, or null.")
    z: float | None = None
    text: str | None = None
    values: list[float] | None = Field(None, description="curve: the 3rd, 15th, 50th, 85th, 97th percentile values, or null.")
