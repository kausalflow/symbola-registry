# kausalflow/lightkone (version 1): component bibtex-import-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [bibtex-import-v1.tar.gz](bibtex-import-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/bibtex-import/versions/1/examples.jsonl

The first 3 of 42 lines. The rest is part of the spec too: read the whole file at [components/bibtex-import/versions/1/examples.jsonl](../files/components/bibtex-import/versions/1/examples.jsonl).

```json
{"input": {"text": "@article{Hinton2012-ab,\n  title         = \"{Improving neural networks by preventing co-adaptation of feature detectors}\",\n  author        = \"Hinton, Geoffrey E and Srivastava, Nitish and Krizhevsky, Alex\",\n  journal       = \"arXiv [cs.NE]\",\n  year          =  2012,\n  month         =  jul,\n  eprint        = \"1207.0580\",\n  archivePrefix = \"arXiv\",\n  primaryClass  = \"cs.NE\",\n  keywords      = \"ml;dropout\",\n  file          = \"All Papers/H/Hinton et al. 2012 - Improving neural networks.pdf\"\n}"}, "output": {"papers": [{"key": "Hinton2012-ab", "type": "article", "title": "Improving neural networks by preventing co-adaptation of feature detectors", "authors": ["Hinton, Geoffrey E", "Srivastava, Nitish", "Krizhevsky, Alex"], "year": 2012, "venue": "arXiv [cs.NE]", "arxiv": "1207.0580", "tags": ["ml", "dropout"], "file": "All Papers/H/Hinton et al. 2012 - Improving neural networks.pdf", "fields": {"month": "July"}}]}, "note": "Paperpile export with arXiv eprint, month macro and file path"}
{"input": {"text": "@inproceedings{vaswani2017attention,\n  title={Attention is all you need},\n  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob},\n  booktitle={Advances in neural information processing systems},\n  volume={30},\n  year={2017}\n}"}, "output": {"papers": [{"key": "vaswani2017attention", "type": "inproceedings", "title": "Attention is all you need", "authors": ["Vaswani, Ashish", "Shazeer, Noam", "Parmar, Niki", "Uszkoreit, Jakob"], "year": 2017, "venue": "Advances in neural information processing systems", "tags": [], "fields": {"volume": "30"}}]}, "note": "Google Scholar export: booktitle becomes the venue"}
{"input": {"text": "@article{godel1931,\n\tauthor = {G{\\\"o}del, Kurt},\n\ttitle = {{\\\"U}ber formal unentscheidbare S{\\\"a}tze der {P}rincipia {M}athematica und verwandter {S}ysteme {I}},\n\tjournal = {Monatshefte f{\\\"u}r Mathematik und Physik},\n\tyear = {1931},\n\tvolume = {38},\n\tpages = {173--198},\n\tdoi = {10.1007/BF01700692},\n\turl = {https://doi.org/10.1007/BF01700692}\n}"}, "output": {"papers": [{"key": "godel1931", "type": "article", "title": "Über formal unentscheidbare Sätze der Principia Mathematica und verwandter Systeme I", "authors": ["Gödel, Kurt"], "year": 1931, "venue": "Monatshefte für Mathematik und Physik", "doi": "10.1007/BF01700692", "url": "https://doi.org/10.1007/BF01700692", "tags": [], "fields": {"volume": "38", "pages": "173--198"}}]}, "note": "LaTeX accents in braces become Unicode; protective braces go"}
```

## components/bibtex-import/versions/1/properties.py

