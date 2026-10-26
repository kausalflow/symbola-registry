"""Interface for kausalflow/run-series. After editing, run `symbola schema .` to regenerate schema/*.json."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    """A valid library-free scenario and the signals to return."""

    model_config = ConfigDict(extra="forbid")

    scenario: dict[str, Any]
    signals: list[str]


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    seconds: list[float] = Field(description="The simulation time of each recorded row.")
    values: dict[str, list[list[float | None]]] = Field(description="For each requested signal, one series per lane; null for NaN.")
