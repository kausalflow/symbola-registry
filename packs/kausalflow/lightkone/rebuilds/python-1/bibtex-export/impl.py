"""lightkone/bibtex-export@1: write one paper as a BibTeX entry."""

import re

_ESC = re.compile(r"(?<!\\)([&%#])")


def _escape(s: str) -> str:
    return _ESC.sub(r"\\\1", s)


def _present(v) -> bool:
    return v is not None and v != ""


def _get(obj, name, default=None):
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def run(input):
    p = _get(input, "paper")
    typ = _get(p, "type", "") or ""
    key = _get(p, "key", "") or ""
    authors = _get(p, "authors", []) or []
    year = _get(p, "year")
    venue = _get(p, "venue")
    doi = _get(p, "doi")
    arxiv = _get(p, "arxiv")
    url = _get(p, "url")
    abstract = _get(p, "abstract")
    tags = _get(p, "tags", []) or []
    file = _get(p, "file")
    fields = _get(p, "fields", {}) or {}

    out = [("title", "{" + _escape(_get(p, "title", "") or "") + "}")]
    if authors:
        out.append(("author", " and ".join(
            a if ("," in a or a == "others") else "{" + a + "}" for a in authors)))
    if year is not None:
        out.append(("year", str(year)))
    venue_field = "booktitle" if typ in ("inproceedings", "incollection") else "journal"
    if _present(venue) and not fields.get(venue_field):
        out.append((venue_field, _escape(venue)))
    if _present(doi):
        out.append(("doi", doi))
    if _present(arxiv):
        out.append(("eprint", arxiv))
        out.append(("archiveprefix", "arXiv"))
    if _present(url):
        out.append(("url", url))
    if _present(abstract):
        out.append(("abstract", _escape(abstract)))
    kw = ";".join(tags)
    if kw:
        out.append(("keywords", kw))
    if _present(file):
        out.append(("file", file))
    for k, v in fields.items():
        if _present(v) and not k.startswith("lightkone-"):
            out.append((k, v))

    width = max(len(n) for n, _ in out)
    body = ",\n".join(f"  {n.ljust(width)} = {{{v}}}" for n, v in out)
    return {"text": f"@{typ or 'misc'}{{{key},\n{body}\n}}\n"}
