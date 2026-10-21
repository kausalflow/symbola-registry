"""lightkone/bibtex-import@1: read BibTeX text into paper drafts."""

import re
import unicodedata

WS = " \t\r\n"
STOP = set(WS) | set(',={}()"#')
_WS_RUN = re.compile(r"[ \t\r\n]+")

MONTHS = {
    "jan": "January", "feb": "February", "mar": "March", "apr": "April",
    "may": "May", "jun": "June", "jul": "July", "aug": "August",
    "sep": "September", "oct": "October", "nov": "November", "dec": "December",
}


def collapse(s: str) -> str:
    return _WS_RUN.sub(" ", s).strip(WS)


# ---------------------------------------------------------------- reader

class _Reader:
    def __init__(self, text: str):
        self.t = text
        self.n = len(text)
        self.macros = {}

    def skip_ws(self, pos):
        while pos < self.n and self.t[pos] in WS:
            pos += 1
        return pos

    def read_name(self, pos):
        start = pos
        while pos < self.n and self.t[pos] not in STOP:
            pos += 1
        return self.t[start:pos], pos

    def _delimited(self, pos, quoted):
        """pos is just after the opening { or ". Returns (text, pos after close)."""
        t, n = self.t, self.n
        depth = 0 if quoted else 1
        out = []
        while pos < n:
            c = t[pos]
            if c == "\\":
                out.append(t[pos:pos + 2])
                pos += 2
                continue
            if c == "{":
                depth += 1
            elif c == "}":
                if quoted:
                    if depth > 0:
                        depth -= 1
                else:
                    depth -= 1
                    if depth == 0:
                        return "".join(out), pos + 1
            elif c == '"' and quoted and depth == 0:
                return "".join(out), pos + 1
            out.append(c)
            pos += 1
        return "".join(out), pos

    def read_value(self, pos):
        """Read parts joined by '#'. Returns (collapsed value, pos)."""
        parts = []
        while pos < self.n:
            c = self.t[pos]
            if c == "{":
                s, pos = self._delimited(pos + 1, quoted=False)
            elif c == '"':
                s, pos = self._delimited(pos + 1, quoted=True)
            else:
                word, pos = self.read_name(pos)
                if not word:
                    break
                if word.isdigit():
                    s = word
                else:
                    low = word.lower()
                    if low in self.macros:
                        s = self.macros[low]
                    elif low in MONTHS:
                        s = MONTHS[low]
                    else:
                        s = word
            parts.append(s)
            p2 = self.skip_ws(pos)
            if p2 < self.n and self.t[p2] == "#":
                pos = self.skip_ws(p2 + 1)
                continue
            break
        return collapse("".join(parts)), pos

    def skip_field(self, pos, close):
        """Skip up to the next comma (not consumed) or the entry's close."""
        if pos < self.n and self.t[pos] == ",":
            pos += 1
        depth = 0
        while pos < self.n:
            c = self.t[pos]
            if depth == 0 and (c == "," or c == close):
                break
            if c == "{":
                depth += 1
            elif c == "}" and depth > 0:
                depth -= 1
            pos += 1
        return pos

    def entries(self):
        t, n = self.t, self.n
        pos = 0
        while True:
            at = t.find("@", pos)
            if at < 0:
                return
            typ, p = self.read_name(at + 1)
            typ = typ.lower()
            p = self.skip_ws(p)
            if p >= n or t[p] not in "{(":
                pos = at + 1
                continue
            if typ == "comment":
                pos = at + 1
                continue
            close = "}" if t[p] == "{" else ")"
            p += 1
            if typ == "preamble":
                _, pos = self.read_value(self.skip_ws(p))
                continue
            if typ == "string":
                p = self.skip_ws(p)
                name, p = self.read_name(p)
                p = self.skip_ws(p)
                if name and p < n and t[p] == "=":
                    val, p = self.read_value(self.skip_ws(p + 1))
                    self.macros[name.lower()] = val
                    p = self.skip_ws(p)
                    if p < n and t[p] == close:
                        p += 1
                pos = p
                continue
            # ordinary entry: key
            start = p
            while p < n and t[p] not in (",", close):
                p += 1
            key = t[start:p].strip(WS)
            fields = {}
            if p < n and t[p] == ",":
                p += 1
                while True:
                    p = self.skip_ws(p)
                    if p >= n:
                        break
                    if t[p] == close:
                        p += 1
                        break
                    name, q = self.read_name(p)
                    q = self.skip_ws(q)
                    if not name or q >= n or t[q] != "=":
                        p = self.skip_field(q, close)
                        continue
                    val, q = self.read_value(self.skip_ws(q + 1))
                    fields[name.lower()] = val
                    q = self.skip_ws(q)
                    if q < n and t[q] == ",":
                        q += 1
                    p = q
            elif p < n:
                p += 1  # closing character right after the key
            pos = p
            if key or fields:
                yield typ, key, fields


# ---------------------------------------------------------------- plain()

_MARKS = {'"': "\u0308", "'": "\u0301", "`": "\u0300", "^": "\u0302", "~": "\u0303",
          "=": "\u0304", ".": "\u0307", "c": "\u0327", "v": "\u030C", "u": "\u0306", "H": "\u030B"}
_ACCENT = re.compile(
    r"\{?\\(?:([\"'`^~=.])|([cvuH])(?=[ \t\r\n{]))[ \t\r\n]*\{?([A-Za-z])\}?\}?")
