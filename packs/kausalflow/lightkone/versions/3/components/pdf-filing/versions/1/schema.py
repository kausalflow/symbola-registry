"""Interface for lightkone/pdf-filing."""

from pydantic import BaseModel, ConfigDict, Field


class Paper(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    authors: list[str] = Field(default_factory=list, description="'Last, First' strings or whole names, in order.")
    year: int | None = Field(None, ge=1)


class Filed(BaseModel):
    """A paper already in the library, as far as filing cares."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    pdf: str | None = Field(None, description="Storage key of its PDF, e.g. 'papers/All Papers/A/a.pdf'.")
    file: str | None = Field(None, description="Paperpile file field: paths under papers/, separated by ';'.")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paper: Paper
    library: list[Filed] = Field(default_factory=list, description="The library; may include the paper itself.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pdf: str = Field(description="Storage key for the PDF: 'papers/' + file.")
    file: str = Field(description="The matching Paperpile file field.")