```python
"""Behavioral properties for lightkone/bibtex-import.

Entries are generated as data, rendered as BibTeX in the many ways exporters
write it (braces or quotes, any field-name case, odd spacing, parentheses,
trailing commas), and the drafts must come back as the description says.
Generated values avoid LaTeX, so plain() leaves them alone; LaTeX and the
messier corners are pinned by the examples.
"""

from hypothesis import given, strategies as st

from schema import Draft, Input

WORD = st.text("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", min_size=1, max_size=8)
TEXT = st.lists(WORD, min_size=1, max_size=5).map(" ".join)
KEY = st.text("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:_-", min_size=1, max_size=12)
GAP = st.sampled_from(["", " ", "  ", "\n", "\n  ", "\t"])
NAME = st.text("abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=8).map(str.capitalize).filter(lambda w: w.lower() not in ("and", "others"))


def run(impl, text: str) -> list[Draft]:
    return impl(Input(text=text)).papers


def collapse(s: str) -> str:
    return " ".join(s.split())


@st.composite
def value(draw, v: str) -> str:
    """One way an exporter writes the value v."""
    if v.isdigit() and draw(st.booleans()):
        return v
    if draw(st.booleans()):
        return "{" + v + "}"
    return '"' + v + '"'


@st.composite
def entry_text(draw, type_: str, key: str, fields: list[tuple[str, str]]) -> str:
    """Render one entry. Field names get a random case; values a random style."""
    paren = draw(st.booleans())
    open_, close = ("(", ")") if paren else ("{", "}")
    parts = []
    for name, v in fields:
        name = "".join(c.upper() if draw(st.booleans()) else c for c in name)
        parts.append(f"{draw(GAP)}{name}{draw(GAP)}={draw(GAP)}{draw(value(v))}")
    body = ",".join(parts) + ("," if draw(st.booleans()) else "") + draw(GAP)
    return f"@{type_}{draw(GAP)}{open_}{draw(GAP)}{key},{body}{close}"


@st.composite
def simple_entry(draw):
    """(BibTeX text, expected draft) for an entry with ordinary fields."""
    type_ = draw(st.sampled_from(["article", "ARTICLE", "InProceedings", "misc", "book"]))
    key = draw(KEY)
    title = draw(TEXT)
    names = draw(st.lists(st.tuples(st.lists(NAME, min_size=0, max_size=2), NAME), max_size=4))
    comma_style = draw(st.booleans())
    rendered = [f"{last}, {' '.join(first)}" if comma_style and first else " ".join([*first, last]) for first, last in names]
    authors = [f"{last}, {' '.join(first)}" if first else last for first, last in names]
    year = draw(st.none() | st.integers(1000, 9999))
    venue_field = draw(st.sampled_from(["journal", "booktitle", None]))
    venue = draw(TEXT) if venue_field else None
    extra = draw(st.dictionaries(st.sampled_from(["pages", "volume", "number", "publisher", "isbn", "series"]), TEXT, max_size=3))
    fields = [("title", title)]
    if rendered:
        fields.append(("author", draw(st.sampled_from([" and ", " AND ", "\nand "])).join(rendered)))
    if year is not None:
        fields.append(("year", str(year)))
    if venue_field:
        fields.append((venue_field, venue))
    fields += list(extra.items())
    fields = draw(st.permutations(fields))
    if venue is None and "publisher" in extra:
        venue = extra["publisher"]
    expected = Draft(
        key=key, type=type_.lower(), title=title, authors=authors, year=year, venue=venue,
        tags=[], fields={k: collapse(v) for k, v in extra.items()},
    )
    return draw(entry_text(type_, key, fields)), expected


@given(entries=st.lists(simple_entry(), max_size=4), junk=st.lists(st.sampled_from(["", "\n\n", "% a comment\n", "text between entries\n"]), min_size=5, max_size=5))
def test_well_formed_entries_become_drafts(impl, entries, junk):
    text = junk[0] + "".join(t + junk[i % 4 + 1] for i, (t, _) in enumerate(entries))
    assert run(impl, text) == [d for _, d in entries]


@given(entries=st.lists(simple_entry(), min_size=1, max_size=3), drop=st.data())
def test_entries_without_a_title_are_left_out(impl, entries, drop):
    keep = drop.draw(st.lists(st.booleans(), min_size=len(entries), max_size=len(entries)))
    text = ""
    for (t, d), k in zip(entries, keep):
        text += (t if k else f"@misc{{{d.key}, note = {{no title here}}}}") + "\n"
    assert [p.key for p in run(impl, text)] == [d.key for (_, d), k in zip(entries, keep) if k]


@given(e=simple_entry(), wrapper=st.sampled_from(["@comment{{{0}}}", "@preamble{{\"{0}\"}}", "@COMMENT {{{0}}}"]), note=TEXT)
def test_comments_and_preambles_are_not_entries(impl, e, wrapper, note):
    text, draft = e
    assert run(impl, wrapper.format(note) + "\n" + text) == [draft]


@given(name=st.text("abcdefghij", min_size=3, max_size=6), v=TEXT, suffix=TEXT, key=KEY, upper=st.booleans())
def test_string_macros_and_concatenation(impl, name, v, suffix, key, upper):
    use = name.upper() if upper else name
    text = f'@string{{{name} = "{v}"}}\n@article{{{key}, title = {{T}}, journal = {use} # " {suffix}"}}'
    assert run(impl, text)[0].venue == f"{v} {suffix}"


@given(month=st.sampled_from(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]), key=KEY, upper=st.booleans())
def test_month_macros(impl, month, key, upper):
    full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
            "November", "December"][["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].index(month)]
    papers = run(impl, f"@misc{{{key}, title = {{T}}, month = {month.upper() if upper else month}}}")
    assert papers[0].fields["month"] == full


@given(key=KEY, pieces=st.lists(st.tuples(WORD, GAP), min_size=1, max_size=6))
def test_whitespace_in_values_collapses(impl, key, pieces):
    raw = "".join(w + (g or " ") for w, g in pieces)
    papers = run(impl, f"@misc{{{key}, title = {{{raw}}}, howpublished = {{  {raw}  }}}}")
    assert papers[0].title == collapse(raw) and papers[0].fields["howpublished"] == collapse(raw)


@given(key=KEY, a=TEXT, b=TEXT)
def test_later_fields_replace_earlier_ones(impl, key, a, b):
    papers = run(impl, f"@misc{{{key}, title = {{{a}}}, title = {{{b}}}, pages = {{{a}}}, PAGES = {{{b}}}}}")
    assert papers[0].title == b and papers[0].fields == {"pages": b}


@given(key=KEY, corp=TEXT.filter(lambda t: "and" not in t.lower().split()), name=NAME)
def test_braced_names_and_others_are_kept(impl, key, corp, name):
    papers = run(impl, f"@misc{{{key}, title = {{T}}, author = {{{{{corp}}} and Ada {name} and others}}}}")
    assert papers[0].authors == [corp, f"{name}, Ada", "others"]


@given(key=KEY, ed=st.lists(NAME, min_size=1, max_size=3))
def test_editors_stand_in_for_missing_authors(impl, key, ed):
    papers = run(impl, f"@book{{{key}, title = {{T}}, editor = {{{' and '.join(ed)}}}}}")
    assert papers[0].authors == ed and "editor" not in papers[0].fields


@given(key=KEY, doi=st.from_regex(r"10\.[0-9]{4,5}/[a-z0-9.]{1,10}", fullmatch=True),
       prefix=st.sampled_from(["", "https://doi.org/", "http://dx.doi.org/", "HTTPS://DOI.ORG/"]))
def test_doi_loses_its_resolver_prefix(impl, key, doi, prefix):
    assert run(impl, f"@article{{{key}, title = {{T}}, doi = {{{prefix}{doi}}}}}")[0].doi == doi


ARXIV = st.from_regex(r"[0-9]{4}\.[0-9]{4,5}", fullmatch=True)


@given(key=KEY, aid=ARXIV, version=st.sampled_from(["", "v1", "v12"]), how=st.sampled_from(["eprint", "arxivid", "url-abs", "url-pdf", "bare"]))
def test_arxiv_ids_are_found(impl, key, aid, version, how):
    fields = {
        "eprint": f"eprint = {{arXiv:{aid}{version}}}, archivePrefix = {{arXiv}}, primaryClass = {{cs.LG}}",
        "arxivid": f"arxivid = {{{aid}{version}}}",
        "url-abs": f"url = {{https://arxiv.org/abs/{aid}{version}}}",
        "url-pdf": f"url = {{https://arxiv.org/pdf/{aid}{version}.pdf}}",
        "bare": f"eprint = {{{aid}{version}}}",
    }[how]
    p = run(impl, f"@article{{{key}, title = {{T}}, {fields}}}")[0]
    assert p.arxiv == aid
    assert not {"eprint", "archiveprefix", "primaryclass", "arxivid"} & set(p.fields)


@given(key=KEY, eprint=st.from_regex(r"[a-z]{3,6}/[0-9]{3}", fullmatch=True))
def test_other_eprints_stay_in_fields(impl, key, eprint):
    p = run(impl, f"@article{{{key}, title = {{T}}, eprint = {{{eprint}}}}}")[0]
    assert p.arxiv is None and p.fields == {"eprint": eprint}


@given(key=KEY, tags=st.lists(TEXT, min_size=1, max_size=4), seps=st.sampled_from([";", ",", "; ", " , "]),
       ids=st.lists(st.sampled_from(["doi:10.1/x", "URL:http://a.b", "https://x.org", "arXiv:2101.00001", "isbn:123"]), max_size=2))
def test_keywords_become_tags_without_identifiers(impl, key, tags, seps, ids):
    p = run(impl, f"@article{{{key}, title = {{T}}, keywords = {{{seps.join(tags + ids)}}}}}")[0]
    assert p.tags == tags and "keywords" not in p.fields
```

