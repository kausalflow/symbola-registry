# kausalflow/lightkone (version 1): component library-merge-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [library-merge-v1.tar.gz](library-merge-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/library-merge/versions/1/examples.jsonl

The first 3 of 21 lines. The rest is part of the spec too: read the whole file at [components/library-merge/versions/1/examples.jsonl](../files/components/library-merge/versions/1/examples.jsonl).

```json
{"input": {"base": {"$fixture": "base.json"}, "ours": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}, "theirs": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}}, "output": {"file": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}, "fromThem": 0}, "note": "nothing changed anywhere"}
{"input": {"base": {"$fixture": "base.json"}, "ours": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}, "theirs": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z", "notes": "incompleteness"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}}, "output": {"file": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z", "notes": "incompleteness"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}, "fromThem": 1}, "note": "a change made elsewhere is taken"}
{"input": {"base": {"$fixture": "base.json"}, "ours": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z", "notes": "mine"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}, "theirs": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}}, "output": {"file": {"format": "lightkone-library", "version": 1, "papers": [{"id": "hinton12", "key": "Hinton2012-in", "type": "article", "title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012, "tags": ["ml"], "folders": ["ML"], "fields": {}, "added": "2024-03-01T09:00:00.000Z"}, {"id": "godel31", "key": "Godel1931-fu", "type": "article", "title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931, "tags": ["logic", "classics"], "fields": {"volume": "38"}, "added": "2024-01-15T12:00:00.000Z", "notes": "mine"}, {"id": "noether18", "key": "Noether1918-iv", "type": "article", "title": "Invariante Variationsprobleme", "authors": ["Noether, Emmy"], "year": 1918, "tags": ["physics"], "folders": ["Physics"], "fields": {}, "added": "2024-01-16T12:00:00.000Z", "notes": "symmetry and conservation"}], "bibSync": [{"folder": "ML", "repo": "kausalflow/paper", "path": "refs.bib"}]}, "fromThem": 0}, "note": "a change made here is kept"}
```

## components/library-merge/versions/1/fixtures/base.json

```json
{
 "format": "lightkone-library",
 "version": 1,
 "papers": [
  {
   "id": "hinton12",
   "key": "Hinton2012-in",
   "type": "article",
   "title": "Improving neural networks by preventing co-adaptation",
   "authors": [
    "Hinton, Geoffrey"
   ],
   "year": 2012,
   "tags": [
    "ml"
   ],
   "folders": [
    "ML"
   ],
   "fields": {},
   "added": "2024-03-01T09:00:00.000Z"
  },
  {
   "id": "godel31",
   "key": "Godel1931-fu",
   "type": "article",
   "title": "Über formal unentscheidbare Sätze",
   "authors": [
    "Gödel, Kurt"
   ],
   "year": 1931,
   "tags": [
    "logic",
    "classics"
   ],
   "fields": {
    "volume": "38"
   },
   "added": "2024-01-15T12:00:00.000Z"
  },
  {
   "id": "noether18",
   "key": "Noether1918-iv",
   "type": "article",
   "title": "Invariante Variationsprobleme",
   "authors": [
    "Noether, Emmy"
   ],
   "year": 1918,
   "tags": [
    "physics"
   ],
   "folders": [
    "Physics"
   ],
   "fields": {},
   "added": "2024-01-16T12:00:00.000Z",
   "notes": "symmetry and conservation"
  }
 ],
 "bibSync": [
  {
   "folder": "ML",
   "repo": "kausalflow/paper",
   "path": "refs.bib"
  }
 ]
}
```

## components/library-merge/versions/1/properties.py

