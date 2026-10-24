# kausalflow/lightkone (version 1): component citation-key-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [citation-key-v1.tar.gz](citation-key-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/citation-key/versions/1/examples.jsonl

The first 3 of 19 lines. The rest is part of the spec too: read the whole file at [components/citation-key/versions/1/examples.jsonl](../files/components/citation-key/versions/1/examples.jsonl).

```json
{"input": {"drafts": [{"title": "Improving neural networks by preventing co-adaptation", "authors": ["Hinton, Geoffrey"], "year": 2012}]}, "output": {"keys": ["Hinton2012-in"]}, "note": "surname, year, first letters of the first two long words"}
{"input": {"drafts": [{"title": "Attention is all you need", "authors": ["Vaswani, Ashish"], "year": 2017}]}, "output": {"keys": ["Vaswani2017-an"]}, "note": "short words are skipped: attention, need"}
{"input": {"drafts": [{"title": "Über formal unentscheidbare Sätze", "authors": ["Gödel, Kurt"], "year": 1931}]}, "output": {"keys": ["Godel1931-fu"]}, "note": "accents decompose in the surname but vanish from the title"}
```

## components/citation-key/versions/1/properties.py

```python
"""Behavioral properties for lightkone/citation-key."""

import re
import unicodedata

from hypothesis import given, strategies as st

from schema import Draft, Input

SURNAMES = ["Hinton", "Gödel", "de la Fontaine", "O'Neil", "Müller", "Łukasiewicz", "李", "", "smith", "Van der Waals"]
FIRST = ["Geoffrey", "Kurt", "Ada", ""]
TITLE_WORDS = ["Attention", "is", "all", "you", "need", "Über", "café", "deep", "nets", "of", "the", "Naïve", "Bayes", "2012", "x-ray"]


@st.composite
def drafts(draw, with_key=False):
    authors = draw(st.lists(st.tuples(st.sampled_from(SURNAMES), st.sampled_from(FIRST))
                            .map(lambda t: f"{t[0]}, {t[1]}" if t[1] else t[0]), max_size=3))
    return Draft(
        title=" ".join(draw(st.lists(st.sampled_from(TITLE_WORDS), max_size=6))),
        authors=authors,
        year=draw(st.none() | st.integers(1900, 2030)),
        key=draw(st.none() | st.sampled_from(["", "Hinton2012-ab", "mykey", "Godel1931-uf"])) if with_key else None,
    )


def base(d: Draft) -> str:
    raw = d.authors[0].split(",")[0] if d.authors else ""
    last = "".join(c for c in unicodedata.normalize("NFKD", raw) if c.isascii() and c.isalpha()) or "Anon"
    return last[0].upper() + last[1:] + (str(d.year) if d.year is not None else "")


def suffix(d: Draft) -> str:
    words = [w for w in re.sub(r"[^a-z ]", "", d.title.lower()).split(" ") if len(w) > 3]
    if not words:
        return "xx"
    return words[0][0] + (words[1] if len(words) > 1 else words[0])[0]


def keys(impl, ds, taken=()):
    return impl(Input(drafts=ds, taken=list(taken))).keys


@given(d=drafts())
def test_a_key_is_surname_year_and_two_title_letters(impl, d):
    assert keys(impl, [d]) == [f"{base(d)}-{suffix(d)}"]


@given(ds=st.lists(drafts(with_key=True), max_size=8), taken=st.lists(st.sampled_from(["Hinton2012-ab", "mykey", "Anon-xx", "Anon-xx2"]), max_size=3))
def test_keys_are_unique_and_never_taken(impl, ds, taken):
    got = keys(impl, ds, taken)
    assert len(got) == len(ds) and len(set(got)) == len(got) and not set(got) & set(taken)


@given(d=drafts(), n=st.integers(1, 5))
def test_collisions_count_up_from_two(impl, d, n):
    first = f"{base(d)}-{suffix(d)}"
    taken = [first] + [f"{first}{i}" for i in range(2, n + 1)]
    assert keys(impl, [d], taken) == [f"{first}{n + 1}"]


@given(d=drafts(), copies=st.integers(2, 5))
def test_identical_drafts_in_one_batch_get_distinct_keys(impl, d, copies):
    first = f"{base(d)}-{suffix(d)}"
    assert keys(impl, [d] * copies) == [first] + [f"{first}{i}" for i in range(2, copies + 1)]


@given(d=drafts(), key=st.text("abcdefghijABCDEF0123456789:-_", min_size=1, max_size=12), taken=st.booleans())
def test_an_arriving_key_is_kept_when_free(impl, d, key, taken):
    d = d.model_copy(update={"key": key})
    got = keys(impl, [d], [key] if taken else [])[0]
    assert (got == key) != taken


@given(ds=st.lists(drafts(with_key=True), max_size=6))
def test_keys_look_like_keys(impl, ds):
    for k, d in zip(keys(impl, ds), ds):
        assert k == d.key or re.fullmatch(r"[A-Z][A-Za-z]*[0-9]*-[a-z]{2}[0-9]*", k)
```

## components/citation-key/versions/1/schema/input.json

```json
{
  "$defs": {
    "Draft": {
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
        "key": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "A key the paper arrived with, e.g. from an imported .bib file.",
          "title": "Key"
        },
        "title": {
          "title": "Title",
          "type": "string"
        },
        "year": {
          "anyOf": [
            {
              "minimum": 0,
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
        "title"
      ],
      "title": "Draft",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "drafts": {
      "description": "New papers, in the order they are added.",
      "items": {
        "$ref": "#/$defs/Draft"
      },
      "title": "Drafts",
      "type": "array"
    },
    "taken": {
      "description": "Keys already in the library.",
      "items": {
        "type": "string"
      },
      "title": "Taken",
      "type": "array"
    }
  },
  "required": [
    "drafts"
  ],
  "title": "Input",
  "type": "object"
}
```

## components/citation-key/versions/1/schema/output.json

```json
{
  "additionalProperties": false,
  "properties": {
    "keys": {
      "description": "One key per draft, in order.",
      "items": {
        "type": "string"
      },
      "title": "Keys",
      "type": "array"
    }
  },
  "required": [
    "keys"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/citation-key/versions/1/schema.py

```python
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
```

## components/citation-key/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/citation-key"
version = 1
title = "Give new papers lightkone's citation keys"
description = """
Gives each new paper a BibTeX citation key the way lightkone does when papers
are added, in Paperpile's style: Hinton2012-ip. Keys are unique within the
library, and a key, once given, never changes, so LaTeX documents keep
working.

Drafts are handled in order. Each key given is taken for the drafts after it.

  1. A draft that already has a key (non-empty) that is not taken keeps it.
  2. Otherwise the key is BASE-SUFFIX:
     BASE    the first author's surname (the part before the first comma),
             decomposed with Unicode NFKD, keeping only the ASCII letters
             A-Z and a-z; "Anon" when there is no first author or nothing is
             left. Its first letter is upper-cased, the rest kept as is.
             Then the year, if the draft has one.
     SUFFIX  the title lower-cased, with every character other than a-z and
             space removed (so accented letters disappear, they are not
             decomposed), split on single spaces, keeping words longer than
             3 letters. SUFFIX is the first letter of the first such word and
             the first letter of the second, or of the first again when there
             is only one. With none, "xx".
  3. If BASE-SUFFIX is taken, try BASE-SUFFIX2, BASE-SUFFIX3, ... and use the
     first that is free.
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
