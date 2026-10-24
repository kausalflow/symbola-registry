# kausalflow/lightkone (version 1): component search-query-v1

Part of the pack at [../pack.md](../pack.md). Pack digest: `sha256:075c30cc624fda7b44c574318d20224fc97184ed3505597bf0fe7616defdfd10`.

The contract folder, to check a build against: [search-query-v1.tar.gz](search-query-v1.tar.gz). Unpack it, then run `symbolon impl-init <build folder> --contract <contract folder>`, `symbolon keygen` once, and `symbolon attest <contract folder> <build folder>`.

## components/search-query/versions/1/examples.jsonl

The first 3 of 84 lines. The rest is part of the spec too: read the whole file at [components/search-query/versions/1/examples.jsonl](../files/components/search-query/versions/1/examples.jsonl).

```json
{"input": {"papers": {"$fixture": "library.json"}, "sort": "added", "query": ""}, "output": {"ids": ["vaswani17", "nodate", "hinton12", "wilson74", "godel31", "noether18", "cafe", "emptytrash"]}, "note": "empty query: every paper outside the trash, newest added first; equal times keep input order"}
{"input": {"papers": {"$fixture": "library.json"}, "sort": "added", "query": "   "}, "output": {"ids": ["vaswani17", "nodate", "hinton12", "wilson74", "godel31", "noether18", "cafe", "emptytrash"]}, "note": "whitespace only is the empty query"}
{"input": {"papers": {"$fixture": "library.json"}, "sort": "added", "query": "attention"}, "output": {"ids": ["vaswani17", "nodate"]}, "note": "words rank by relevance under the default sort: title 5, author 4, rest 1"}
```

## components/search-query/versions/1/fixtures/library.json

