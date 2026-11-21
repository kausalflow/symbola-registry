"""Interface for lightkone/tidy."""

from pydantic import BaseModel, ConfigDict, Field, model_validator

TIMESTAMP = r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$"


class Paper(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    authors: list[str] = Field(default_factory=list)
    added: str = Field(pattern=TIMESTAMP)
    tags: list[str] = Field(default_factory=list)
    folders: list[str] | None = None
    year: int | None = Field(None, ge=1)
    venue: str | None = None
    abstract: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    url: str | None = None
    pdf: str | None = None
    file: str | None = None
    notes: str | None = None
    starred: bool | None = None
    opened: str | None = None
    trashed: str | None = None
    fields: dict[str, str] = Field(default_factory=dict)


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    papers: list[Paper] = Field(description="The library, in stored order. Ids are unique.")

    @model_validator(mode="after")
    def _unique_ids(self) -> "Input":
        if len({p.id for p in self.papers}) != len(self.papers):
            raise ValueError("paper ids must be unique")
        return self


class Patch(BaseModel):
    """What the kept paper gains. Absent fields are null."""

    model_config = ConfigDict(extra="forbid")

    tags: list[str]
    folders: list[str]
    notes: str | None = None
    starred: bool | None = None
    fields: dict[str, str]
    added: str
    abstract: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    url: str | None = None
    venue: str | None = None
    year: int | None = None
    pdf: str | None = None
    file: str | None = None
    opened: str | None = None


class Group(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ids: list[str] = Field(description="The duplicates, in library order.")
    keep: str = Field(description="Id of the paper to keep.")
    patch: Patch


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    groups: list[Group]
