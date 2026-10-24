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