```json
[
 {
  "id": "hinton12",
  "key": "Hinton2012-ab",
  "title": "Improving neural networks by preventing co-adaptation",
  "authors": [
   "Hinton, Geoffrey",
   "Srivastava, Nitish"
  ],
  "year": 2012,
  "venue": "arXiv",
  "arxiv": "1207.0580",
  "tags": [
   "ml",
   "Dropout"
  ],
  "added": "2024-03-01T09:00:00.000Z",
  "folders": [
   "ML/Regularization"
  ],
  "starred": true,
  "opened": "2024-06-01T08:00:00.000Z"
 },
 {
  "id": "godel31",
  "key": "Godel1931",
  "title": "Über formal unentscheidbare Sätze",
  "authors": [
   "Gödel, Kurt"
  ],
  "year": 1931,
  "venue": "Monatshefte für Mathematik",
  "tags": [
   "logic",
   "Classics"
  ],
  "added": "2024-01-15T12:00:00.000Z",
  "folders": [
   "Math",
   "Math/Logic"
  ],
  "notes": "incompleteness; see re:search notes",
  "pdf": "pdfs/godel31.pdf"
 },
 {
  "id": "noether18",
  "key": "Noether1918",
  "title": "Invariante Variationsprobleme",
  "authors": [
   "Noether, Emmy"
  ],
  "year": 1918,
  "abstract": "Symmetries imply conservation laws.",
  "tags": [
   "physics",
   "Classics"
  ],
  "added": "2024-01-15T12:00:00.000Z",
  "folders": [
   "Physics"
  ],
  "file": "All Papers/N/Noether 1918.pdf"
 },
 {
  "id": "wilson74",
  "key": "Wilson1974",
  "title": "Confinement of quarks",
  "authors": [
   "Wilson, Kenneth G."
  ],
  "year": 1974,
  "venue": "Physical Review D",
  "doi": "10.1103/PhysRevD.10.2445",
  "tags": [
   "physics",
   "qft",
   "lattice"
  ],
  "added": "2024-02-10T10:00:00.000Z",
  "folders": [
   "Physics/QFT",
   "Physics/QFT/Lattice"
  ],
  "opened": "2024-05-20T07:30:00.000Z"
 },
 {
  "id": "vaswani17",
  "key": "Vaswani2017-xy",
  "title": "Attention is all you need",
  "authors": [
   "Vaswani, Ashish",
   "Shazeer, Noam",
   "Parmar, Niki"
  ],
  "year": 2017,
  "venue": "NeurIPS",
  "arxiv": "1706.03762",
  "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.",
  "tags": [
   "ml",
   "To Read"
  ],
  "added": "2024-04-02T15:45:00.000Z",
  "folders": [
   "ML"
  ],
  "pdf": "pdfs/vaswani17.pdf",
  "opened": "2024-05-20T07:30:00.000Z"
 },
 {
  "id": "lecun98",
  "key": "LeCun1998",
  "title": "Gradient-based learning applied to document recognition",
  "authors": [
   "LeCun, Yann",
   "Bottou, Léon",
   "Bengio, Yoshua",
   "Haffner, Patrick"
  ],
  "year": 1998,
  "venue": "Proceedings of the IEEE",
  "doi": "10.1109/5.726791",
  "tags": [
   "ml",
   "cnn"
  ],
  "added": "2024-03-01T09:00:00.000Z",
  "folders": [
   "ML"
  ],
  "trashed": "2024-06-02T00:00:00.000Z"
 },
 {
  "id": "cafe",
  "key": "Dupont2021",
  "title": "Le café et la naïveté des réseaux",
  "authors": [
   "Dupont, Zoé"
  ],
  "year": 2021,
  "tags": [
   "Café"
  ],
  "added": "2023-12-31T23:59:59.999Z",
  "folders": [
   "Café/Ébauches"
  ],
  "notes": "naive networks"
 },
 {
  "id": "nodate",
  "key": "",
  "title": "Untitled preprint on attention",
  "authors": [],
  "tags": [],
  "added": "2024-04-02T15:45:00.000Z",
  "abstract": "",
  "notes": "",
  "starred": false
 },
 {
  "id": "emptytrash",
  "key": "Smith2020",
  "title": "A paper whose trashed field is empty",
  "authors": [
   "Smith, Jane"
  ],
  "year": 2020,
  "tags": [],
  "added": "2022-07-07T07:07:07.000Z",
  "trashed": "",
  "opened": ""
 },
 {
  "id": "binned",
  "key": "Old2010",
  "title": "Attention in the trash",
  "authors": [
   "Old, Author"
  ],
  "year": 2010,
  "tags": [
   "ml"
  ],
  "added": "2021-01-01T00:00:00.000Z",
  "trashed": "2024-06-03T00:00:00.000Z",
  "starred": true
 }
]
```

## components/search-query/versions/1/fixtures/titles.json

