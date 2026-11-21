"""Interface for lightkone/library-merge."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Library(BaseModel):
    """A lightkone library.json. Papers are kept as plain JSON objects: merging must keep every field."""

    model_config = ConfigDict(extra="forbid")

    format: Literal["lightkone-library"] = "lightkone-library"
    version: Literal[1] = 1
    papers: list[dict[str, Any]] = Field(description="Each paper has a unique string id and any other fields.")
    bibSync: list[dict[str, Any]] | None = Field(None, description=".bib files kept in sync with GitHub.")

    @field_validator("papers")
    @classmethod
    def _ids(cls, papers):
        ids = [p.get("id") for p in papers]
        if not all(isinstance(i, str) and i for i in ids) or len(set(ids)) != len(ids):
            raise ValueError("every paper needs a unique, non-empty string id")
        if any(v is None for p in papers for v in p.values()):
            raise ValueError("leave a field out rather than setting it to null")
        return papers


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base: Library | None = Field(None, description="The version this device last read or wrote.")
    ours: Library
    theirs: Library


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file: Library
    fromThem: int = Field(ge=0, description="How many papers took a change made elsewhere.")
