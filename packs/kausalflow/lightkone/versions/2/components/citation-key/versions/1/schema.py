"""Interface for lightkone/citation-key."""

from pydantic import BaseModel, ConfigDict, Field


class Draft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    authors: list[str] = Field(default_factory=list, description="'Last, First' strings or whole names, in order.")
    year: int | None = Field(None, ge=0)
    key: str | None = Field(None, description="A key the paper arrived with, e.g. from an imported .bib file.")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    drafts: list[Draft] = Field(description="New papers, in the order they are added.")
    taken: list[str] = Field(default_factory=list, description="Keys already in the library.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    keys: list[str] = Field(description="One key per draft, in order.")