## components/bibtex-import/versions/1/schema/input.json

```json
{
  "additionalProperties": false,
  "properties": {
    "text": {
      "description": "BibTeX, for example the contents of a .bib file.",
      "title": "Text",
      "type": "string"
    }
  },
  "required": [
    "text"
  ],
  "title": "Input",
  "type": "object"
}
```

## components/bibtex-import/versions/1/schema/output.json

```json
{
  "$defs": {
    "Draft": {
      "additionalProperties": false,
      "description": "A paper before the library gives it an id. Absent fields are null.",
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
          "description": "Remaining BibTeX fields: lower-cased names, values as written.",
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
          "title": "Key",
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
        "authors",
        "tags",
        "fields"
      ],
      "title": "Draft",
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "papers": {
      "description": "One draft per entry with a title, in the order they appear.",
      "items": {
        "$ref": "#/$defs/Draft"
      },
      "title": "Papers",
      "type": "array"
    }
  },
  "required": [
    "papers"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/bibtex-import/versions/1/schema.py

```python
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
```

## components/bibtex-import/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/bibtex-import"
version = 1
title = "Read BibTeX into lightkone paper drafts"
description = """
Reads BibTeX text, as exported by Paperpile, Zotero, JabRef or Google
Scholar, into paper drafts the way lightkone's importer does. It never fails:
malformed parts are skipped. Whitespace below means JavaScript's \\s: tab,
LF, VT, FF, CR, space, U+00A0, U+1680, U+2000-U+200A, U+2028, U+2029,
U+202F, U+205F, U+3000 and U+FEFF (and nothing else: not U+0085 or
U+001C-U+001F). Trimming, collapsing and splitting all use this set.

READING ENTRIES. Scan for "@". Read the entry type (characters up to
whitespace or one of , = { } ( ) " #), lower-cased, then skip whitespace. If
the next character is not "{" or "(", skip that "@". The entry closes with
"}" or ")" to match.
  @comment: skip only the "@"; scanning continues inside the comment.
  @preamble: read one value and ignore it.
  @string{name = value}: define a macro (name lower-cased).
  Any other type: the key is everything up to the first "," or the closing
  character outside braces, trimmed ("Erd\\H{o}s1959" is one key). Then fields "name = value" separated by commas. A
  field name is read like a type and lower-cased; a field without a name or
  "=" is skipped up to the next "," or the entry's closing character, whichever
comes first; braced and quoted values in it are skipped whole, read as VALUES
reads them. Reaching the closing character this way ends the entry. A later field
  with the same name replaces the earlier one. An entry with no key and no
  fields is dropped, and so is any entry whose title is missing or empty.
VALUES are parts joined by "#": {braced} text (nested braces, a backslash
escapes the next character, braces are kept inside), "quoted" text (a quote
inside braces does not end it), digits, or a bare word, which is replaced by
a macro of that name (case-insensitive) or kept as written. Month macros
jan..dec mean January..December. Unterminated values run to the end of the
text. Whitespace runs in a value collapse to one space, and the value is
trimmed.

PLAIN TEXT. plain(v) applies these steps in order, each replacing every
non-overlapping match from left to right:
  1. optional "{", then backslash and one of " ' ` ^ ~ = .  (or one of
     c v u H when followed by whitespace or "{"), optional whitespace,
     optional "{", one ASCII letter or \\i or \\j (the dotless letters, read as
     i and j, when not followed by a letter, digit or "_"), optional "}",
     optional "}"  ->  the
     letter plus the combining mark (U+0308, U+0301, U+0300, U+0302, U+0303,
     U+0304, U+0307, U+0327, U+030C, U+0306, U+030B in that order), NFC.
  2. {\\ss} {\\o} {\\O} {\\ae} {\\AE} {\\l} {\\L} {\\i}, or the same without braces
     when the next character is not an ASCII letter, digit or "_" (one
     following space is consumed)  ->  ß ø Ø æ Æ ł Ł ı.
  3. \\emph{x} \\textit{x} \\textbf{x} \\mathrm{x} \\textrm{x}, x without braces  ->  x.
  4. backslash before one of & % $ # _ { }  ->  that character.
  5. remove every { and } not directly after a backslash.
  6. ~ -> space; collapse whitespace runs to one space; trim.