_SPECIAL_MAP = {"ss": "ß", "o": "ø", "O": "Ø", "ae": "æ", "AE": "Æ", "l": "ł", "L": "Ł", "i": "ı"}
_SPECIAL = re.compile(r"\{\\(ss|o|O|ae|AE|l|L|i)\}|\\(ss|o|O|ae|AE|l|L|i)(?![A-Za-z0-9_]) ?")
_STYLE = re.compile(r"\\(?:emph|textit|textbf|mathrm|textrm)\{([^{}]*)\}")
_ESCAPED = re.compile(r"\\([&%$#_{}])")
_BRACE = re.compile(r"(?<!\\)[{}]")


def _accent(m):
    mark = _MARKS[m.group(1) or m.group(2)]
    return unicodedata.normalize("NFC", m.group(3) + mark)


def plain(v: str) -> str:
    v = _ACCENT.sub(_accent, v)
    v = _SPECIAL.sub(lambda m: _SPECIAL_MAP[m.group(1) or m.group(2)], v)
    v = _STYLE.sub(r"\1", v)
    v = _ESCAPED.sub(r"\1", v)
    v = _BRACE.sub("", v)
    v = v.replace("~", " ")
    return collapse(v)


# ---------------------------------------------------------------- drafts

_AND = re.compile(r"[ \t\r\n]+and[ \t\r\n]+", re.IGNORECASE)
_YEAR = re.compile(r"[0-9]{4}")
_DOI = re.compile(r"^https?://(?:dx\.)?doi\.org/", re.IGNORECASE)
_ARXIV_URL = re.compile(r"arxiv\.org/(?:abs|pdf|html)/([^?#\s]+)", re.IGNORECASE)
_NEW_STYLE = re.compile(r"^[0-9]{4}\.[0-9]{4}")
_ARXIV_PREFIX = re.compile(r"^arxiv:", re.IGNORECASE)
_VERSION = re.compile(r"v[0-9]+$")
_TAG_SPLIT = re.compile(r"[;,]")
_ID_PREFIXES = ("doi:", "url:", "arxiv:", "isbn:", "issn:", "pmid:", "pmc:")


def _authors(raw: str) -> list:
    out = []
    for part in _AND.split(raw):
        s = plain(part)
        if not s:
            continue
        r = part.strip(WS)
        if "," in s or s.lower() == "others" or (r.startswith("{") and r.endswith("}")):
            out.append(s)
        else:
            words = s.split(" ")
            out.append(s if len(words) < 2 else f"{words[-1]}, {' '.join(words[:-1])}")
    return out


def _clean_arxiv(a: str) -> str:
    a = _ARXIV_PREFIX.sub("", a.strip(WS))
    return _VERSION.sub("", a)


def _draft(typ, key, fields):
    f = dict(fields)
    if "title" not in f:
        return None
    title = plain(f.pop("title"))
    if not title:
        return None

    if "author" in f:
        authors = _authors(f.pop("author"))
    elif "editor" in f:
        authors = _authors(f.pop("editor"))
    else:
        authors = []

    year = None
    if "year" in f:
        m = _YEAR.search(f.pop("year"))
        if m:
            year = int(m.group(0))

    venue = None
    if "journal" in f:
        venue = plain(f.pop("journal"))
    elif "booktitle" in f:
        venue = plain(f.pop("booktitle"))
    elif "publisher" in f:
        venue = plain(f["publisher"])
    venue = venue or None

    abstract = plain(f.pop("abstract")) if "abstract" in f else None
    abstract = abstract or None

    doi = _DOI.sub("", f.pop("doi")) if "doi" in f else None
    doi = doi or None

    url = f.pop("url") if "url" in f else None
    file = f.pop("file") if "file" in f else None

    if "annote" in f:
        notes = f.pop("annote")
    elif "note" in f:
        notes = f.pop("note")
    else:
        notes = None

    arxiv = None
    eprint = f.get("eprint")
    is_arxiv_kind = any((f.get(k) or "").strip(WS).lower() == "arxiv"
                        for k in ("archiveprefix", "eprinttype"))
    if f.get("arxivid"):
        arxiv = _clean_arxiv(f["arxivid"])
    elif eprint and is_arxiv_kind:
        arxiv = _clean_arxiv(eprint)
    elif url and _ARXIV_URL.search(url):
        a = _ARXIV_URL.search(url).group(1)
        if a.endswith(".pdf"):
            a = a[:-4]
        arxiv = _clean_arxiv(a)
    elif eprint and _NEW_STYLE.match(eprint):
        arxiv = _clean_arxiv(eprint)
    arxiv = arxiv or None
    if arxiv:
        for k in ("arxivid", "eprint", "archiveprefix", "eprinttype", "primaryclass"):
            f.pop(k, None)

    tags = []
    if "keywords" in f:
        for part in _TAG_SPLIT.split(f.pop("keywords")):
            s = plain(part)
            low = s.lower()
            if not s or low.startswith(_ID_PREFIXES) or "http://" in low or "https://" in low:
                continue
            tags.append(s)

    return {
        "key": key, "type": typ, "title": title, "authors": authors, "year": year,
        "venue": venue, "abstract": abstract, "doi": doi, "arxiv": arxiv, "url": url,
        "tags": tags, "file": file, "notes": notes, "fields": f,
    }


def run(input):
    text = input.get("text", "") if isinstance(input, dict) else input.text
    papers = []
    for typ, key, fields in _Reader(text or "").entries():
        d = _draft(typ, key, fields)
        if d is not None:
            papers.append(d)
    return {"papers": papers}
