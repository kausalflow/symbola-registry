# Notes on this build

A TypeScript build of the lightkone pack (`spec/`, kausalflow/lightkone v1):
the static web app at `/app/`, its front page, the `/api/fetch` pass-through and
the MCP endpoint, with the eight components as its core.

## Where the build stopped (PRODUCT.md, Order)

| Tier | State |
| --- | --- |
| 1. Core app | **Done.** Flows 1–10, browser storage, two remote backends (S3-compatible bucket, GitHub), the reader with highlights, the installable offline shell. |
| 2. Devices and integrations | **Done.** Flows 11–13, the Android share target, the **+ Lightkone** bookmarklet, plugins by URL, settings backup (encrypted with a passphrase). |
| 3. With a Claude key | **Partly.** Explain (reader), Summarize (details) and Chats → Ask are built. Table, Agree or disagree, Review draft, and finding a paper from a description are not. |
| 4. Discover and write | **Not built.** PRODUCT.md says lightkone's own docs describe these, and the pack doesn't include those docs. |

## Components

Every component passes `symbola test`, and `symbola attest` reports PASSED
(attestations in `attestations/`, runner key `attestations/runner.pub`):

| Component | Checks |
| --- | --- |
| bibtex-export | 25/25 |
| bibtex-import | 54/54 |
| citation-key | 25/25 |
| library-file | 62/62 |
| library-merge | 31/31 |
| pdf-filing | 27/27 |
| search-query | 106/106 |
| tidy | 30/30 |

Each component is a pure module in `impl/<name>/src/index.ts`. The app imports
that module, and `impl/<name>/main.mjs` is the same source bundled for the
harness, so the checks test the code the app runs. No flags were filed: none
of the builds found an example that disagrees with its description or
properties. Each `impl/<name>/NOTES.md` lists the readings chosen inside that
component. The open obligation `search.year-number-spelling` is settled as
ASCII digits with an optional fraction; `+2`, `1e3` and `Infinity` are not
years.

## How it was tested

- `npm run test:impl`: every component's contract checks.
- `npm test`: unit tests for the app core:
  - the save loop on in-memory storage: two devices editing the same library, no write when nothing changed, read-only and newer-version libraries;
  - the add flow's duplicate rule and key stability;
  - the MCP endpoint against an in-memory GitHub API, including an MCP write that races an app save;
  - the S3 request signer against AWS's two published SigV4 examples.
- `tests/e2e.ts`: the built app in Chromium (Playwright), flows 1–13 end to end, plus offline reopen, offline saves written on reconnect, the phone layout, and the share target.

Not verified here: this session's network policy blocks the outside services
(arXiv, Crossref, OpenAlex, Semantic Scholar, Unpaywall, Anthropic, GitHub,
S3). The end-to-end test answers them with mocks I wrote from the services'
documented response shapes. So the parsing is tested, but no live lookup has
run. The S3 backend has not talked to a real bucket, the Cloudflare Pages
Functions have not been deployed (their handlers ran under `vite dev` and
`vite preview`), and the Claude features have not made a real API call.

## Readings chosen where the pack is silent or unclear

1. **Full text vs. BRIEF.md.** BRIEF.md lists "Full-text search inside PDFs" as a
   non-goal, but PRODUCT.md flow 6 specifies full text. I followed PRODUCT.md,
   which is more specific. search-query stays metadata-only; full text only
   rescues papers it dropped on words, as flow 6 says.
2. **Full-text results under other sorts.** With relevance, text-only matches
   come after every record match. With year, title or opened they are merged
   into that order. PRODUCT.md only speaks of relevance.
3. **The add duplicate rule.** DOI and arXiv id use tidy's `normDoi` and
   `normArxiv`. "Same citation key" compares the key a draft arrived with (from
   BibTeX) to existing keys. Duplicates found within one batch also fill the
   first copy rather than becoming two papers.