```json
[
 {
  "id": "t0",
  "title": "banana",
  "added": "2024-01-01T00:00:00.000Z",
  "year": 2000
 },
 {
  "id": "t1",
  "title": "Apple",
  "added": "2024-01-02T00:00:00.000Z",
  "year": 2001
 },
 {
  "id": "t2",
  "title": "apple",
  "added": "2024-01-03T00:00:00.000Z",
  "year": 2002
 },
 {
  "id": "t3",
  "title": "Äpple",
  "added": "2024-01-04T00:00:00.000Z",
  "year": 2003
 },
 {
  "id": "t4",
  "title": "äpple",
  "added": "2024-01-05T00:00:00.000Z",
  "year": 2004
 },
 {
  "id": "t5",
  "title": "apple pie",
  "added": "2024-01-06T00:00:00.000Z",
  "year": 2000
 },
 {
  "id": "t6",
  "title": "apple-pie",
  "added": "2024-01-07T00:00:00.000Z",
  "year": 2001
 },
 {
  "id": "t7",
  "title": "applepie",
  "added": "2024-01-08T00:00:00.000Z",
  "year": 2002
 },
 {
  "id": "t8",
  "title": "Apple Pie",
  "added": "2024-01-09T00:00:00.000Z",
  "year": 2003
 },
 {
  "id": "t9",
  "title": "10 things",
  "added": "2024-01-10T00:00:00.000Z",
  "year": 2004
 },
 {
  "id": "t10",
  "title": "2 things",
  "added": "2024-01-11T00:00:00.000Z",
  "year": 2000
 },
 {
  "id": "t11",
  "title": "_private",
  "added": "2024-01-12T00:00:00.000Z",
  "year": 2001
 },
 {
  "id": "t12",
  "title": "(Draft) notes",
  "added": "2024-01-13T00:00:00.000Z",
  "year": 2002
 },
 {
  "id": "t13",
  "title": "\"Quoted\" title",
  "added": "2024-01-14T00:00:00.000Z",
  "year": 2003
 },
 {
  "id": "t14",
  "title": "Über alles",
  "added": "2024-01-15T00:00:00.000Z",
  "year": 2004
 },
 {
  "id": "t15",
  "title": "uber",
  "added": "2024-01-16T00:00:00.000Z",
  "year": 2000
 },
 {
  "id": "t16",
  "title": "Zebra",
  "added": "2024-01-17T00:00:00.000Z",
  "year": 2001
 },
 {
  "id": "t17",
  "title": "zebra",
  "added": "2024-01-18T00:00:00.000Z",
  "year": 2002
 },
 {
  "id": "t18",
  "title": "ćevapi",
  "added": "2024-01-19T00:00:00.000Z",
  "year": 2003
 },
 {
  "id": "t19",
  "title": "cevapi",
  "added": "2024-01-20T00:00:00.000Z",
  "year": 2004
 },
 {
  "id": "t20",
  "title": "Ωmega",
  "added": "2024-01-21T00:00:00.000Z",
  "year": 2000
 },
 {
  "id": "t21",
  "title": "omega",
  "added": "2024-01-22T00:00:00.000Z",
  "year": 2001
 },
 {
  "id": "t22",
  "title": "李",
  "added": "2024-01-23T00:00:00.000Z",
  "year": 2002
 },
 {
  "id": "t23",
  "title": "A",
  "added": "2024-01-24T00:00:00.000Z",
  "year": 2003
 },
 {
  "id": "t24",
  "title": "a",
  "added": "2024-01-25T00:00:00.000Z",
  "year": 2004
 },
 {
  "id": "t25",
  "title": "",
  "added": "2024-01-26T00:00:00.000Z",
  "year": 2000
 },
 {
  "id": "t26",
  "title": "   spaced",
  "added": "2024-01-27T00:00:00.000Z",
  "year": 2001
 }
]
```

## components/search-query/versions/1/properties.py