```python
"""Behavioral properties for lightkone/library-merge.

Libraries are generated as a base plus independent edits on each side, the
way two devices diverge: fields changed or removed, tags and folders added or
taken away, papers added or deleted.
"""

import copy
import json

from hypothesis import given, strategies as st

from schema import Input, Library

IDS = ["a", "b", "c", "d", "e"]
TAGS = ["ml", "physics", "to read", "qft"]
FOLDERS = ["ML", "Physics", "Physics/QFT"]


def same(x, y) -> bool:
    return json.dumps(x, sort_keys=True) == json.dumps(y, sort_keys=True)


@st.composite
def paper(draw, pid):
    p = {"id": pid, "title": draw(st.sampled_from(["Attention", "Dropout", "Gauge fields", "Untitled"])),
         "tags": draw(st.lists(st.sampled_from(TAGS), unique=True, max_size=3))}
    if draw(st.booleans()):
        p["year"] = draw(st.integers(2000, 2024))
    if draw(st.booleans()):
        p["folders"] = draw(st.lists(st.sampled_from(FOLDERS), unique=True, max_size=2))
    if draw(st.booleans()):
        p["notes"] = draw(st.sampled_from(["read twice", "check eq. 3"]))
    return p


@st.composite
def library(draw):
    ids = draw(st.lists(st.sampled_from(IDS), unique=True, max_size=4))
    return {"papers": [draw(paper(i)) for i in ids]}


@st.composite
def edited(draw, lib, fields=("title", "year", "notes", "starred")):
    """A copy of lib after a few edits on one device."""
    out = copy.deepcopy(lib)
    for _ in range(draw(st.integers(0, 3))):
        op = draw(st.sampled_from(["field", "drop-field", "tag", "untag", "add", "remove"]))
        papers = out["papers"]
        if op == "add":
            free = [i for i in IDS if i not in {p["id"] for p in papers}]
            if free:
                papers.append(draw(paper(draw(st.sampled_from(free)))))
            continue
        if not papers:
            continue
        p = draw(st.sampled_from(papers))
        if op == "remove":
            papers.remove(p)
        elif op == "field":
            k = draw(st.sampled_from(fields))
            p[k] = {"title": "Edited title", "year": 1999, "notes": "new note", "starred": True}[k]
        elif op == "drop-field":
            p.pop(draw(st.sampled_from(["year", "notes", "starred"])), None)
        elif op == "tag":
            t = draw(st.sampled_from(TAGS))
            if t not in p["tags"]:
                p["tags"].append(t)
        elif op == "untag" and p["tags"]:
            p["tags"].remove(draw(st.sampled_from(p["tags"])))
    return out


def merge(impl, base, ours, theirs):
    out = impl(Input(base=None if base is None else Library(**base), ours=Library(**ours), theirs=Library(**theirs)))
    return out.file.papers, out.fromThem


def by_id(lib):
    return {p["id"]: p for p in lib["papers"]}


@given(lib=library())
def test_nothing_changed_merges_to_itself(impl, lib):
    assert merge(impl, lib, lib, lib) == (lib["papers"], 0)


@given(data=st.data(), base=library())
def test_changes_made_only_elsewhere_are_taken_whole(impl, data, base):
    theirs = data.draw(edited(base))
    papers, from_them = merge(impl, base, base, theirs)
    assert papers == theirs["papers"]
    ours, mine = by_id(base), by_id(theirs)
    assert from_them == sum(not same(mine.get(i), ours.get(i)) for i in dict.fromkeys([*mine, *ours]))


@given(data=st.data(), base=library())
def test_changes_made_only_here_are_kept(impl, data, base):
    ours = data.draw(edited(base))
    papers, from_them = merge(impl, base, ours, base)
    assert from_them == 0
    kept = by_id(ours)
    order = [i for i in by_id(base) if i in kept] + [i for i in kept if i not in by_id(base)]
    assert [p["id"] for p in papers] == order and all(same(p, kept[p["id"]]) for p in papers)


@given(base=library(), data=st.data())
def test_edits_to_different_fields_both_survive(impl, base, data):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    by_id(ours)[target]["title"] = "Ours"
    by_id(theirs)[target]["notes"] = "Theirs"
    got = by_id({"papers": merge(impl, base, ours, theirs)[0]})[target]
    assert got["title"] == "Ours" and got["notes"] == "Theirs"


@given(base=library(), data=st.data())
def test_the_same_field_changed_both_ways_keeps_ours(impl, base, data):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    by_id(ours)[target]["title"], by_id(theirs)[target]["title"] = "Ours", "Theirs"
    by_id(theirs)[target]["year"] = 1900  # a second change there, so neither side equals the base
    got = by_id({"papers": merge(impl, base, ours, theirs)[0]})[target]
    assert got["title"] == "Ours" and got["year"] == 1900


@given(base=library(), data=st.data(), add_o=st.sampled_from(TAGS), add_t=st.sampled_from(TAGS))
def test_tags_merge_as_sets(impl, base, data, add_o, add_t):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    o, t, b = by_id(ours)[target], by_id(theirs)[target], by_id(base)[target]
    removed = data.draw(st.sampled_from(b["tags"])) if b["tags"] else None
    if removed:
        o["tags"].remove(removed)
    o["tags"] = list(dict.fromkeys(o["tags"] + [add_o]))
    t["tags"] = list(dict.fromkeys(t["tags"] + [add_t]))
    t["title"] = "Theirs too"
    got = by_id({"papers": merge(impl, base, ours, theirs)[0]})[target]["tags"]
    gone = {x for x in b["tags"] if x not in o["tags"] or x not in t["tags"]}
    assert got == [x for x in dict.fromkeys(o["tags"] + t["tags"]) if x not in gone]


@given(base=library(), data=st.data())
def test_a_paper_deleted_here_but_changed_there_survives(impl, base, data):
    if not base["papers"]:
        return
    target = data.draw(st.sampled_from(base["papers"]))["id"]
    ours, theirs = copy.deepcopy(base), copy.deepcopy(base)
    ours["papers"] = [p for p in ours["papers"] if p["id"] != target]
    by_id(theirs)[target]["notes"] = "edited elsewhere"
    assert target in by_id({"papers": merge(impl, base, ours, theirs)[0]})


@given(ours=library(), theirs=library())
def test_without_a_base_every_paper_is_kept_and_ours_wins(impl, ours, theirs):
    papers, _ = merge(impl, None, ours, theirs)
    expected = {**by_id(theirs), **by_id(ours)}
    assert by_id({"papers": papers}) == expected
```

