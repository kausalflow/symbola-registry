# kausalflow/lightkone (version 1): component pdf-filing-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [pdf-filing-v1.tar.gz](pdf-filing-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/pdf-filing/versions/1/examples.jsonl

The first 3 of 19 lines. The rest is part of the spec too: read the whole file at [components/pdf-filing/versions/1/examples.jsonl](../files/components/pdf-filing/versions/1/examples.jsonl).

```json
{"input": {"paper": {"id": "new", "title": "Improving neural networks by preventing co-adaptation of feature detectors", "authors": ["Hinton, Geoffrey E", "Srivastava, Nitish", "Krizhevsky, Alex"], "year": 2012}}, "output": {"pdf": "papers/All Papers/HINTON/Hinton et al. 2012 - Improving neural networks by preventing co-adaptation of feature detectors.pdf", "file": "All Papers/HINTON/Hinton et al. 2012 - Improving neural networks by preventing co-adaptation of feature detectors.pdf"}, "note": "three or more authors: et al."}
{"input": {"paper": {"id": "new", "title": "Attention is all you need", "authors": ["Vaswani, Ashish", "Shazeer, Noam"], "year": 2017}}, "output": {"pdf": "papers/All Papers/VASWANI/Vaswani and Shazeer 2017 - Attention is all you need.pdf", "file": "All Papers/VASWANI/Vaswani and Shazeer 2017 - Attention is all you need.pdf"}, "note": "two authors: A and B"}
{"input": {"paper": {"id": "new", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931}}, "output": {"pdf": "papers/All Papers/GÖDEL/Gödel 1931 - Über formal unentscheidbare Sätze.pdf", "file": "All Papers/GÖDEL/Gödel 1931 - Über formal unentscheidbare Sätze.pdf"}, "note": "one author; the folder keeps accents in capitals"}
```

## components/pdf-filing/versions/1/properties.py

```python
"""Behavioral properties for lightkone/pdf-filing."""

import re

from hypothesis import given, strategies as st

from schema import Filed, Input, Paper

NAMES = ["Hinton, Geoffrey", "Gödel, Kurt", "Straße, Hans", "de la Fontaine, Jean", "LIGO Collaboration", "Smith, J",
         "", " , x", "A/B, Corp", "Wolfram-Smith, Ann"]
WORDS = ["Improving", "neural", "networks:", "a", "study", "of", "x--y", "1---2", "what?", "<html>", "C*", "\"quoted\"",
         "path/to", "Über", "-", "  ", "pipes|"]


@st.composite
def papers(draw, long=False):
    n = draw(st.integers(1, 40 if long else 8))
    return Paper(
        id="new",
        title=" ".join(draw(st.lists(st.sampled_from(WORDS), max_size=n))),
        authors=draw(st.lists(st.sampled_from(NAMES), max_size=5)),
        year=draw(st.none() | st.integers(1900, 2030)),
    )


def file_of(impl, p, library=()):
    return impl(Input(paper=p, library=list(library)))


@given(p=papers(long=True))
def test_pdf_is_the_file_under_papers(impl, p):
    out = file_of(impl, p)
    assert out.pdf == "papers/" + out.file
    assert out.file.startswith("All Papers/") and out.file.endswith(".pdf")
    assert out.file.count("/") == 2


@given(p=papers(long=True))
def test_names_hold_no_forbidden_characters(impl, p):
    name = file_of(impl, p).file.split("/", 2)[2]
    assert not re.search(r'[:\\?*"<>|]', name)
    assert "  " not in name and not name.startswith((" ", "-"))


@given(p=papers())
def test_folder_is_the_first_surname_in_capitals(impl, p):
    folder = file_of(impl, p).file.split("/")[1]
    first = p.authors[0].split(",")[0].strip() if p.authors else ""
    if not first:
        assert folder == "Other"
    else:
        assert folder == folder.upper() and folder != ""


@given(p=papers(long=True))
def test_long_names_are_shortened_around_an_ellipsis(impl, p):
    name = file_of(impl, p).file.split("/", 2)[2][: -len(".pdf")]
    assert len(name.encode("utf-16-le")) // 2 <= 146 + 5


@given(p=papers(), n=st.integers(1, 4), self_listed=st.booleans())
def test_taken_names_count_up_and_own_pdf_is_ignored(impl, p, n, self_listed):
    plain = file_of(impl, p).file
    stem = plain[: -len(".pdf")]
    taken = [Filed(id="a", pdf="papers/" + plain)] + [Filed(id=f"b{i}", file=f"x.pdf; {stem} ({i}).pdf") for i in range(2, n + 1)]
    if self_listed:
        taken.append(Filed(id="new", pdf=f"papers/{stem} ({n + 1}).pdf"))
    assert file_of(impl, p, taken).file == f"{stem} ({n + 1}).pdf"


@given(p=papers())
def test_same_paper_same_place(impl, p):
    assert file_of(impl, p) == file_of(impl, p.model_copy(update={"id": "other"}))
```

