# tidy: notes

API: `findDuplicates(papers): Group[]`, `run({papers})`, plus the normalisers `normDoi(s)`, `normArxiv(s)` (both return "" for blank/null input), `normTitle(s)` and `matchKeys(paper)`.

Rules as built (from obligations tidy.*, the examples and properties):
- Match keys: `doi:` + normDoi (trim, lower-case, strip `^https?://(dx\.)?doi\.org/`; a bare `doi.org/` is not stripped), `arxiv:` + normArxiv (trim, lower-case, strip `^arxiv:` then `v\d+$`); blank results give no key. Title: NFKD, lower-case, keep `[a-z0-9]`; longer than 20 is a key on its own, 4-20 is a key together with the first author's surname (before the first comma, NFKD, lower-case, `[a-z]` only, "" when no authors), 3 or fewer gives no key. Shared keys join papers transitively.
- Papers with a truthy `trashed` are ignored (`""` is not trashed). Missing `authors`/`tags`/`folders`/`fields` are empty.
- Keeper: has a PDF, then has notes (truthy), then the oldest `added` (string order), then library order.
- Patch: `tags`/`folders` are the full merged lists (keeper first, then the others in library order, each once); `fields` the full merged object (keeper wins, then earlier papers); `added` the oldest; `notes` every distinct trimmed non-empty note joined with a blank line (present even when only the keeper has notes, example 11); `starred: true` when any is starred; `abstract, doi, arxiv, url, venue, year, pdf, file, opened` only when the keeper's is empty and then from the first other paper (library order) that has one. Absent patch fields are omitted, not null.
- JS semantics: `trim()` (not Python's `strip()`), JS `\d` (ASCII digits).

For the app:
- Extra paper keys (`html`, `markdown`, `key`, `type`, ...) are ignored; the keeper keeps its own `key`. Patch `tags`, `folders`, `fields` are replacements (they already include the keeper's values), so applying a patch is `Object.assign(keeper, patch)` and then trashing the others. Note `folders: []` is always present, so applying adds an empty `folders` list to a keeper without one.
- `opened` follows the same "first other with a value" rule as the other fill fields (only example 15 shows it); a "latest opened" reading was not chosen because nothing in the spec says it.
- A saved web page's `html`/`markdown` are not filled from duplicates (not in the contract's Patch).
- `fields` keys are set with `defineProperty`, so a key such as `__proto__` is kept.
- Rejected input (ValueError): papers not a list, missing or duplicate ids.
- No flags filed.