DRAFT FIELDS from an entry's fields (each one used is removed from
"fields" unless stated):
  key, type   from the entry.
  title       plain(title).
  authors     author, or editor if there is no author field. Split on
              whitespace-"and"-whitespace (any case). For each part: plain
              it and drop it if empty; keep it as is if it contains a comma,
              is "others" (any case) or starts with "{" and ends with "}";
              otherwise move the last space-separated word to the front:
              "Ada King Lovelace" -> "Lovelace, Ada King".
  year        the first run of 4 ASCII digits in year, as a number.
  venue       the first of plain(journal), plain(booktitle), plain(publisher)
              that is not empty, so journal = {} does not hide a booktitle;
              absent when all are empty or missing. journal always leaves
              the fields; booktitle leaves them only when journal was empty;
              publisher never does.
  abstract    plain(abstract); empty means absent.
  doi         with a leading http(s)://doi.org/ or dx.doi.org/ removed
              (case-insensitive); empty means absent.
  url, file   as written; an empty value stays "" rather than absent.
  notes       annote, else note, as written.
  arxiv       arxivid; else eprint when archiveprefix or eprinttype is
              "arxiv" (any case); else the id in an arxiv.org/abs|pdf|html/
              url (matched ignoring case, so a V3 version suffix and .PDF are removed
              too); else eprint when it
              starts with NNNN.NNNN. A leading "arXiv:" and a trailing vN are
              removed. When an arxiv id is found, archiveprefix, eprinttype
              and primaryclass are removed; otherwise eprint stays in fields.
  tags        keywords split on ";" or ",", each plained; empty ones and
              ones starting with doi: url: arxiv: isbn: issn: pmid: pmc:
              (any case) or containing http:// or https:// are dropped.
  fields      every remaining field, raw (collapsed) values.
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
max_examples = 150
timeout_seconds = 300
```
