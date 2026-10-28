"""Interface for emptymalei/cached-reads. After editing, run `symbola schema .` to regenerate schema/*.json."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    """One invocation of the `pbi` command in a scratch directory that is also HOME and holds `files`."""

    model_config = ConfigDict(extra="forbid")

    argv: list[str] = Field(description="The arguments after the program name.")
    files: dict[str, str] = Field(default_factory=dict, description="File name (relative to the scratch directory and HOME) -> text.")
    stdin: str | None = Field(None, description="Text on standard input.")


class Table(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(description="The line after the first rule of =, e.g. `Workspaces: 2 record(s)`.")
    columns: list[str] = Field(description="The header cells of the table.")
    rows: list[str] | None = Field(description="The first cell of each row (the id); null for a user-access table, whose cell is one nested value.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exit_code: int
    lines: list[str] = Field(description="The non-blank lines of standard output outside the table block, in order, with the scratch directory's path replaced by <scratch>.")
    table: Table | None = Field(description="The table block: three rules of 80 `=` around a title line and the table (header line, then one line per row).")
    errors: list[str] = Field(description="The lines of standard error that start with `Error:`, and `Aborted!`, in order.")
    files: dict[str, Any] = Field(description="Files the command created or changed: path -> parsed JSON for .json files, \"<xlsx>\" for a workbook, else text.")
