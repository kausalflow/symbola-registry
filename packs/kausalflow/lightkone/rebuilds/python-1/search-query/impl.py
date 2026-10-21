"""lightkone/search-query@1: filter and order papers by a query string."""

import re
import unicodedata

_TOKEN = re.compile(r'([A-Za-z0-9_]+):"([^"]*)"|"([^"]*)"|(\S+)')
_FIELD = re.compile(r"^([A-Za-z0-9_]+):(.*)$", re.S)
_FILTERS = {"tag", "author", "year", "in", "has", "no", "is"}
_YEAR_ONE = re.compile(r"^\s*(\d+)\s*$")
_YEAR_RANGE = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*$")


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F).lower()


def _get(obj, name, default=None):
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _parse(query: str):
    filters = []  # (field, value)
    words = []
    for m in _TOKEN.finditer(query or ""):
        if m.group(1) is not None:
            field = m.group(1).lower()
            if field in _FILTERS:
                filters.append((field, m.group(2)))
            else:
                words.append(m.group(0))
        elif m.group(3) is not None:
            words.append(m.group(3))
        else:
            tok = m.group(4)
            fm = _FIELD.match(tok)
            if fm and fm.group(1).lower() in _FILTERS:
                filters.append((fm.group(1).lower(), fm.group(2)))
            else:
                words.append(tok)
    return filters, words


class _Q:
    def __init__(self, query):
        filters, words = _parse(query)
        self.words = [fold(w) for w in words]
        self.tags = []
        self.authors = []
        self.folders = []
        self.has = []
        self.no = []
        self.starred = False
        self.recent = False
        self.trash = False
        self.year = None  # (lo, hi) of the last year: term, or "bad"
        for field, value in filters:
            if field == "tag":
                self.tags.append(fold(value))
            elif field == "author":
                self.authors.append(fold(value))
            elif field == "in":
                self.folders.append(fold(value).rstrip("/"))
            elif field in ("has", "no"):
                v = value.lower()
                if v in ("pdf", "abstract", "arxiv", "notes"):
                    (self.has if field == "has" else self.no).append(v)
            elif field == "is":
                v = value.lower()
                if v == "starred":
                    self.starred = True
                elif v == "recent":
                    self.recent = True
                elif v == "trash":
                    self.trash = True
            elif field == "year":
                m1 = _YEAR_ONE.match(value)
                m2 = _YEAR_RANGE.match(value)
                if m1:
                    self.year = (int(m1.group(1)), int(m1.group(1)))
                elif m2:
                    self.year = (int(m2.group(1)), int(m2.group(2)))
                else:
                    self.year = "bad"


def _texts(p):
    title = fold(_get(p, "title", ""))
    authors = fold(" ; ".join(_get(p, "authors", []) or []))
    parts = [_get(p, "abstract"), _get(p, "venue"), " ".join(_get(p, "tags", []) or []),
             _get(p, "key"), _get(p, "doi"), _get(p, "arxiv"), _get(p, "notes")]
    rest = fold(" ".join(x for x in parts if x))
    return title, authors, rest


def _has(p, what):
    if what == "pdf":
        return bool(_get(p, "pdf") or _get(p, "file"))
    return bool(_get(p, what))


def _matches(p, q: _Q, author_text):
    if bool(_get(p, "trashed")) != q.trash:
        return False
    tags = [fold(t) for t in (_get(p, "tags", []) or [])]
    for t in q.tags:
        if t not in tags:
            return False
    for a in q.authors:
        if a not in author_text:
            return False
    year = _get(p, "year")
    if q.year == "bad":  # unspecified in v1; chosen: matches nothing
        return False
    if q.year is not None and not (year and q.year[0] <= year <= q.year[1]):
        return False
    if q.folders:
        folders = [fold(f) for f in (_get(p, "folders") or [])]
        for target in q.folders:
            if not any(f == target or f.startswith(target + "/") for f in folders):
                return False
    for h in q.has:
        if not _has(p, h):
            return False
    for n in q.no:
        if bool(_get(p, n)):
            return False
    if q.starred and not _get(p, "starred"):
        return False
    if q.recent and not _get(p, "opened"):
        return False
    return True


def run(input):
    papers = list(_get(input, "papers", []) or [])
    q = _Q(_get(input, "query", ""))
    sort = _get(input, "sort", "added") or "added"

    hits = []  # (paper, score)
    for p in papers:
        title, authors, rest = _texts(p)
        if not _matches(p, q, authors):
            continue
        total = 0
        ok = True
        for w in q.words:
            s = 5 * (w in title) + 4 * (w in authors) + (w in rest)
            if s == 0:
                ok = False
                break
            total += s
        if ok:
            hits.append((p, total))

    if sort == "added":
        if q.recent:
            sort = "opened"
        elif q.words:
            sort = "relevance"

    added = lambda h: _get(h[0], "added", "")
    if sort == "added":
        hits.sort(key=added, reverse=True)
    elif sort == "relevance":
        hits.sort(key=added, reverse=True)
        hits.sort(key=lambda h: h[1], reverse=True)
    elif sort == "year":
        hits.sort(key=lambda h: _get(h[0], "year") or 0, reverse=True)
    elif sort == "title":
        hits.sort(key=lambda h: _get(h[0], "title", ""))
    elif sort == "opened":
        hits.sort(key=added, reverse=True)
        hits.sort(key=lambda h: _get(h[0], "opened") or "", reverse=True)

    return {"ids": [_get(p, "id") for p, _ in hits]}
