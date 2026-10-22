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

DOIS = ["10.1000/ABC", "https://doi.org/10.1000/abc", " 10.1000/abc ", "10.2000/xyz", "http://dx.doi.org/10.2000/XYZ", "doi.org/10.2000/xyz"]
ARXIV = ["1207.0580", "arXiv:1207.0580v2", "1706.03762", "ARXIV:1706.03762V1", "1706.03762v3"]
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
    return d or "undefined"


def norm_arxiv(a):
    a = re.sub(r"v\d+$", "", re.sub(r"^arxiv:", "", a.strip().lower()))
    return a or "undefined"


def keys(p: Paper) -> list[str]:
    out = []
    if p.doi:
        out.append("doi:" + norm_doi(p.doi))
    if p.arxiv:
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
