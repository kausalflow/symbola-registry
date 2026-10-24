# kausalflow/lightkone (version 1): component tidy-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [tidy-v1.tar.gz](tidy-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/tidy/versions/1/examples.jsonl

The first 3 of 23 lines. The rest is part of the spec too: read the whole file at [components/tidy/versions/1/examples.jsonl](../files/components/tidy/versions/1/examples.jsonl).

```json
{"input": {"papers": [{"id": "a", "title": "Improving neural networks by preventing co-adaptation", "authors": [], "added": "2024-01-01T00:00:00.000Z", "tags": [], "doi": "10.1000/X"}, {"id": "b", "title": "Different title", "authors": [], "added": "2024-01-01T00:00:00.000Z", "tags": [], "doi": "https://doi.org/10.1000/x"}]}, "output": {"groups": [{"ids": ["a", "b"], "keep": "a", "patch": {"tags": [], "folders": [], "fields": {}, "added": "2024-01-01T00:00:00.000Z"}}]}, "note": "same DOI, written differently"}
{"input": {"papers": [{"id": "a", "title": "One", "authors": [], "added": "2024-01-01T00:00:00.000Z", "tags": [], "arxiv": "1207.0580"}, {"id": "b", "title": "Two", "authors": [], "added": "2024-01-01T00:00:00.000Z", "tags": [], "arxiv": "arXiv:1207.0580v3"}]}, "output": {"groups": [{"ids": ["a", "b"], "keep": "a", "patch": {"tags": [], "folders": [], "fields": {}, "added": "2024-01-01T00:00:00.000Z"}}]}, "note": "same arXiv id with prefix and version"}
{"input": {"papers": [{"id": "a", "title": "Improving neural networks by preventing co-adaptation", "authors": [], "added": "2024-01-01T00:00:00.000Z", "tags": []}, {"id": "b", "title": "Improving Neural Networks, by Preventing Co-Adaptation!", "authors": [], "added": "2024-01-01T00:00:00.000Z", "tags": []}]}, "output": {"groups": [{"ids": ["a", "b"], "keep": "a", "patch": {"tags": [], "folders": [], "fields": {}, "added": "2024-01-01T00:00:00.000Z"}}]}, "note": "long titles match after dropping case and punctuation"}
```

## components/tidy/versions/1/properties.py