## components/library-merge/versions/1/schema/input.json

```json
{
  "$defs": {
    "Library": {
      "additionalProperties": false,
      "description": "A lightkone library.json. Papers are kept as plain JSON objects: merging must keep every field.",
      "properties": {
        "bibSync": {
          "anyOf": [
            {
              "items": {
                "additionalProperties": true,
                "type": "object"
              },
              "type": "array"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": ".bib files kept in sync with GitHub.",
          "title": "Bibsync"
        },
        "format": {
          "const": "lightkone-library",
          "default": "lightkone-library",
          "title": "Format",
          "type": "string"
        },
        "papers": {
          "description": "Each paper has a unique string id and any other fields.",
          "items": {
            "additionalProperties": true,
            "type": "object"
          },
          "title": "Papers",
          "type": "array"
        },
        "version": {
          "const": 1,
          "default": 1,
          "title": "Version",
          "type": "integer"
        }
      },
      "required": [
        "papers"
      ],
      "title": "Library",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "base": {
      "anyOf": [
        {
          "$ref": "#/$defs/Library"
        },
        {
          "type": "null"
        }
      ],
      "default": null,
      "description": "The version this device last read or wrote."
    },
    "ours": {
      "$ref": "#/$defs/Library"
    },
    "theirs": {
      "$ref": "#/$defs/Library"
    }
  },
  "required": [
    "ours",
    "theirs"
  ],
  "title": "Input",
  "type": "object"
}
```

## components/library-merge/versions/1/schema/output.json