```python
"""Behavioral properties for lightkone/search-query.

Each property states one rule from the description in symbolon.toml, checked
on small generated libraries whose vocabulary overlaps on purpose: shared
words, accents, mixed case, nested folders, ties in dates.
"""

import unicodedata

from hypothesis import given, strategies as st

from schema import Input, Paper

# Helpers that restate the description. They are the spec, not an implementation hint.


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F).lower()


def title_text(p: Paper) -> str:
    return fold(p.title)


def author_text(p: Paper) -> str:
    return fold(" ; ".join(p.authors))


def rest_text(p: Paper) -> str:
    parts = [p.abstract, p.venue, " ".join(p.tags), p.key, p.doi, p.arxiv, p.notes]
    return fold(" ".join(x for x in parts if x))


def word_score(p: Paper, word: str) -> int:
    w = fold(word)
    return 5 * (w in title_text(p)) + 4 * (w in author_text(p)) + (w in rest_text(p))


def render(word: str) -> str:
    return f'"{word}"' if " " in word else word


def run(impl, papers, query, sort="added") -> list[str]:
    return impl(Input(papers=papers, query=query, sort=sort)).ids


def newest_first(papers, key=lambda p: p.added):
    """Descending by key; Python's sort is stable, so equal papers keep their input order."""
    return sorted(papers, key=key, reverse=True)


# Generated libraries

TITLE_WORDS = ["alpha", "beta", "Gamma", "café", "Über", "naïve", "networks", "qft", "lattice", "ML"]
AUTHORS = ["Hinton, Geoffrey", "Gödel, Kurt", "Noether, Emmy", "Alpha, Ann", "Müller, Jörg"]
TAGS = ["ml", "ML", "physics", "Café", "to read", "qft"]
FOLDERS = ["Physics", "Physics/QFT", "physics/qft/Lattice", "Math", "Mathematics", "Café/Ébauche"]
TEXTS = ["", "about alpha and beta", "Lattice QFT on networks", "see re:search", "naive café notes", "Gödel"]
TIMES = [f"2024-0{m}-0{d}T10:00:00.000Z" for m in (1, 2, 3) for d in (1, 2)]


def opt(s):
    return st.none() | s


@st.composite
def papers_st(draw, min_size=0, max_size=8, titles=None):
    n = draw(st.integers(min_size, max_size))
    out = []
    for i in range(n):
        title = draw(titles) if titles is not None else " ".join(draw(st.lists(st.sampled_from(TITLE_WORDS), max_size=4)))
        out.append(Paper(
            id=f"p{i}",
            title=title,
            added=draw(st.sampled_from(TIMES)),
            key=draw(st.sampled_from(["", f"Key{i}", "Alpha2020-ab"])),
            authors=draw(st.lists(st.sampled_from(AUTHORS), max_size=3, unique=True)),
            year=draw(opt(st.integers(2015, 2022))),
            venue=draw(opt(st.sampled_from(TEXTS))),
            abstract=draw(opt(st.sampled_from(TEXTS))),
            doi=draw(opt(st.sampled_from(["", "10.1000/alpha", "10.2/xyz"]))),
            arxiv=draw(opt(st.sampled_from(["", "2101.00001"]))),
            tags=draw(st.lists(st.sampled_from(TAGS), max_size=3, unique=True)),
            file=draw(opt(st.sampled_from(["", "All Papers/A/a.pdf"]))),
            pdf=draw(opt(st.sampled_from(["", "pdfs/p.pdf"]))),
            notes=draw(opt(st.sampled_from(TEXTS))),
            folders=draw(opt(st.lists(st.sampled_from(FOLDERS), max_size=2, unique=True))),
            starred=draw(opt(st.booleans())),
            trashed=draw(opt(st.sampled_from(["", "2024-05-01T00:00:00.000Z"]))),
            opened=draw(opt(st.sampled_from(["", *TIMES]))),
        ))
    return out


WORDS = ["alpha", "ALPHA", "alp", "beta", "cafe", "CAFÉ", "uber", "naive", "naïve", "godel", "gödel", "hinton",
         "qft", "lattice", "ml", "net", "alpha beta", "n, g", "re:search", "10.1000", "2101", "key1", "zzz"]
FILTERS = ["tag:ml", "tag:Physics", 'tag:"to read"', "tag:cafe", "author:hinton", "author:godel", "author:\"l, a\"",
           "year:2018", "year:2016-2019", "year:2020-2017", "in:physics", "in:Physics/QFT/", "in:Math", 'in:"cafe/ebauche"',
           "has:pdf", "has:abstract", "has:arxiv", "has:notes", "has:nothing", "no:pdf", "no:abstract", "no:arxiv",
           "no:notes", "is:starred", "is:recent", "is:unknown"]
terms = st.sampled_from(FILTERS) | st.sampled_from(WORDS).map(render)
SORTS = ["added", "year", "title", "relevance", "opened"]


def is_trashed(p: Paper) -> bool:
    return bool(p.trashed)


def satisfies(p: Paper, f: str) -> bool:
    field, _, value = f.partition(":")
    value = value.strip('"')
    if field == "tag":
        return any(fold(t) == fold(value) for t in p.tags)
    if field == "author":
        return fold(value) in author_text(p)
    if field == "year":
        a, _, b = value.partition("-")
        lo, hi = int(a), int(b or a)
        return bool(p.year) and lo <= p.year <= hi
    if field == "in":
        target = fold(value).rstrip("/")
        return any(fold(x) == target or fold(x).startswith(target + "/") for x in p.folders or [])
    if field == "has":
        return {"pdf": bool(p.pdf or p.file), "abstract": bool(p.abstract), "arxiv": bool(p.arxiv),
                "notes": bool(p.notes)}.get(value, True)
    if field == "no":
        return {"pdf": not p.pdf, "abstract": not p.abstract, "arxiv": not p.arxiv,
                "notes": not p.notes}.get(value, True)
    if field == "is":
        return {"starred": bool(p.starred), "recent": bool(p.opened)}.get(value, True)
    raise AssertionError(f)


# Properties


@given(papers=papers_st(), query=st.lists(terms, max_size=3).map(" ".join), sort=st.sampled_from(SORTS))
def test_results_are_distinct_papers_from_the_library(impl, papers, query, sort):
    ids = run(impl, papers, query, sort)
    assert len(ids) == len(set(ids))
    assert set(ids) <= {p.id for p in papers}


@given(papers=papers_st(), query=st.lists(terms, max_size=2).map(" ".join), trash=st.booleans())
def test_trash_shows_only_with_is_trash(impl, papers, query, trash):
    by_id = {p.id: p for p in papers}
    ids = run(impl, papers, ("is:trash " if trash else "") + query)
    assert all(is_trashed(by_id[i]) == trash for i in ids)


@given(papers=papers_st(), a=terms, b=terms, trash=st.booleans())
def test_terms_are_conjunctive(impl, papers, a, b, trash):
    if a.startswith("year:") and b.startswith("year:"):
        return  # only the last year: term counts, see test_only_the_last_year_filter_counts
    prefix = "is:trash " if trash else ""
    both = set(run(impl, papers, f"{prefix}{a} {b}"))
    assert both == set(run(impl, papers, prefix + a)) & set(run(impl, papers, prefix + b))


@given(papers=papers_st(min_size=1), query=st.sampled_from(["", " ", "  \t "]))
def test_empty_query_lists_the_library_newest_first(impl, papers, query):
    expected = [p.id for p in newest_first([p for p in papers if not is_trashed(p)])]
    assert run(impl, papers, query) == expected


@given(papers=papers_st(min_size=1), f=st.sampled_from(FILTERS), trash=st.booleans())
def test_each_filter_selects_what_it_says(impl, papers, f, trash):
    got = set(run(impl, papers, ("is:trash " if trash else "") + f))
    assert got == {p.id for p in papers if is_trashed(p) == trash and satisfies(p, f)}


@given(papers=papers_st(min_size=1), words=st.lists(st.sampled_from(WORDS), min_size=1, max_size=2),
       sort=st.sampled_from(["added", "relevance"]))
def test_words_rank_title_over_author_over_rest(impl, papers, words, sort):
    scored = []
    for p in papers:
        scores = [word_score(p, w) for w in words]
        if not is_trashed(p) and all(scores):
            scored.append((p, sum(scores)))
    by_added = newest_first([p for p, _ in scored])
    rank = {p.id: i for i, p in enumerate(by_added)}
    total = {p.id: s for p, s in scored}
    expected = sorted(rank, key=lambda i: (-total[i], rank[i]))
    assert run(impl, papers, " ".join(render(w) for w in words), sort) == expected


@given(papers=papers_st(), query=st.lists(terms, min_size=1, max_size=3).map(" ".join), sort=st.sampled_from(SORTS))
def test_case_and_accents_in_the_query_do_not_matter(impl, papers, query, sort):
    assert run(impl, papers, query.upper(), sort) == run(impl, papers, query, sort)


@given(papers=papers_st(min_size=1), f=st.sampled_from([""] + FILTERS))
def test_year_sort_puts_later_years_first(impl, papers, f):
    ids = run(impl, papers, f, "year")
    keep = set(ids)
    expected = [p.id for p in newest_first([p for p in papers if p.id in keep], key=lambda p: p.year or 0)]
    assert ids == expected


ASCII_TITLES = st.lists(st.sampled_from(["alpha", "beta", "b", "a1", "zeta 2", "a beta", ""]), max_size=3).map(" ".join)


@given(papers=papers_st(min_size=1, titles=ASCII_TITLES), f=st.sampled_from([""] + FILTERS))
def test_title_sort_is_ascending_and_stable(impl, papers, f):
    ids = run(impl, papers, f, "title")
    keep = set(ids)
    assert ids == [p.id for p in sorted((p for p in papers if p.id in keep), key=lambda p: p.title)]


@given(papers=papers_st(min_size=1), how=st.sampled_from([("", "opened"), ("is:recent", "added"), ("is:recent", "opened")]))
def test_opened_order_and_is_recent(impl, papers, how):
    query, sort = how
    ids = run(impl, papers, query, sort)
    keep = set(ids)
    by_added = newest_first([p for p in papers if p.id in keep])
    assert ids == [p.id for p in newest_first(by_added, key=lambda p: p.opened or "")]


YEARS = [f for f in FILTERS if f.startswith("year:")]


@given(papers=papers_st(min_size=1), first=st.sampled_from(YEARS), last=st.sampled_from(YEARS), word=st.sampled_from(["", "alpha"]))
def test_only_the_last_year_filter_counts(impl, papers, first, last, word):
    assert run(impl, papers, f"{first} {word} {last}") == run(impl, papers, f"{word} {last}")
```