```python
"""Behavioral properties for lightkone/tidy.

Generated libraries reuse a small pool of DOIs, arXiv ids, titles and authors
written in different ways, so duplicates appear by every route: same DOI,
same arXiv id, same long title, same short title and first author, and
chains of these.
"""

import re
import unicodedata

from hypothesis import given, strategies as st

from schema import Input, Paper

DOIS = ["10.1000/ABC", "https://doi.org/10.1000/abc", " 10.1000/abc ", "10.2000/xyz", "http://dx.doi.org/10.2000/XYZ", "doi.org/10.2000/xyz", " ", "  ", "https://doi.org/"]
ARXIV = ["1207.0580", "arXiv:1207.0580v2", "1706.03762", "ARXIV:1706.03762V1", "1706.03762v3", " ", "\t"]
TITLES = ["Improving neural networks by preventing co-adaptation", "Improving Neural Networks by Preventing Co-Adaptation!",
          "Attention is all you need", "Attention Is All You Need", "Über Sätze", "Uber Satze", "Deep learning", "Nets", "A"]
AUTHORS = ["Hinton, Geoffrey", "Vaswani, Ashish", "Gödel, Kurt", "Godel, K.", "LeCun, Yann"]
TIMES = [f"2024-0{m}-0{d}T10:00:00.000Z" for m in (1, 2) for d in (1, 2, 3)]


def opt(s):
    return st.none() | s


@st.composite
def library(draw, max_size=7):
    n = draw(st.integers(0, max_size))
    return [Paper(
        id=f"p{i}",
        title=draw(st.sampled_from(TITLES)),
        authors=draw(st.lists(st.sampled_from(AUTHORS), max_size=2)),
        added=draw(st.sampled_from(TIMES)),
        tags=draw(st.lists(st.sampled_from(["ml", "to read", "classics"]), unique=True, max_size=2)),
        folders=draw(opt(st.lists(st.sampled_from(["ML", "Physics"]), unique=True, max_size=2))),
        doi=draw(opt(st.sampled_from(DOIS))),
        arxiv=draw(opt(st.sampled_from(ARXIV))),
        pdf=draw(opt(st.sampled_from(["", "papers/a.pdf", "papers/b.pdf"]))),
        notes=draw(opt(st.sampled_from(["", " read ", "read", "check eq. 3"]))),
        starred=draw(opt(st.booleans())),
        venue=draw(opt(st.sampled_from(["", "NeurIPS"]))),
        year=draw(opt(st.integers(2010, 2020))),
        trashed=draw(opt(st.sampled_from(["", "2024-06-01T00:00:00.000Z"]))),
        fields=draw(st.dictionaries(st.sampled_from(["pages", "volume"]), st.sampled_from(["1", "2"]), max_size=2)),
    ) for i in range(n)]


def norm_doi(d):
    d = re.sub(r"^https?://(dx\.)?doi\.org/", "", d.strip().lower())
    return d


def norm_arxiv(a):
    a = re.sub(r"v\d+$", "", re.sub(r"^arxiv:", "", a.strip().lower()))
    return a


def keys(p: Paper) -> list[str]:
    out = []
    if p.doi and norm_doi(p.doi):
        out.append("doi:" + norm_doi(p.doi))
    if p.arxiv and norm_arxiv(p.arxiv):
        out.append("arxiv:" + norm_arxiv(p.arxiv))
    t = re.sub(r"[^a-z0-9]+", "", unicodedata.normalize("NFKD", p.title).lower())
    if len(t) > 20:
        out.append("title:" + t)
    elif len(t) > 3:
        first = (p.authors[0] if p.authors else "").split(",")[0]
        out.append(f"title:{t}:" + re.sub(r"[^a-z]", "", unicodedata.normalize("NFKD", first).lower()))
    return out


def expected_groups(papers):
    live = [p for p in papers if not p.trashed]
    group = {p.id: {p.id} for p in live}
    owner = {}
    for p in live:
        for k in keys(p):
            if k in owner and group[owner[k]] is not group[p.id]:
                merged = group[owner[k]] | group[p.id]
                for i in merged:
                    group[i] = merged
            owner.setdefault(k, p.id)
    seen, out = set(), []
    for p in live:
        g = frozenset(group[p.id])
        if len(g) > 1 and g not in seen:
            seen.add(g)
            out.append([q.id for q in live if q.id in g])
    return out


def tidy(impl, papers):
    return impl(Input(papers=papers)).groups


@given(papers=library())
def test_groups_are_exactly_the_papers_that_share_a_key(impl, papers):
    assert [g.ids for g in tidy(impl, papers)] == expected_groups(papers)


@given(papers=library())
def test_the_keeper_has_a_pdf_then_notes_then_is_oldest(impl, papers):
    by_id = {p.id: p for p in papers}
    for g in tidy(impl, papers):
        group = [by_id[i] for i in g.ids]
        best = min(group, key=lambda p: (not p.pdf, not p.notes, p.added, g.ids.index(p.id)))
        assert g.keep == best.id


@given(papers=library())
def test_the_keeper_gains_what_the_others_have(impl, papers):
    by_id = {p.id: p for p in papers}
    for g in tidy(impl, papers):
        keep = by_id[g.keep]
        others = [by_id[i] for i in g.ids if i != g.keep]
        everyone = [keep, *others]
        assert g.patch.tags == list(dict.fromkeys(t for p in everyone for t in p.tags))
        assert g.patch.folders == list(dict.fromkeys(f for p in everyone for f in p.folders or []))
        notes = list(dict.fromkeys(n.strip() for p in everyone if p.notes and p.notes.strip() for n in [p.notes]))
        assert g.patch.notes == ("\n\n".join(notes) or None)
        assert g.patch.starred == (True if any(p.starred for p in everyone) else None)
        assert g.patch.added == min(p.added for p in everyone)
        for k in ("venue", "year", "pdf", "doi", "arxiv"):
            want = None if getattr(keep, k) else next((getattr(p, k) for p in others if getattr(p, k)), None)
            assert getattr(g.patch, k) == want, k


@given(papers=library())
def test_fields_prefer_the_keeper_then_earlier_papers(impl, papers):
    by_id = {p.id: p for p in papers}
    for g in tidy(impl, papers):
        order = [by_id[g.keep]] + [by_id[i] for i in g.ids if i != g.keep]
        want = {}
        for p in reversed(order):
            want.update(p.fields)
        assert g.patch.fields == want


@given(papers=library())
def test_trash_is_never_grouped(impl, papers):
    trashed = {p.id for p in papers if p.trashed}
    assert not trashed & {i for g in tidy(impl, papers) for i in g.ids}
```

