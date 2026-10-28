"""Interface for spikinglabs/backup-retention."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["prune", "snapshot", "daily-copy"]
    now: str | None = Field(None, description="snapshot, daily-copy: local time, ISO 8601 without zone, e.g. 2026-10-27T10:30:00.")
    files: list[str] = Field(default_factory=list, description="prune, snapshot: names in the backups folder, newest name first.")
    done_hour: str | None = Field(None, description="snapshot: hour of the last snapshot, YYYY-MM-DD-HH.")
    keys: list[str] = Field(default_factory=list, description="daily-copy: keys in the phone's database.")
    example: bool = False


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    delete: list[str] = Field(description="Names or keys to delete.")
    upload: str | None = Field(None, description="snapshot: the file to save.")
    put: str | None = Field(None, description="daily-copy: the key to write.")
