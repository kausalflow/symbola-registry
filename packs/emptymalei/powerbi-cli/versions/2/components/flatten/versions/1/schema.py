"""Interface for emptymalei/flatten. After editing, run `symbola schema .` to regenerate schema/*.json."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["workspaces", "app", "report_users"] = Field(
        description="workspaces: `data` is the non-empty `value` list of an admin workspaces listing. app: `data` is one app object. report_users: `data` maps a workspace name to a list of report records."
    )
    data: Any
    key: str | None = Field(None, description="report_users only: the field holding the users list of each report record. Default `reports_users_value`.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sheets: dict[str, list[dict[str, Any]]] = Field(description="Sheet name -> rows, in the order the sheets are written to a workbook; the order of keys inside a row is the column order.")
