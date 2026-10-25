# pdf-filing notes

- FOLDER is "Other" when there is no first author, or when `clean(surname(first)).toUpperCase()` is empty. I read "that is empty" as the cleaned, upper-cased surname.
- `who` uses the trimmed raw surnames and leaves out empty ones. Only `head` as a whole goes through `clean` (example 18: `Dash- 2000`).
- With no authors, `who` is the cleaned title. The 40-character cut applies to it too.
- "No year" means `year` is null, undefined or "". The schema has `year >= 1`, so I did not settle what year 0 does (the app should not store one). It would print as `Who 0`.
- Taken names: other papers' `pdf`, plus `"papers/" + part.trim()` for each `;` part of their `file`. Entries with the paper's own id are ignored.
- Trimming and lengths use JS `trim`/`trimEnd`/`trimStart` and UTF-16 `.length`. Characters outside the BMP are out of scope for v1.
- No flags filed.
