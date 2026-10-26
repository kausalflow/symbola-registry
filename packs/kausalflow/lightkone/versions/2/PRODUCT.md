# Lightkone: the product

A build of this pack is the lightkone app, not a library or a demo page. The eight
components are its core: every place below that names one must call it, and must
not reimplement its rules. Everything else here is the product around them. Where
this file is silent, choose what a careful builder would, and note it in `NOTES.md`.

## Shape

- A **static web app** for one person's research-paper library: a front page that
  says what lightkone is, and the app itself at `/app/`. It builds to static files
  any static host can serve. There is no lightkone server and no account: the
  browser reads and writes the owner's storage and calls public metadata APIs
  directly.
- Server code is allowed only as small **pass-throughs** for APIs that browsers
  cannot call (CORS), deployed with the site (lightkone uses Cloudflare Pages
  Functions under `/api/`: `arxiv`, `pdf`, `page`, `published`, `tex` and
  `mcp-link`), plus the optional **MCP endpoint**. Pass-throughs hold no user
  data. They refuse, with 403, a request the browser marks as coming from another
  website (`Sec-Fetch-Site: cross-site`, or an `Origin` of another host); a
  request with no `Origin` is allowed. Each address gets a number of calls a
  minute per service (pdf, page and published 30, arxiv 60, tex 120, mcp-link
  10, others 60), then 429 with `Retry-After`; the counts may be kept per server
  instance.
- **Installable** (a web app manifest and a service worker): it opens offline with
  the library and the last 25 PDFs opened, and on Android it is a share target.
  Reads from remote storage keep a copy on the device (lightkone uses Cache
  Storage) that answers when the network is gone; a save or a highlight made
  offline waits on the device and is written when the browser is back online.
- Works on a phone as well as a computer: the reader, the list and the details all
  fit a narrow screen.
- The owner's settings, storage credentials and API keys stay in that browser
  (localStorage), never in the library and never sent to the site.

## Surfaces

The library's files, in whatever storage the owner chose:

| Path | What | Component |
| --- | --- | --- |
| `lightkone/library.json` | Every paper; the source of truth | `library-file`, `library-merge` |
| `lightkone/library.bib` | The whole library outside the trash, rewritten on every save | `library-file`, `bibtex-export` |
| `papers/All Papers/<AUTHOR or Other>/<name>.pdf` | PDFs, filed as Paperpile files them | `pdf-filing` |
| `lightkone/annotations/<paper id>.json` | Highlights and their notes on one paper's PDF (format below) | |
| `lightkone/pages/<paper id>.html`, `.md` | A saved web page: its raw HTML as fetched, and its main text as Markdown (Mozilla Readability) | |
| `lightkone/text/<paper id>.txt` | A paper's text, for search inside PDFs, Ask and MCP (format below) | |

