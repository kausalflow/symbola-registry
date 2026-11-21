"""Interface for emptymalei/cache-keys. After editing, run `symbola schema .` to regenerate schema/*.json."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["key", "entry", "index"]
    command: Literal["workspaces list", "apps list", "users user-access"] | None = Field(None, description="op key: the command that fetched the data.")
    top: int | None = Field(None, description="op key, workspaces list: the --top value.")
    expand: list[str] | None = Field(None, description="op key, workspaces list: the --expand values, in order.")
    odata_filter: str | None = Field(None, description="op key, workspaces list: the --odata-filter value, if given.")
    role: Literal["admin", "user"] | None = Field(None, description="op key, apps list: the --role value.")
    user_id: str | None = Field(None, description="op key, users user-access: the --user-id value.")
    cache_key: str | None = Field(None, description="op entry: the key to save under.")
    data: Any = Field(None, description="op entry: the JSON value to save.")
    metadata: dict[str, Any] | None = Field(None, description="op entry: request metadata to save with it, if any.")
    now: str | None = Field(None, description="op entry: the local time of the save, as an ISO 8601 string like 2024-01-02T03:04:05.123456.")
    files: list[str] | None = Field(None, description="op index: relative paths (with /) of the files in a cache folder; each has some content.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cache_key: str | None = None
    metadata: dict[str, Any] | None = None
    version: str | None = Field(None, description="op entry: the version the save reports.")
    paths: list[str] | None = Field(None, description="op entry: the relative paths of the files the save creates in an empty cache folder.")
    document: dict[str, Any] | None = Field(None, description="op entry: the parsed content of the file saved.")
    keys: list[str] | None = Field(None, description="op index: the keys the cache lists.")
    versions: dict[str, list[str]] | None = Field(None, description="op index: for each top-level directory of the folder, its versions, newest first.")
    latest: dict[str, str | None] | None = Field(None, description="op index: for each top-level directory, the version a read of the latest data uses, or null.")
