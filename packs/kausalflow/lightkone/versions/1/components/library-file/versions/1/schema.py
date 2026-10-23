"""Interface for lightkone/library-file.

The input is library.json's raw text, because what is being specified is how
lightkone reads and rewrites that file. Text that is not a lightkone library
at all is in scope (it must raise ValueError). A library whose papers lack
the fields lightkone always writes is out of scope: lightkone never produces
one, so Input rejects it.
"""

import json
import math
import re
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError, field_validator

FieldName = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_.:+-]*$")]
SURROGATE = re.compile(r"[\ud800-\udfff]")


class StoredPaper(BaseModel):
    """A paper as lightkone stores it. Other keys may appear and must be kept."""

    model_config = ConfigDict(extra="allow", strict=True)

    id: str
    key: str
    type: str
    title: str
    authors: list[str]
    year: int | float | None = Field(None, description="A whole number; 2017.0 is read as 2017.")
    venue: str | None = None
    abstract: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    url: str | None = None
    tags: list[str]
    file: str | None = None
    added: str
    folders: list[str] | None = None
    fields: dict[FieldName, str]

    @field_validator("year")
    @classmethod
    def _whole(cls, year):
        if isinstance(year, float) and not year.is_integer():
            raise ValueError("year is a whole number")
        return year


def _check_values(v: Any) -> None:
    if v is None:
        raise ValueError("lightkone never writes null inside a library")
    if isinstance(v, bool):
        return
    if isinstance(v, int) and abs(v) > 2**53:
        raise ValueError("integers beyond 2**53 are not exact in JavaScript")
    if isinstance(v, float) and not math.isfinite(v):
        raise ValueError("numbers too large for a double are out of scope")
    if isinstance(v, str) and SURROGATE.search(v):
        raise ValueError("lone surrogates are out of scope")
    if isinstance(v, dict):
        for k, x in v.items():
            _check_values(k)
            _check_values(x)
    if isinstance(v, list):
        for x in v:
            _check_values(x)


def _not_json(name: str):
    raise ValueError(f"{name} is not JSON")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(description="lightkone/library.json exactly as it is stored.")

    @field_validator("text")
    @classmethod
    def _in_scope(cls, text: str) -> str:
        try:
            data = json.loads(text, parse_constant=_not_json)
        except ValueError:
            return text
        if not (isinstance(data, dict) and data.get("format") == "lightkone-library"):
            return text
        papers = data.get("papers")
        if papers == "":
            raise ValueError('"papers": "" is out of scope (lightkone happens to accept it)')
        if not isinstance(papers, list) or not all(isinstance(p, dict) for p in papers):
            return text
        _check_values(data)
        for p in papers:
            try:
                StoredPaper.model_validate(p)
            except ValidationError as e:
                raise ValueError(f"paper {p.get('id')!r} is not shaped the way lightkone writes papers: {e}") from None
        sync = data.get("bibSync")
        if sync is not None and not (isinstance(sync, list) and all(isinstance(t, dict) for t in sync)):
            raise ValueError("bibSync, when present, is a list of objects")
        return text


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    written: bool = Field(description="Whether saving writes anything: false when library.json would not change.")
    library: str = Field(description="The text of library.json after the save.")
    bib: str | None = Field(description="The library.bib written with it; null when nothing is written.")
    foldered: int = Field(ge=0, description="How many papers took their folders from Paperpile's file paths.")
