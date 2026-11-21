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
