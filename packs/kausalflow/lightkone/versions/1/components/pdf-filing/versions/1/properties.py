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