## components/search-query/versions/1/schema/input.json

```json
{
  "$defs": {
    "Paper": {
      "additionalProperties": false,
      "description": "The fields of a lightkone paper that search reads.",
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
          "description": "When it was added, as JavaScript's toISOString writes it.",
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
          "description": "'Last, First' strings, in order.",
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
          "description": "A PDF path from another reference manager.",
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
          "description": "Folder paths like 'Physics/QFT'.",
          "title": "Folders"
        },
        "id": {
          "minLength": 1,
          "title": "Id",
          "type": "string"
        },
        "key": {
          "default": "",
          "description": "BibTeX citation key.",
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
        "opened": {
          "anyOf": [
            {
              "pattern": "^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "default": null,
          "description": "When it was last opened; empty means never.",
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
          "description": "Storage key of a PDF in the library's own storage.",
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
          "description": "When it was moved to the trash.",
          "title": "Trashed"
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
    },
    "query": {
      "description": "What was typed in the search box.",
      "title": "Query",
      "type": "string"
    },
    "sort": {
      "default": "added",
      "enum": [
        "added",
        "year",
        "title",
        "relevance",
        "opened"
      ],
      "title": "Sort",
      "type": "string"
    }
  },
  "required": [
    "papers",
    "query"
  ],
  "title": "Input",
  "type": "object"
}
```

