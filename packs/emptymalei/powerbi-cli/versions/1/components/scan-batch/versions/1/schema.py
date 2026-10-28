"""Interface for emptymalei/scan-batch. After editing, run `symbola schema .` to regenerate schema/*.json."""

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

    exit_code: int
    stdout: str = Field(description="Standard output with the scratch directory's path replaced by <scratch> and trailing spaces and the final newline removed.")
    errors: list[str] = Field(description="The lines of standard error that start with `Error:`, and `Aborted!`, in order. Empty for a usage error (exit code 2).")
    files: dict[str, Any] = Field(description="Files the command created or changed: path -> parsed JSON for .json files, parsed block-style YAML for .yaml files, \"<xlsx>\" for a workbook, else text. Paths inside values use <scratch> for the scratch directory.")
