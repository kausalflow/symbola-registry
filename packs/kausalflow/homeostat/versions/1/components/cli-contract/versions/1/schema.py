"""Interface for kausalflow/cli-contract. After editing, run `symbolon schema .` to regenerate schema/*.json."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    """One invocation of the `homeostat` command in an empty scratch directory that holds `files`."""

    model_config = ConfigDict(extra="forbid")

    argv: list[str] = Field(description="The arguments after the program name.")
    files: dict[str, str] = Field(default_factory=dict, description="File name (relative to the scratch directory) -> text.")
    stdin: str | None = Field(None, description="Text on standard input.")


class Check(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: str


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exit_code: int
    stdout_kind: str = Field(description="json when standard output is one JSON object, text when it has other text, empty otherwise.")
    json_keys: list[str] | None = Field(description="Sorted top-level keys of the JSON object on standard output.")
    ok: bool | None = Field(description="The JSON object's `ok`, when it has one.")
    codes: list[str] = Field(description="Issue codes reported: the codes of the JSON object's `errors` then its `warnings`, in order (so a valid scenario's warnings appear here), or the [CODE] tags found in the text of standard error then standard output.")
    file: str | None = Field(description="The JSON object's `file`.")
    summary: Any = Field(description="The JSON object's `summary`.")
    checks: list[Check] | None = Field(description="The JSON object's `checks` reduced to id and status.")
    files_written: list[str] = Field(description="Sorted paths of the files the command left in the directory besides the inputs.")
    headline: str | None = Field(description="For `validate` in text mode, the first line of standard output; null otherwise.")
    stderr_has_issues: bool = Field(description="Standard error contains a [CODE] issue line.")
