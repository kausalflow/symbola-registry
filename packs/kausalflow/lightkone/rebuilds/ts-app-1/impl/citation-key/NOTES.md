# citation-key: notes

- `assignKeys(drafts, taken)` returns one key per draft; `run({drafts, taken})` wraps it. `baseKey(draft)` (the un-numbered key) is also exported.
- A draft key is kept only when it is a non-empty string not in `taken` and not given earlier in the batch; otherwise a new key is made (examples 7-9).
- JS semantics as specified: `normalize("NFKD")`, `toLowerCase()`, ASCII-only letter filters. Year 0 is written; a missing/null year is omitted.
- No flags filed; description, examples and properties agree.