An annotation file is `{"format": "lightkone-annotations", "version": 1, "paper":
<paper id>, "highlights": [...]}`, written with `JSON.stringify(file, null, 1)`.
Each highlight is `{id, page, rects, text, note?, created}`: `page` 1-based,
`rects` a list of `[x, y, width, height]` as fractions of the page's width and
height, `created` an ISO time. A file whose `format` or `paper` does not match is
read as no highlights. A text file holds every page of the PDF in order, each as
`[page N]` (1-based), a newline and the page's text trimmed, with pages joined by
`\n\f\n` (newline, form feed, newline); a page range is read back by splitting on
that separator. A `.bib` sync target in `library.json`'s `bibSync` is
`{folder, repo, path, branch?}` (`folder` "" for the whole library), plus
`tex` (the manuscript's folder) and `aliases` (cited key to paper id) for a
watched manuscript.

A paper's `id` is a random UUID (`crypto.randomUUID()`), given when it is added
and never changed. A paper record carries, besides what the components read: `pdf` (storage key of
its PDF), `notes`, `starred`, `trashed` and `opened` (ISO times), `folders`, and,
for a saved web page, `html` and `markdown` storage keys.

The app's screens:

- **Top bar**: the search box (`/` focuses it), **Add paper**, **Export .bib** of
  the papers in view, Chats, the command palette (Ctrl/⌘K), Help (`?`), and a
  status line for storage and saving (*Offline, saves later*).
- **Side bar**: All papers, Starred, Recently read, Trash; the folder tree (nested,
  `Physics/QFT`); tags, most used first; and the tools grouped as *Discover*,
  *Write* and *Organize* (see Order for which are core).
- **Paper list**: the search results, each row with title, authors, year, venue,
  tags, a star, and an Offline label when kept on the device.
- **Paper details**: the record, its citation key (tap to copy), folders and tags
  to edit, star, notes on the whole paper, **Read**, **Get free PDF**, **Attach /
  Replace PDF**, **Cite**, move to trash or restore, and plugin actions.
- **Reader**: the PDF full screen (pdf.js), zoom, dark pages, and text selection
  with **Highlight**, **Highlight + note** and, with a Claude key, **Explain**.
  Saved web pages open as their Markdown in a reading column, or as the saved HTML
  in a sandbox with no scripts.
- **Settings**: where the library lives, PDFs (contact email for open-access
  copies), Claude key, BibTeX sync token, plugins by URL, MCP address, and
  **Backup** (export and import the settings, encrypted when given a passphrase).
- **MCP endpoint** at `/mcp/<token>` with the tools `search_papers`, `get_paper`,
  `read_paper`, `list_tags`, `add_paper`, `tag_papers` and `add_note`.

## Flows

Each flow ends with a save unless it only reads. **Save** means: read
`library.json` again, merge this device's changes into what is stored now with
`library-merge` (base = what this device last read), write it with `library-file`,
which also rewrites `library.bib`. Saves are debounced and write the whole
library. A read-only storage opens the library read-only.

1. **Open.** Open `/app/`. With no storage set, the library lives in this browser
   (IndexedDB) and a brand-new library starts with two example papers tagged
   `Example`, *Attention Is All You Need* and *Transformer models: an introduction
   and catalog*; **Remove them** deletes them, and they never come back in that
   browser. Opening reads `library.json` with `library-file`.
2. **Choose storage.** Settings, **Where your library lives**: this browser, an
   S3-compatible bucket (endpoint, bucket, region, optional folder, access key and
   secret; requests are signed in the browser) or a private GitHub repository
   (owner/name, fine-grained token, branch, optional folder of `.bib` files to
   import on open; every save is a commit). The `.bib` files in that folder are
   read on every open through `bibtex-import` and added with flow 3's duplicate
   rule, so opening again adds nothing twice; each paper from one carries the
   file's name without `.bib` in `fields["lightkone-source"]`. Save, and the side bar's status line
   shows the storage once it opens.
3. **Add by identifier or text.** **Add paper**, paste one per line: arXiv ids or
   links, DOIs or doi.org links, publisher pages, other web pages, or BibTeX.
   Identifiers resolve through lookups (arXiv, Crossref, Semantic Scholar,
   OpenAlex); BibTeX goes through `bibtex-import`. Each new paper gets a key from
   `citation-key` (an imported key is kept unless taken; a key never changes once
   given), and a free PDF is fetched when there is one (arXiv directly; others via
   Unpaywall when a contact email is set) and stored at the path `pdf-filing`
   gives. A web page that is not a paper is saved as its raw HTML plus its main
   text as Markdown. A paper already in the library is not added twice: a draft
   is a duplicate of a paper (trashed ones included) with the same DOI or arXiv id
   (normalised as `tidy` does), the same citation key, or the same title once
   lower-cased and stripped of everything but `a-z0-9`, when that is longer than
   20 characters. The existing paper then gains the draft's `abstract`, `doi`,
   `arxiv`, `url`, `venue`, `year` and `file` where it has none, and its tags and
   folders; nothing else changes. The rule also applies within one batch, so
   the same paper pasted twice is added once. This is a different rule from
   `tidy`'s. A new paper keeps everything its draft has, including `notes`
   (from `annote` or `note` on import); a duplicate's notes are not added.
4. **Import a .bib file.** The same panel takes a `.bib` file, through
   `bibtex-import` and `citation-key`, with the same duplicate rule. Papers
   imported from Paperpile land in the folders their `file` paths name, by the
   rule `library-file` states (author folders are skipped).
5. **Add PDFs.** **Add files**, or drop PDFs anywhere: each is identified from the
   DOI or arXiv id on its first page, added, and filed with `pdf-filing`; a PDF for
   a paper already in the library is attached to it.
6. **Find.** Type in the search box. `search-query` decides which papers show and
   in what order, from the query and the sort; the side bar's views (a folder, a
   tag, Starred, Recently read, Trash) are the same search with a filter. Full
   text is the one addition: once a paper's text is in `lightkone/text/`, a paper
   that `search-query` drops only because some word matched nowhere in its record
   is still shown when its text holds every word, ranked below every record match
   when sorting by relevance. Filters still apply to it. The results list says how
   many papers' PDFs have not been read for this yet and offers to read them.
