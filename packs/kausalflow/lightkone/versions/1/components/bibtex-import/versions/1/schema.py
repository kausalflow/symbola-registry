"""Interface for lightkone/bibtex-import."""

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(description="BibTeX, for example the contents of a .bib file.")


class Draft(BaseModel):
    """A paper before the library gives it an id. Absent fields are null."""

    model_config = ConfigDict(extra="forbid")

    key: str
    type: str
    title: str
    authors: list[str]
    year: int | None = None
    venue: str | None = None
    abstract: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    url: str | None = None
    tags: list[str]
    file: str | None = None
    notes: str | None = None
    fields: dict[str, str] = Field(description="Remaining BibTeX fields: lower-cased names, values as written.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    papers: list[Draft] = Field(description="One draft per entry with a title, in the order they appear.")
