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