## components/search-query/versions/1/schema/output.json

```json
{
  "additionalProperties": false,
  "properties": {
    "ids": {
      "description": "Ids of the matching papers, in display order.",
      "items": {
        "type": "string"
      },
      "title": "Ids",
      "type": "array"
    }
  },
  "required": [
    "ids"
  ],
  "title": "Output",
  "type": "object"
}
```

## components/search-query/versions/1/schema.py

```python
"""Interface for lightkone/search-query."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TIMESTAMP = r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$"


class Paper(BaseModel):
    """The fields of a lightkone paper that search reads."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    added: str = Field(pattern=TIMESTAMP, description="When it was added, as JavaScript's toISOString writes it.")
    key: str = Field("", description="BibTeX citation key.")
    authors: list[str] = Field(default_factory=list, description="'Last, First' strings, in order.")
    year: int | None = Field(None, ge=1)
    venue: str | None = None
    abstract: str | None = None
    doi: str | None = None
    arxiv: str | None = None
    tags: list[str] = Field(default_factory=list)
    file: str | None = Field(None, description="A PDF path from another reference manager.")
    pdf: str | None = Field(None, description="Storage key of a PDF in the library's own storage.")
    notes: str | None = None
    folders: list[str] | None = Field(None, description="Folder paths like 'Physics/QFT'.")
    starred: bool | None = None
    trashed: str | None = Field(None, description="When it was moved to the trash.")
    opened: str | None = Field(None, pattern=f"^$|{TIMESTAMP}", description="When it was last opened; empty means never.")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    papers: list[Paper] = Field(description="The library, in stored order. Ids are unique.")
    query: str = Field(description="What was typed in the search box.")
    sort: Literal["added", "year", "title", "relevance", "opened"] = "added"

    @model_validator(mode="after")
    def _unique_ids(self) -> "Input":
        if len({p.id for p in self.papers}) != len(self.papers):
            raise ValueError("paper ids must be unique")
        return self


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ids: list[str] = Field(description="Ids of the matching papers, in display order.")
```