7. **Organize.** In the details: put a paper in folders, tag it, star it, write
   notes, move it to the trash or restore it. **Empty trash** (shown in the Trash view)
   asks first, then removes those papers from the library for good. Their files
   stay in storage: PDFs, saved pages, annotations and text are not deleted.
8. **Read and highlight.** **Read** opens the reader and records `opened`.
   Highlights and their notes are written to `lightkone/annotations/<id>.json`,
   never into the PDF. Highlights made offline are written on reconnect.
9. **Tidy up.** Side bar, *Organize*: `tidy` finds the groups of duplicates and
   what each keeper gains; the app shows each group, and merging applies the patch
   to the keeper and moves the others to the trash. It also offers published
   versions of arXiv preprints (journal, DOI, volume, pages), keeping keys.
10. **Cite and export.** **Cite** copies a paper as *Post* (short plain text for
    social media: no markup, LaTeX math in the title turned into Unicode such as
    `$H_0$` → `H₀`, one link), APA, Markdown, a LaTeX `\cite{key}`, a BibTeX entry
    (`bibtex-export`), or any journal style of the Citation Style Language:
    formatted with citeproc-js, the style fetched from the CSL project's
    repository (`citation-style-language/styles`, following a dependent style to
    its parent) when first used and kept in the browser, chosen from a short list
    (APS, AIP, IOP, ApJ, JCAP, Nature, Science, IEEE, Chicago) or searched in the
    full style index. **Export .bib**
    downloads the papers in view as `bibtex-export` writes them.
11. **Sync a folder's .bib to GitHub.** Open a folder and press **Sync .bib**,
    choose a repository and path; from then on the app rewrites that file with a
    commit whenever the folder's papers change, and leaves it alone when the text
    is the same. The file holds the folder's papers and those of every folder
    inside it (folder names compared ignoring case), never the trash, sorted by
    citation key (`localeCompare`), written by `bibtex-export` after a first line
    `% <folder, or "Whole library">: <n> paper(s), kept up to date by Lightkone.
    Edits here are overwritten.` and a blank line. The default path is the
    folder name with each run of characters other than ASCII letters, digits,
    `_`, `.` and `-` turned into one `-`, leading and trailing `-` removed,
    lower-cased, plus `.bib` (`library.bib` for the whole library). Targets are kept in `library.json`'s `bibSync`.
12. **Use several devices.** Same storage settings on another device (or **Backup**
    → import). Coming back to the tab picks up changes; every save merges, so two
    devices or an MCP client never overwrite each other.
13. **Connect an AI app.** With a bucket or GitHub storage, **Make my AI app
    address** posts the storage settings to the site (`/api/mcp-link`), which
    tries the storage once and returns `https://<site>/mcp/<token>`: the settings
    encrypted with a secret only the site holds (`MCP_SECRET`). The site keeps no
    copy; each MCP request decrypts the address and talks to the storage. MCP writes go through the
    same save.

## Interfaces

- **Storage adapter**: `read(path)`, `write(path, data, contentType)`,
  `list(prefix)`, optional `remove(path)` and `access()` ("read" or "write"). The
  three backends above implement it; a new one is a plugin.
- **Plugins**: an ES module loaded from a URL whose default export may provide
  `storage` providers, `lookups` (identifier to paper draft), `importers` (text to
  paper drafts), `actions` (buttons on a paper) and `settings` fields. The built-in
  backends and lookups use the same interface.
- **Outside services**: arXiv, Crossref, Semantic Scholar, OpenAlex, Unpaywall, and
  the Anthropic API called from the browser with the owner's own key.

## Order

When a build cannot do everything at once, build in this order and say in
`NOTES.md` where it stopped:

1. **Core app**: flows 1 to 10 with browser storage and at least one remote
   backend, the reader with highlights, and the installable offline shell.
2. **Devices and integrations**: flows 11 to 13, the share target, the
   **+ Lightkone** bookmarklet, plugins by URL, and settings backup.
3. **With a Claude key**: Explain, Summarize, Chats (Ask, Table, Agree or
   disagree, Review draft), finding a paper from a description.
4. **Discover and write**: New on arXiv, Citation map, Search by equation, Writing
   helpers, Watch my manuscript, Export to Obsidian, Offline papers, Shared
   libraries, Dullaby night reading.

Tiers 3 and 4 are described in lightkone's own documentation, which this pack does
not repeat; a build may leave them out.
