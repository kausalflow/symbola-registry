"""Interface for emptymalei/file-converters. After editing, run `symbola schema .` to regenerate schema/*.json."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    """One invocation of the `pbi` command in a scratch directory that is also HOME and holds `files`."""

    model_config = ConfigDict(extra="forbid")

    argv: list[str] = Field(description="The arguments after the program name.")
    files: dict[str, str] = Field(default_factory=dict, description="File name (relative to the scratch directory and HOME) -> text.")
    stdin: str | None = Field(None, description="Text on standard input.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: bool = Field(description="The command exited with code 0.")
    files: dict[str, Any] = Field(description="Files the command created or changed: path -> parsed JSON for .json files, \"<xlsx>\" for a workbook, else text.")