```json
{
  "$defs": {
    "Library": {
      "additionalProperties": false,
      "description": "A lightkone library.json. Papers are kept as plain JSON objects: merging must keep every field.",
      "properties": {
        "bibSync": {
          "anyOf": [
            {
              "items": {
                "additionalProperties": true,
                "type": "object"
              },
              "type": "array"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": ".bib files kept in sync with GitHub.",
          "title": "Bibsync"
        },
        "format": {
          "const": "lightkone-library",
          "default": "lightkone-library",
          "title": "Format",
          "type": "string"
        },
        "papers": {
          "description": "Each paper has a unique string id and any other fields.",
          "items": {
            "additionalProperties": true,
            "type": "object"
          },
          "title": "Papers",
          "type": "array"
        },
        "version": {
          "const": 1,
          "default": 1,
          "title": "Version",
          "type": "integer"
        }
      },
      "required": [
        "papers"
      ],
      "title": "Library",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "file": {
      "$ref": "#/$defs/Library"
    },
    "fromThem": {
      "description": "How many papers took a change made elsewhere.",
      "minimum": 0,
      "title": "Fromthem",
      "type": "integer"
    }
  },
  "required": [
    "file",
    "fromThem"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/library-merge/versions/1/schema.py

```python
"""Interface for lightkone/library-merge."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Library(BaseModel):
    """A lightkone library.json. Papers are kept as plain JSON objects: merging must keep every field."""

    model_config = ConfigDict(extra="forbid")

    format: Literal["lightkone-library"] = "lightkone-library"
    version: Literal[1] = 1
    papers: list[dict[str, Any]] = Field(description="Each paper has a unique string id and any other fields.")
    bibSync: list[dict[str, Any]] | None = Field(None, description=".bib files kept in sync with GitHub.")

    @field_validator("papers")
    @classmethod
    def _ids(cls, papers):
        ids = [p.get("id") for p in papers]
        if not all(isinstance(i, str) and i for i in ids) or len(set(ids)) != len(ids):
            raise ValueError("every paper needs a unique, non-empty string id")
        if any(v is None for p in papers for v in p.values()):
            raise ValueError("leave a field out rather than setting it to null")
        return papers


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base: Library | None = Field(None, description="The version this device last read or wrote.")
    ours: Library
    theirs: Library


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file: Library
    fromThem: int = Field(ge=0, description="How many papers took a change made elsewhere.")
```

## components/library-merge/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/library-merge"
version = 1
title = "Merge two edited copies of a lightkone library"
description = """
Before lightkone writes library.json it reads it again. If another device, or
Claude through MCP, saved in the meantime, the two versions are merged
against the version both started from, paper by paper and field by field,
instead of the later save silently winning. Only when both sides changed the
same field differently does this device's edit win.

Inputs: base (what this device last read or wrote; null if none), ours (what
this device holds now), theirs (what is in storage now).

Equality is by value: two papers are the same when they have the same
fields with equal values, in any key order.

Per paper id, with b, o, t its version in base, ours and theirs:
  no b:            o if present, else t
  b, no o:         t if t is present and differs from b, else dropped
  b, no t:         dropped if o equals b, else o
  o equals b:      t
  t equals b:      o
  otherwise        a field-by-field merge of b, o and t:
    tags, folders  (when o or t has the list) kept as sets: every item in o,
                   then every item in t not already listed, minus any item of
                   b that o or t removed
    other fields   t's value if o's equals b's, else o's; a field absent from
                   the chosen side is absent
Order: theirs' ids in theirs' order, then ids only in ours, in ours' order.
Ids only in base are gone.

fromThem counts the ids in that order whose result (a paper, or nothing)
differs from ours' version (a paper, or nothing).

bibSync: theirs' list if ours' equals base's (a missing list counts as
empty), else ours'. It is written only when non-empty.

The result is a library file: format "lightkone-library", version 1.
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
