"""Interface for spikinglabs/migrate."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    log: Any = Field(description="A saved log of any version, or null.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(alias="schema", description="The current format version (3).")
    too_new: bool = Field(description="The log's version is above the current one.")
    log: Any = Field(description="The log in the current format, or unchanged when too new or not an object.")
