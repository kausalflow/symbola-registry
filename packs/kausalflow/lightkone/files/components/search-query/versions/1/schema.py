"""Interface for lightkone/search-query."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TIMESTAMP = r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$"


class Paper(BaseModel):
    """The fields of a lightkone paper that search reads."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    added: str = Field(pattern=TIMESTAMP, description="When it was added, as JavaScript's toISOString writes it.")
    key: str = Field("", description="BibTeX citation key.")
    authors: list[str] = Field(default_factory=list, description="'Last, First' strings, in order.")
    year: int | None = Field(None, ge=1)
    venue: str | None = None
    abstract: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    tags: list[str] = Field(default_factory=list)
    file: str | None = Field(None, description="A PDF path from another reference manager.")
    pdf: str | None = Field(None, description="Storage key of a PDF in the library's own storage.")
    notes: str | None = None
    folders: list[str] | None = Field(None, description="Folder paths like 'Physics/QFT'.")
    starred: bool | None = None
    trashed: str | None = Field(None, description="When it was moved to the trash.")
    opened: str | None = Field(None, pattern=f"^$|{TIMESTAMP}", description="When it was last opened; empty means never.")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    papers: list[Paper] = Field(description="The library, in stored order. Ids are unique.")
    query: str = Field(description="What was typed in the search box.")
    sort: Literal["added", "year", "title", "relevance", "opened"] = "added"

    @model_validator(mode="after")
    def _unique_ids(self) -> "Input":
        if len({p.id for p in self.papers}) != len(self.papers):
            raise ValueError("paper ids must be unique")
        return self


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ids: list[str] = Field(description="Ids of the matching papers, in display order.")