## components/pdf-filing/versions/1/schema/input.json

```json
{
  "$defs": {
    "Filed": {
      "additionalProperties": false,
      "description": "A paper already in the library, as far as filing cares.",
      "properties": {
        "file": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Paperpile file field: paths under papers/, separated by ';'.",
          "title": "File"
        },
        "id": {
          "minLength": 1,
          "title": "Id",
          "type": "string"
        },
        "pdf": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "Storage key of its PDF, e.g. 'papers/All Papers/A/a.pdf'.",
          "title": "Pdf"
        }
      },
      "required": [
        "id"
      ],
      "title": "Filed",
      "type": "object"
    },
    "Paper": {
      "additionalProperties": false,
      "properties": {
        "authors": {
          "description": "'Last, First' strings or whole names, in order.",
          "items": {
            "type": "string"
          },
          "title": "Authors",
          "type": "array"
        },
        "id": {
          "minLength": 1,
          "title": "Id",
          "type": "string"
        },
        "title": {
          "title": "Title",
          "type": "string"
        },
        "year": {
          "anyOf": [
            {
              "minimum": 1,
              "type": "integer"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Year"
        }
      },
      "required": [
        "id",
        "title"
      ],
      "title": "Paper",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "library": {
      "description": "The library; may include the paper itself.",
      "items": {
        "$ref": "#/$defs/Filed"
      },
      "title": "Library",
      "type": "array"
    },
    "paper": {
      "$ref": "#/$defs/Paper"
    }
  },
  "required": [
    "paper"
  ],
  "title": "Input",
  "type": "object"
}
```

## components/pdf-filing/versions/1/schema/output.json

```json
{
  "additionalProperties": false,
  "properties": {
    "file": {
      "description": "The matching Paperpile file field.",
      "title": "File",
      "type": "string"
    },
    "pdf": {
      "description": "Storage key for the PDF: 'papers/' + file.",
      "title": "Pdf",
      "type": "string"
    }
  },
  "required": [
    "pdf",
    "file"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/pdf-filing/versions/1/schema.py

```python
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
```

## components/pdf-filing/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/pdf-filing"
version = 1
title = "Name and place a paper's PDF the way Paperpile does"
description = """
Decides where a new PDF for a paper is stored. Lightkone files PDFs exactly
as Paperpile files them in Google Drive, so a Paperpile "All Papers" folder
can be copied into a library unchanged:

  pdf  = "papers/" + file
  file = "All Papers/<FOLDER>/<NAME>.pdf"      e.g.
         All Papers/HINTON/Hinton et al. 2012 - Improving neural networks.pdf

clean(s), in order: "---" -> "—" (em dash), "--" -> "–" (en dash); each of
: / \\ ? * " < > | -> " - "; whitespace runs -> one space; runs of " - "
-> one " - "; then remove leading and trailing spaces and hyphens.

surname(a): the part of a before the first comma (all of a if none), trimmed.

FOLDER: clean(surname(first author)) upper-cased; "Other" when there is no
first author or that is empty.

NAME:
  title = clean(title), or "Untitled" if that is empty.
  who   = from the authors' surnames, ignoring empty ones:
          none -> title; one -> "A"; two -> "A and B"; more -> "A et al.".
          If who is longer than 40, keep its first 37 and add "...".
  head  = clean(who + " " + year), or clean(who) when there is no year.
  NAME  = head + " - " + title. If NAME is longer than 146, it becomes its
          first 72 with trailing whitespace removed, then " ... ", then its
          last 69 with leading whitespace removed.
Lengths count UTF-16 code units; v1 defines behaviour only for text without
characters outside the Basic Multilingual Plane (no emoji).

Upper-casing follows Unicode full case mapping (ß -> SS).

Taken names: every OTHER paper in the library (other id) takes its pdf, and
"papers/" + each part of its file split on ";" (trimmed). If papers/<file> is
taken, try NAME + " (2).pdf", " (3).pdf", ... until one is free.
"""
regenerability = "disposable"
license = "Proprietary (kausalflow)"
authors = ["kausalflow/lightkone"]

[entrypoint]
function = "run"

[requires]
network = []
credentials = []
state = []
permissions = []

[spec]
seed = 0
max_examples = 200
timeout_seconds = 300
```
