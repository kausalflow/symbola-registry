# kausalflow/lightkone (version 1): component bibtex-export-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [bibtex-export-v1.tar.gz](bibtex-export-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/bibtex-export/versions/1/examples.jsonl

The first 3 of 19 lines. The rest is part of the spec too: read the whole file at [components/bibtex-export/versions/1/examples.jsonl](../files/components/bibtex-export/versions/1/examples.jsonl).

```json
{"input": {"paper": {"key": "Hinton2012-ab", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey E", "Srivastava, Nitish"], "tags": ["ml", "dropout"], "fields": {"month": "July"}, "year": 2012, "venue": "arXiv [cs.NE]", "arxiv": "1207.0580", "file": "All Papers/H/Hinton 2012.pdf"}}, "output": {"text": "@article{Hinton2012-ab,\n  title         = {{Improving neural networks by preventing co-adaptation}},\n  author        = {Hinton, Geoffrey E and Srivastava, Nitish},\n  year          = {2012},\n  journal       = {arXiv [cs.NE]},\n  eprint        = {1207.0580},\n  archiveprefix = {arXiv},\n  keywords      = {ml;dropout},\n  file          = {All Papers/H/Hinton 2012.pdf},\n  month         = {July}\n}\n"}, "note": "a typical article"}
{"input": {"paper": {"key": "vaswani2017", "type": "inproceedings", "title": "Attention is all you need", "authors": ["Vaswani, Ashish"], "tags": [], "fields": {"volume": "30"}, "year": 2017, "venue": "NeurIPS"}}, "output": {"text": "@inproceedings{vaswani2017,\n  title     = {{Attention is all you need}},\n  author    = {Vaswani, Ashish},\n  year      = {2017},\n  booktitle = {NeurIPS},\n  volume    = {30}\n}\n"}, "note": "inproceedings writes the venue as booktitle"}
{"input": {"paper": {"key": "Hinton2012-ab", "type": "incollection", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey E", "Srivastava, Nitish"], "tags": [], "fields": {}, "venue": "Collected Works"}}, "output": {"text": "@incollection{Hinton2012-ab,\n  title     = {{Improving neural networks by preventing co-adaptation}},\n  author    = {Hinton, Geoffrey E and Srivastava, Nitish},\n  booktitle = {Collected Works}\n}\n"}, "note": "incollection also uses booktitle"}
```

## components/bibtex-export/versions/1/properties.py

```python
"""Behavioral properties for lightkone/bibtex-export.

Each property checks one rule of the description on generated papers whose
values have no newlines, so an entry can be read back line by line.
"""

import re

from hypothesis import given, strategies as st

from schema import Input, Paper

SAFE = st.text(st.characters(codec="utf-8", exclude_characters="\n\r{}\\", exclude_categories=["Cs", "Cc"]), max_size=20)
SPECIAL = st.lists(st.sampled_from(["a", "b c", "&", "%", "#", "\\&", "\\%", "\\#", "50", " "]), max_size=6).map("".join)
WORDS = st.text("abcdefghijklmnopqrstuvwxyz ", min_size=1, max_size=15)
NAMES = st.sampled_from(["pages", "volume", "publisher", "month", "journal", "booktitle", "lightkone-id", "lightkone-x", "note", "isbn"])
LINE = re.compile(r"^  (\S+)( *) = \{(.*)\}(,?)$")


@st.composite
def papers(draw, text=SAFE):
    return Paper(
        key=draw(st.text("abcdefghijklmnopqrstuvwxyzABC0123456789:-_", max_size=12)),
        type=draw(st.sampled_from(["article", "inproceedings", "incollection", "book", "misc", ""])),
        title=draw(text),
        authors=draw(st.lists(st.sampled_from(["Hinton, Geoffrey", "others", "LIGO Collaboration", "Plato", "Others", ""]), max_size=4)),
        year=draw(st.none() | st.integers(0, 3000)),
        venue=draw(st.none() | text),
        doi=draw(st.none() | SAFE),
        arxiv=draw(st.none() | st.sampled_from(["", "2101.00001", "hep-th/9711200"])),
        url=draw(st.none() | SAFE),
        abstract=draw(st.none() | text),
        tags=draw(st.lists(st.sampled_from(["ml", "to read", "", "a;b"]), max_size=3)),
        file=draw(st.none() | SAFE),
        fields=draw(st.dictionaries(NAMES, SAFE, max_size=4)),
    )


def write(impl, p: Paper) -> str:
    return impl(Input(paper=p)).text


def lines(text: str) -> list[tuple[str, str]]:
    """The (name, value) pairs of an entry written as the description says."""
    body = text.split("\n")[1:-2]
    out = []
    for i, line in enumerate(body):
        m = LINE.match(line)
        assert m, f"not a field line: {line!r}"
        assert (m.group(4) == ",") == (i < len(body) - 1), "lines are joined by ',\\n'"
        out.append((m.group(1), m.group(3)))
    return out


def escaped(s: str) -> str:
    return re.sub(r"\\?([&%#])", r"\\\1", s)


def present(v) -> bool:
    return v is not None and v != ""


@given(p=papers())
def test_entry_frame(impl, p):
    text = write(impl, p)
    assert text.startswith(f"@{p.type or 'misc'}{{{p.key},\n")
    assert text.endswith("\n}\n")


@given(p=papers())
def test_names_are_aligned(impl, p):
    text = write(impl, p)
    body = text.split("\n")[1:-2]
    width = max(len(n) for n, _ in lines(text))
    assert all(line.index(" = {") == 2 + width for line in body)


@given(p=papers())
def test_fields_appear_in_order_when_present(impl, p):
    venue_field = "booktitle" if p.type in ("inproceedings", "incollection") else "journal"
    expected = ["title"]
    expected += ["author"] if p.authors else []
    expected += ["year"] if p.year is not None else []
    expected += [venue_field] if present(p.venue) and not p.fields.get(venue_field) else []
    expected += ["doi"] if present(p.doi) else []
    expected += ["eprint", "archiveprefix"] if present(p.arxiv) else []
    expected += ["url"] if present(p.url) else []
    expected += ["abstract"] if present(p.abstract) else []
    expected += ["keywords"] if ";".join(p.tags) else []
    expected += ["file"] if present(p.file) else []
    expected += [k for k, _ in kept_fields(p)]
    assert [n for n, _ in lines(write(impl, p))] == expected


def kept_fields(p: Paper) -> list[tuple[str, str]]:
    return [(k, v) for k, v in p.fields.items() if v and not k.startswith("lightkone-")]


@given(p=papers())
def test_values_are_written_as_given(impl, p):
    got = lines(write(impl, p))
    named = dict(got)
    if p.year is not None:
        assert named["year"] == str(p.year)
    for name in ("doi", "url", "file"):
        if present(getattr(p, name)):
            assert named[name] == getattr(p, name)
    if present(p.arxiv):
        assert named["eprint"] == p.arxiv and named["archiveprefix"] == "arXiv"
    kept = kept_fields(p)
    assert got[len(got) - len(kept):] == kept


@given(p=papers(text=SPECIAL))
def test_title_venue_and_abstract_are_escaped(impl, p):
    got = dict(lines(write(impl, p)))
    assert got["title"] == "{" + escaped(p.title) + "}"
    venue_field = "booktitle" if p.type in ("inproceedings", "incollection") else "journal"
    if present(p.venue) and not p.fields.get(venue_field):
        assert got[venue_field] == escaped(p.venue)
    if present(p.abstract):
        assert got["abstract"] == escaped(p.abstract)


@given(p=papers())
def test_authors_and_keywords(impl, p):
    got = dict(lines(write(impl, p)))
    joined = " and ".join(a if "," in a or a == "others" else "{" + a + "}" for a in p.authors)
    assert got.get("author", "") == joined
    assert got.get("keywords", "") == ";".join(p.tags)
```

