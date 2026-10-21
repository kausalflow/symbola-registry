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

## What this version of the pack covers

Version 1 covers the three pure components everything else leans on:

| Component | What it does |
| --- | --- |
| `lightkone/search-query@1` | The search box: filters (`tag:`, `author:`, `year:`, `in:`, `has:`, `no:`, `is:`), words with accent folding, ranking, sort orders, and the trash rule |
| `lightkone/bibtex-import@1` | Reading BibTeX from Paperpile, Zotero, JabRef and Google Scholar into paper drafts, including LaTeX accents, macros, author names and arXiv ids |
| `lightkone/bibtex-export@1` | Writing a paper as the exact BibTeX entry lightkone writes, byte for byte |

Later versions add the citation key, PDF filing, library merge and tidy
components, the `library.json` data contract, the MCP server's tools, and UI
acceptance scenarios.

## Who it is for

Builders who want lightkone's behavior in their own stack: a different
language, a server instead of a static app, or a fork with their own features.
A build that passes these contracts reads the same queries and BibTeX the same
way lightkone does, so its users' libraries and habits carry over.
