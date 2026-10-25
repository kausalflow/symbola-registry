# bibtex-import: notes

`symbola test`: PASS, 54 checks (41 examples, 13 properties). No flags filed. I found no contradictions between the description and the examples.

## Readings chosen where the spec is unclear

- **Backslash in quoted values.** The description gives backslash escaping only for `{braced}` text. So in `"quoted"` text a `\"` ends the value, and only brace depth protects a quote.
- **Author brace test.** "Starts with `{` and ends with `}`" is checked on the raw part, before `plain()`, and the name that comes out is the plained one. Example 5 needs this: the braces are gone but the name is not flipped.
- **Step 2 of plain().** "One following space is consumed" means a literal U+0020, and only for the unbraced form (`\o x` becomes `øx`).
- **Step 3 of plain().** "x without braces" means x contains no `{` or `}` (`[^{}]*`).
- **Steps 4 and 5 of plain().** Applied literally in order, so an escaped `\{` becomes `{` in step 4 and is then removed in step 5.
- **DOI prefix.** Read as `^https?://(dx\.)?doi\.org/`, case-insensitive. A bare `doi.org/` with no scheme is not removed.
- **arXiv.**
  - An empty `arxivid` counts as missing, and the next rule is tried.
  - The "starts with NNNN.NNNN" check runs on the eprint as written. An `arXiv:2101.00001` eprint with no archiveprefix or eprinttype therefore stays in fields.
  - The URL id is the path after `abs|pdf|html/` up to `?`, `#` or the end, with a `vN` and `.pdf` removed (both case-insensitive).
  - Removing `vN` from `arxivid` or `eprint` values is case-sensitive, as example 28 shows.
  - When an id is found, `arxivid`, `eprint`, `archiveprefix`, `eprinttype` and `primaryclass` all leave the fields.
- **Tags.** The `http://` and `https://` test is case-sensitive. "(any case)" is read as applying only to the identifier prefixes.
- **Venue.** `booktitle` leaves the fields when `journal` is missing or plains to empty.
- **Title.** An entry is dropped when `plain(title)` is empty.
- **Repeated fields.** A later duplicate replaces the value but keeps the field's first position in `fields`, as a JavaScript object would.
- **Month macros and @string.** Month macros are predefined. An `@string` with the same name overrides one.
- **Bare words.** A bare word made only of digits is never looked up as a macro.
- **Odd types.** An empty entry type (`@{...}`) or one containing `@` is read as an ordinary entry type.
- **@string and @preamble leftovers.** After the value, a matching close character is consumed if it comes next. Otherwise scanning simply carries on.