## components/tidy/versions/1/schema/input.json

```json
{
  "$defs": {
    "Paper": {
      "additionalProperties": false,
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
        "added": {
          "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
          "title": "Added",
          "type": "string"
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
          "additionalProperties": {
            "type": "string"
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
        "folders": {
          "anyOf": [
            {
              "items": {
                "type": "string"
              },
              "type": "array"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Folders"
        },
        "id": {
          "minLength": 1,
          "title": "Id",
          "type": "string"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Notes"
        },
        "opened": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Opened"
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
          "title": "Pdf"
        },
        "starred": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Starred"
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
        "trashed": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Trashed"
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
        "title",
        "added"
      ],
      "title": "Paper",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "papers": {
      "description": "The library, in stored order. Ids are unique.",
      "items": {
        "$ref": "#/$defs/Paper"
      },
      "title": "Papers",
      "type": "array"
    }
  },
  "required": [
    "papers"
  ],
  "title": "Input",
  "type": "object"
}
```

## components/tidy/versions/1/schema/output.json

```json
{
  "$defs": {
    "Group": {
      "additionalProperties": false,
      "properties": {
        "ids": {
          "description": "The duplicates, in library order.",
          "items": {
            "type": "string"
          },
          "title": "Ids",
          "type": "array"
        },
        "keep": {
          "description": "Id of the paper to keep.",
          "title": "Keep",
          "type": "string"
        },
        "patch": {
          "$ref": "#/$defs/Patch"
        }
      },
      "required": [
        "ids",
        "keep",
        "patch"
      ],
      "title": "Group",
      "type": "object"
    },
    "Patch": {
      "additionalProperties": false,
      "description": "What the kept paper gains. Absent fields are null.",
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
        "added": {
          "title": "Added",
          "type": "string"
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
          "additionalProperties": {
            "type": "string"
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
        "folders": {
          "items": {
            "type": "string"
          },
          "title": "Folders",
          "type": "array"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Notes"
        },
        "opened": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Opened"
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
          "title": "Pdf"
        },
        "starred": {
          "anyOf": [
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "title": "Starred"
        },
        "tags": {
          "items": {
            "type": "string"
          },
          "title": "Tags",
          "type": "array"
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
        "tags",
        "folders",
        "fields",
        "added"
      ],
      "title": "Patch",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "groups": {
      "items": {
        "$ref": "#/$defs/Group"
      },
      "title": "Groups",
      "type": "array"
    }
  },
  "required": [
    "groups"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/tidy/versions/1/schema.py

```python
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
```

## components/tidy/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/tidy"
version = 1
title = "Find duplicate papers and merge them"
description = """
Finds papers entered more than once, picks the one to keep, and works out
what the kept paper gains from the others, as lightkone's Tidy panel does.
The others are then moved to the trash by the caller.

DUPLICATES. Papers in the trash (trashed present and non-empty) are ignored.
Each remaining paper has up to three match keys:
  doi    "doi:" + doi trimmed, lower-cased, with a leading http(s)://doi.org/
         or http(s)://dx.doi.org/ removed; no key when that leaves nothing
         (no doi, only whitespace, or only the prefix).
  arxiv  "arxiv:" + arxiv trimmed, lower-cased, without a leading "arxiv:"
         and a trailing vN; no key when that leaves nothing.
  title  t = title decomposed (NFKD), lower-cased, keeping only a-z and 0-9.
         If t is longer than 20: "title:" + t. Else if longer than 3:
         "title:" + t + ":" + the first author's surname (before the first
         comma), decomposed, lower-cased, keeping only a-z. Else no key.
Papers that share a key are duplicates, and so are duplicates of duplicates.
Groups of two or more are reported in the order of their first paper, and
each group lists its papers in library order.

KEEPER. The paper with a pdf; among those, the one with notes; among those,
the earliest added (comparing the timestamps as text); then library order.

PATCH (what the keeper gains), with "others" in group order:
  tags     every tag of the keeper, then of the others, without repeats
  folders  the same for folders
  notes    every distinct trimmed non-empty note, keeper first, joined by a
           blank line; absent if none
  starred  true if any is starred; absent otherwise
  fields   the BibTeX fields of all of them, the keeper's winning, then
           earlier others over later ones
  added    the earliest added
  abstract, doi, arxiv, url, venue, year, pdf, file, opened: when the
           keeper's is absent or empty, the first other's non-empty value
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