## components/search-query/versions/1/symbolon.toml

```toml
[contract]
id = "lightkone/search-query"
version = 1
title = "Search a paper library with lightkone's query language"
description = """
Filters and orders a list of papers by a query string, as lightkone's search
box does. Returns the ids of the matching papers, in display order.

Query terms are separated by whitespace. A term is one of:

  field:value or field:"quoted value"   a filter (field names are ASCII
                                         letters, digits and _, any case)
  "quoted phrase"                        one word that may contain spaces
  anything else                          one word

Filters (all must hold, except year:, where only the last year: term that
counts applies):
  tag:T       some tag of the paper equals T after folding
  author:A    A is a substring of the folded authors joined with " ; "
  year:Y      year equals Y; year:A-B: A <= year <= B (missing year never matches).
              The value is split at "-": A is the first part, B the second,
              later parts are ignored. When A is not a number, or is 0, the
              term does not count (an earlier year: term stays in force).
              When B is missing, empty, 0 or not a number, B is A. So
              year:2017- means 2017 and year:-2017 does not count. A number
              here is ASCII digits with an optional fraction; other
              spellings are unspecified.
  in:F        the paper is in folder F or a folder inside it ("F/..."),
              compared after folding; trailing slashes on F are ignored
  has:X / no:X  for X in pdf, abstract, arxiv, notes. has:pdf accepts either
              pdf or file; no:pdf looks at pdf only. Unknown X is ignored.
  is:starred, is:recent (has been opened), is:trash. Unknown values are ignored.
Any other field:value term is an ordinary word, including the colon. So is a
field with nothing after the colon (author: is the word author:), and an
unknown field with a quoted value is one word, quotes included: o:"a b".

Trashed papers appear only with is:trash, and then only trashed papers appear.

Words: every word must be a substring of the paper's folded title (5 points),
folded author text (4 points) or folded rest (1 point): abstract, venue,
tags joined by spaces, key, doi, arxiv and notes, the non-empty ones joined
by single spaces. A paper's score is the sum over words; a paper where any
word scores 0 is left out.

Folding: Unicode NFKD, remove U+0300..U+036F, then lower case. Values of
has:, no: and is: are only lower-cased. Empty strings, false, and missing
fields are all "absent".

Order. sort=added: newest added first, except that a query with is:recent
orders by opened, and otherwise a query with words orders by relevance.
relevance: higher score first, then newest added. year: higher year first,
missing as 0. title: ascending by the Unicode Collation Algorithm
with the CLDR root collation at its default (tertiary) strength, which is
what JavaScript's a.localeCompare(b) does with no locale or options: letters
first, then accents, then case, lower case first ("apple" < "Apple" <
"Äpple" < "banana"); punctuation and spaces are not ignored and sort before
digits, digits before letters. opened: latest opened first, never-opened
last, then newest added. Papers that compare equal keep their input order.

Full-text search is out of scope.
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
