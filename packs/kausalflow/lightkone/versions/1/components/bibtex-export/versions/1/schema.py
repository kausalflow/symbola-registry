"""Interface for lightkone/bibtex-export."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

FieldName = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_.:+-]*$")]


class Paper(BaseModel):
    """The fields of a lightkone paper that the BibTeX writer reads."""

    model_config = ConfigDict(extra="forbid")

    key: str = Field(description="Citation key.")
    type: str = Field(description="Entry type in lower case; empty means misc.")
    title: str
    authors: list[str] = Field(description="'Last, First' strings or whole names, in order.")
    year: int | None = None
    venue: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    url: str | None = None
    abstract: str | None = None
    tags: list[str] = Field(default_factory=list)
    file: str | None = None
    fields: dict[FieldName, str] = Field(default_factory=dict, description="Other BibTeX fields, in order.")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paper: Paper


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(description="The BibTeX entry, ending with a newline.")
