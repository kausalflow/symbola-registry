# Lightkone

Lightkone is a research-paper library for people who read a lot of papers and
want to own their data. It is a static web app with no server: the library is
plain files (`lightkone/library.json` and a generated `library.bib`) in storage
the owner chooses, such as the browser, an S3 or R2 bucket, or a GitHub
repository.

People use it to collect papers (by DOI, arXiv id, BibTeX import or PDF), find
them again with a small query language, file them in folders, tag them, read
and highlight PDFs, and keep `.bib` files in sync with their manuscripts on
Overleaf.

## What the pack covers

`PRODUCT.md` describes the whole app a build delivers: its shape, screens, flows
and interfaces. The eight components below are its core, the parts whose
behaviour must come out exactly, and each has checks:

| Component | What it does |
| --- | --- |
| `lightkone/search-query@1` | The search box: filters (`tag:`, `author:`, `year:`, `in:`, `has:`, `no:`, `is:`), words with accent folding, ranking, sort orders, and the trash rule |
| `lightkone/bibtex-import@1` | Reading BibTeX from Paperpile, Zotero, JabRef and Google Scholar into paper drafts, including LaTeX accents, macros, author names and arXiv ids |
| `lightkone/bibtex-export@1` | Writing a paper as the exact BibTeX entry lightkone writes, byte for byte |
| `lightkone/citation-key@1` | Paperpile-style citation keys for new papers, unique within the library |
| `lightkone/pdf-filing@1` | Where a paper's PDF goes, named the way Paperpile names it |
| `lightkone/library-merge@1` | Merging two devices' edits to `library.json` without losing either |
| `lightkone/tidy@1` | Finding duplicate papers and how to merge each group |
| `lightkone/library-file@1` | Reading `library.json` and writing it back, with `library.bib`, byte for byte |

The app around them (`PRODUCT.md`) is specified in prose; a few of its
decisions are obligations that no check covers yet.

## Who it is for

Builders who want lightkone in their own stack: the app rebuilt, a different
language, a server instead of a static app, or a fork with their own features.
A build that passes these contracts reads the same queries and BibTeX the same
way lightkone does, so its users' libraries and habits carry over.

## Non-goals

- Full-text search inside PDFs. Search covers metadata and notes only.
- Collaboration. A library belongs to one person; there are no shared libraries, roles or permissions.
- Being a general BibTeX validator. Import reads what the common managers export and skips the rest.
- Pixel-level UI. `PRODUCT.md` specifies screens and flows, not layout or styling.

## Priorities

When goals conflict, earlier ones win:

1. **The owner's data stays theirs and stays readable.** Never lose or corrupt a library, and keep it in plain files.
2. **Compatibility with lightkone's files.** A build reads and writes the same `library.json` and `library.bib`, byte for byte where the contracts say so.
3. **Same answers to the same queries,** so habits carry over between builds.
4. Speed and features beyond the pack.

## Who resolves gaps

kausalflow, as the namespace holder. If the pack doesn't settle something, record the
question and the reading you chose in `NOTES.md` next to your build; obligations marked
`open` in `obligations.toml` are yours to choose. Unsettled questions are answered in the
next version of the pack.
