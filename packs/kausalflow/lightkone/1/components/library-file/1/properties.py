"""Behavioral properties for lightkone/library-file.

Libraries are generated the way they arise: imported from Paperpile (Drive
paths, no folders), already saved by lightkone, or edited by other tools
(compact JSON, extra keys). Strings and numbers stay simple here; the
examples pin down escaping and number printing.
"""

import json
import re

from hypothesis import given, strategies as st

from schema import Input

SEGMENTS = ["All Papers", "HINTON", "DOE", "Other", "ML", "Physics", "QFT", "Reading group", "McKay", "2019"]
INDEX = re.compile(r"^(0|[1-9][0-9]*)$")


def clean(s):
    """lightkone/pdf-filing's clean()."""
    s = s.replace("---", "\u2014").replace("--", "\u2013")
    s = re.sub(r'[:/\\?*"<>|]', " - ", s)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"( - )+", " - ", s)
    return re.sub(r"^[\s-]+|[\s-]+$", "", s)


def author_folders(authors):
    return {f for f in (clean(a.split(",")[0].strip()).upper() for a in authors) if f}


def folders_from(file, authors=()):
    """The folder rule of the description, written out independently."""
    names = author_folders(authors)

    def author_folder(d):
        if d == "Other":
            return True
        return d in names if names else d == d.upper() and d != d.lower()

    out = []
    for path in (file or "").split(";"):
        path = path.strip()
        if not path:
            continue
        dirs = path.split("/")[:-1]
        if dirs[:1] == ["All Papers"]:
            dirs = dirs[1:]
        if not dirs or (len(dirs) == 1 and author_folder(dirs[0])):
            continue
        f = "/".join(dirs)
        if f not in out:
            out.append(f)
    return out


paths = st.lists(st.sampled_from(SEGMENTS), max_size=3).map(lambda d: "/".join(d + ["x.pdf"]))


@st.composite
def paper(draw, i):
    p = {"id": f"p{i}", "key": f"Key{i}", "type": draw(st.sampled_from(["article", "book", "misc"])),
         "title": draw(st.sampled_from(["Gauge fields", "Dropout", "Notes on QFT"])),
         "authors": draw(st.lists(st.sampled_from(["Doe, Jane", "Roe, R.", "Hinton, G. E.", "Ml, Kim"]), max_size=2)),
         "tags": draw(st.lists(st.sampled_from(["ml", "physics"]), unique=True, max_size=2)),
         "added": "2024-01-01T00:00:00.000Z", "fields": {}}
    if draw(st.booleans()):
        p["year"] = draw(st.integers(1900, 2030))
    if draw(st.booleans()):
        p["file"] = ";".join(draw(st.lists(paths, min_size=1, max_size=3)))
    if draw(st.booleans()):
        p["folders"] = draw(st.lists(st.sampled_from(["ML", "Physics/QFT"]), unique=True, max_size=2))
    if draw(st.booleans()):
        p["starred"] = True
    if draw(st.booleans()):
        p["trashed"] = "2024-02-01T00:00:00.000Z"
    return p


@st.composite
def library(draw):
    data = {"format": "lightkone-library", "version": 1,
            "papers": [draw(paper(i)) for i in range(draw(st.integers(0, 4)))]}
    if draw(st.booleans()):
        data["bibSync"] = draw(st.lists(st.just({"folder": "", "repo": "a/b", "path": "refs.bib"}), max_size=1))
    if draw(st.booleans()):
        data["note"] = "kept elsewhere"
    if draw(st.booleans()):
        data = {"source": {"tool": "sync", "at": 3}, **data}
    return data


@st.composite
def stored(draw):
    """(data, text): a library and the text of the file holding it."""
    data = draw(library())
    indent = draw(st.sampled_from([None, 1, 2]))
    return data, json.dumps(data, indent=indent, ensure_ascii=False)


def run(impl, text):
    return impl(Input(text=text))


@given(stored())
def test_saved_file_keeps_exactly_the_library(impl, s):
    data, text = s
    out = json.loads(run(impl, text).library)
    expect = {"format": "lightkone-library", "version": 1, "papers": data["papers"]}
    if data.get("bibSync"):
        expect["bibSync"] = data["bibSync"]
    expect.update((k, v) for k, v in data.items() if k not in ("format", "version", "papers", "bibSync"))
    for p in expect["papers"]:
        p.setdefault("folders", folders_from(p.get("file"), p["authors"]))
    assert out == expect
    assert list(out) == list(expect), "other tools' keys come after lightkone's, in the file's order"


@given(stored())
def test_papers_gain_folders_from_paperpile_paths(impl, s):
    data, text = s
    out = run(impl, text)
    papers = json.loads(out.library)["papers"]
    for before, after in zip(data["papers"], papers):
        assert after["folders"] == before.get("folders", folders_from(before.get("file"), before["authors"]))
        assert list(after)[: len(before)] == list(before), "existing keys keep their order; folders goes last"
    assert out.foldered == sum(1 for p in data["papers"] if "folders" not in p and folders_from(p.get("file"), p["authors"]))


@given(stored())
def test_layout_is_one_space_indented_json(impl, s):
    data, text = s
    out = run(impl, text)
    assert out.library == json.dumps(json.loads(out.library), indent=1, ensure_ascii=False)


@given(stored())
def test_writes_only_when_the_text_changes(impl, s):
    data, text = s
    out = run(impl, text)
    assert out.written == (out.library != text)
    assert (out.bib is None) == (not out.written)
    if not out.written:
        assert out.library == text


@given(stored())
def test_saving_again_writes_nothing(impl, s):
    data, text = s
    first = run(impl, text)
    again = run(impl, first.library)
    assert not again.written and again.library == first.library and again.foldered == 0


@given(library(), st.booleans())
def test_bib_has_one_entry_per_live_paper_in_order(impl, data, pretty):
    text = json.dumps(data) + ("\n" if pretty else "")
    out = run(impl, text)
    assert out.written
    heads = re.findall(r"^@(\w+)\{([^,\n]*),$", out.bib, re.M)
    live = [p for p in data["papers"] if not p.get("trashed")]
    assert heads == [(p["type"] or "misc", p["key"]) for p in live]
    assert (out.bib == "") == (not live)


not_a_library = st.one_of(
    st.sampled_from(["", "nope", "{", "[]", "null", "true", "3", '"x"', "{}", "NaN"]),
    st.builds(lambda f: json.dumps({"format": f, "version": 1, "papers": []}),
              st.sampled_from(["", "lightkone", "Lightkone-library", "lightkone-library ", "paperpile"])),
    st.builds(lambda p: json.dumps({"format": "lightkone-library", "version": 1, **p}),
              st.sampled_from([{}, {"papers": {}}, {"papers": 3}, {"papers": "abc"}, {"papers": [None]}, {"papers": [1, {}]}])),
)


@given(not_a_library)
def test_anything_else_is_refused(impl, text):
    try:
        out = run(impl, text)
    except ValueError:
        return
    raise AssertionError(f"accepted a file that is not a lightkone library: {out}")