4. **New paper defaults.** `type` is `article` when a source gives none. Papers
   from lookups get `folders: []` (or the Paperpile folders, via
   `library-file`'s rule, which `foldersFromFile` exposes). Absent fields are
   left out, never `null`.
5. **The example papers** have ids `example-1` and `example-2` and the tag
   `Example`. **Remove them** deletes them from the library and their files from
   storage, and remembers this in settings, so they are never added again.
6. **Annotation files** (`lightkone/annotations/<id>.json`). Their format isn't
   given, so this build writes
   `{format: "lightkone-annotations", version: 1, paper, highlights: [{id, page, rects, text, note?, color?, created}], deleted?}`.
   `rects` are fractions of the page, so they hold at any zoom. Saves merge with
   the stored file by highlight id, and `deleted` keeps deletions from coming
   back. That way two devices, or a reconnecting one, don't drop each other's
   highlights.
7. **Saved web pages** go to `lightkone/pages/<id>.html` and `.md`. PRODUCT.md
   names the `html` and `markdown` keys but not the paths. The Markdown is the
   page's `<article>`, else `<main>`, else `<body>`, without navigation,
   scripts or forms.
8. **bibSync targets** are `{folder, repo, path, branch?}`. A folder's `.bib`
   holds the folder and the folders inside it (the `in:` rule), outside the
   trash, in library order, each entry as `bibtex-export` writes it, joined by
   `"\n"` like `library.bib`. A sync reads the file first and commits only when
   the text differs, so several devices don't churn. Writes use the BibTeX sync
   token from Settings, not the storage token.
9. **Emptying the trash** deletes each paper and the files lightkone made for it:
   its `pdf`, annotations, text and saved page. PDFs named only by a Paperpile
   `file` path are left alone, since the owner copied those in.
10. **Tidy merges** apply tidy's patch to the keeper, skipping absent fields, and
    move the others to the trash. **Published versions** of arXiv preprints come
    from Semantic Scholar (`ARXIV:` id to DOI, ignoring arXiv's own
    `10.48550/…` DOIs), then Crossref. Using one sets the DOI, journal, year,
    type, volume and pages, and keeps the key.
11. **MCP address.** The browser seals the storage settings itself with the
    site's public key (ECDH P-256, HKDF, AES-GCM), fetched from `/api/mcp-key`.
    Only the site's private key (the `MCP_PRIVATE_KEY` secret) opens them. That
    meets "encrypted with a key only the site holds" without the settings ever
    reaching the site in the clear. The endpoint is Streamable HTTP with
    stateless JSON replies. `search_papers` over MCP is search-query without
    full text, and `read_paper` returns the text file or saved page once the app
    has read it.
12. **The pass-through** is one endpoint, `GET /api/fetch?url=…`. It answers only
    requests whose `Sec-Fetch-Site` is `same-origin` (or whose Origin or Referer
    is the site), refuses private and loopback hosts, forwards no cookies or
    credentials, and stores nothing. Crossref, OpenAlex, Semantic Scholar and
    Unpaywall are called directly, since they allow browsers.
13. **Offline.** For remote storage, this device keeps copies of `library.json`,
    the annotations, the texts and saved pages, plus the last 25 PDFs opened.
    Those PDFs get the **Offline** label. File writes made offline wait in an
    outbox. `library.json` is never queued: on reconnect it is saved again,
    which re-reads and merges.
14. **Read-only storage.** GitHub reports read-only when the repository's
    `permissions.push` is false. A fine-grained token's own permissions can't be
    read, so a token without write access shows up as a save error instead. S3
    has no cheap way to ask, so a bucket is treated as writable.
15. **GitHub's ".bib folder to import on open"** runs every open through
    bibtex-import, citation-key and the duplicate rule, so re-imports change
    nothing. No PDFs are fetched for those papers.
16. **Lookups.** Besides arXiv ids (new and old style), DOIs and links, a line of
    four or more words is looked up as a title on Crossref. It is taken only
    when the title really matches. A dropped PDF with no DOI or arXiv id on its
    first page is kept under the PDF's own title, with its PDF.
17. **Changing storage** offers to copy the library and its files to the new
    storage when that storage has no library yet. Without the copy, a move from
    this browser to GitHub would open an empty library.
18. **Citation styles.** "A CSL journal style" is read as a choice of journal
    styles built in: Nature, IEEE and Chicago author-date, besides LaTeX,
    BibTeX, Markdown and APA 7. A CSL processor with downloadable styles would
    be a plugin.

## Open questions for kausalflow

- Do BRIEF.md's non-goal and PRODUCT.md's flow 6 both still stand? (See reading 1.)
- What is the format of `lightkone/annotations/<id>.json`, and of a bibSync
  target? Builds that guess differently can't share these files.
- Where do saved web pages live, and how is a page's "main text" chosen?
- Does the add duplicate rule apply within one pasted batch? This build says yes.
- Does flow 13's "encrypted with a key only the site holds" allow sealing in the
  browser with the site's public key, or does lightkone encrypt on the server?
