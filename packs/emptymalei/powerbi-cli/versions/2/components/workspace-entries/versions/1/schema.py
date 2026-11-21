"""Interface for emptymalei/workspace-entries. After editing, run `symbola schema .` to regenerate schema/*.json."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_ids: Any = Field(description="The `workspace_ids` value of a scan batch config file, as parsed from YAML.")


class Entry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str | None
    label: str = Field(description="How the workspace is named in progress and failure messages.")
    file_stem: str = Field(description="The result file's name without `.json`.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries: list[Entry]
