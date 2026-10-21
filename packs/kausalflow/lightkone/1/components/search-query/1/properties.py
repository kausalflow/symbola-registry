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