## components/bibtex-export/versions/1/schema/input.json

```json
{
  "$defs": {
    "Paper": {
      "additionalProperties": false,
      "description": "The fields of a lightkone paper that the BibTeX writer reads.",
      "properties": {
        "abstract": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Abstract"
        },
        "arxiv": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Arxiv"
        },
        "authors": {
          "description": "'Last, First' strings or whole names, in order.",
          "items": {
            "type": "string"
          },
          "title": "Authors",
          "type": "array"
        },
        "doi": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Doi"
        },
        "fields": {
          "description": "Other BibTeX fields, in order.",
          "patternProperties": {
            "^[a-z][a-z0-9_.:+-]*$": {
              "type": "string"
            }
          },
          "title": "Fields",
          "type": "object"
        },
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
          "title": "File"
        },
        "key": {
          "description": "Citation key.",
          "title": "Key",
          "type": "string"
        },
        "tags": {
          "items": {
            "type": "string"
          },
          "title": "Tags",
          "type": "array"
        },
        "title": {
          "title": "Title",
          "type": "string"
        },
        "type": {
          "description": "Entry type in lower case; empty means misc.",
          "title": "Type",
          "type": "string"
        },
        "url": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Url"
        },
        "venue": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Venue"
        },
        "year": {
          "anyOf": [
            {
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
        "key",
        "type",
        "title",
        "authors"
      ],
      "title": "Paper",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
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

## components/bibtex-export/versions/1/schema/output.json

```json
{
  "additionalProperties": false,
  "properties": {
    "text": {
      "description": "The BibTeX entry, ending with a newline.",
      "title": "Text",
      "type": "string"
    }
  },
  "required": [
    "text"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/bibtex-export/versions/1/schema.py

```python
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
```

## components/bibtex-export/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/bibtex-export"
version = 1
title = "Write a lightkone paper as a BibTeX entry"
description = """
Writes one paper as the BibTeX entry lightkone puts in library.bib and in
the .bib files it syncs for Overleaf. The output must match byte for byte,
because those files are diffed and committed.

Shape:
  @<type>{<key>,
    <name> = {<value>},
    ...
    <name> = {<value>}
  }
followed by a newline. Each field line is two spaces, the field name padded
with spaces to the length of the longest name in the entry, " = {", the
value, and "}"; lines are joined by ",\\n". type is "misc" when empty.

Fields, in this order, each written only when its value is present and not
empty:
  title     always written, wrapped in an extra pair of braces: {{Title}}
  author    authors joined by " and "; an author containing a comma, or
            exactly "others", is written as is, any other is wrapped in
            braces so BibTeX keeps it whole: {LIGO Collaboration}
  year      the number
  journal   the venue, or booktitle instead when type is "inproceedings" or
            "incollection"; left out when fields already has a non-empty
            value under that name
  doi
  eprint, archiveprefix   the arxiv id and "arXiv", when arxiv is present
  url
  abstract
  keywords  tags joined by ";"
  file
  then every entry of fields in its given order, except names that start
  with "lightkone-" (private to lightkone). Names are not deduplicated.

Escaping: in title, venue and abstract, every & % or # not already preceded
by a backslash gets one. Nothing else is escaped or changed.
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
