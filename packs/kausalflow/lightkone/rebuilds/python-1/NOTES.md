# Notes on the v1 spec pack

## bibtex-export
- Fully determined by the description. One small point: whether `author` is written for
  `authors = [""]`. I followed "written when present": the list is non-empty, so the line is
  `author = {{}}` (the properties expect the same).
- `keywords` is left out when `";".join(tags)` is empty, so `tags = [""]` writes nothing but
  `["", ""]` writes `;`.

## search-query
- **Repeated `year:` filters.** The description says "Filters (all must hold)", and
  `test_terms_are_conjunctive` says the same, but the example note "the last year filter wins"
  (`year:1974 year:2017` -> `vaswani17`) contradicts it. My reading: a single *exact* year is
  last-wins; every `A-B` range must hold, alongside the exact year. This is the only reading I
  found that fits both the example and the property for every year pair in the generator. If
  lightkone actually keeps one year slot (last wins for any form), then
  `year:2018 year:2016-2019` would give a different result. It would help if the spec said
  which one.
- `year:` values that are neither `N` nor `N-M` (unspecified): I chose to match nothing.
- Tokenizing: `field:"..."` and `"..."` are recognised whatever comes after the closing quote.
  An unknown field with a quoted value (`foo:"a b"`) is kept as a word, quotes included, as
  the raw token.
- `title` sort uses code-point order. That is only defined for ASCII, as the spec says.

## bibtex-import
- **Malformed fields.** "Skipped up to the next comma" was settled only by the example
  "malformed fields are skipped": in it, `volume = 7` after `this is not a field,` and
  `= {no name},` is also lost. My reading: the skip stops *at* the comma without consuming
  it, and a field that starts at a comma has no name, so the skip goes on to the next comma.
  In effect, everything after the first malformed field in an entry is lost (the skip is
  brace-aware and stops at the entry's closing character). The spec should say so.
- The example note "a } in the key ends the entry before its fields, so the entry has no
  title and is dropped" confirms that the key is read up to the first `,` or closing
  character, with no brace awareness.
- Backslash escapes: the spec mentions them only for `{braced}` values. I also apply them
  inside `"quoted"` values, so `"G\"odel"` reads as `G\"odel`, not as a value that ends early.
- plain() step 4 then step 5: `\{` becomes `{` in step 4, and step 5 then removes it, because
  it is no longer after a backslash. I applied the steps literally, so `a \{b\} c` ->
  `a b c`. It's unclear whether that is intended.
- Step 2: the "one following space is consumed" applies only to the form without braces.
- "X, else Y" for venue (journal / booktitle / publisher) and for notes (annote / note): I
  chose *presence* of the field, like author/editor, so `journal = {}` with a `booktitle`
  gives no venue and leaves booktitle in fields. Only the field that was used is removed.
  Example 20 supports removing only the used field (`note` stays when `annote` is used), but
  does not settle presence versus non-empty.
- arxiv: `arxivid` counts only when non-empty. When an id is found, I remove `eprint` and
  `arxivid` as well as archiveprefix/eprinttype/primaryclass. That is how I read "otherwise
  eprint stays in fields". The "starts with NNNN.NNNN" test is on the raw eprint, before
  `arXiv:` is stripped. The URL id is `[^?#\s]+` after `abs|pdf|html/`, then `.pdf` and `vN`
  are removed.
- doi prefix: `^https?://(dx\.)?doi\.org/`, case-insensitive. A bare `doi.org/` with no
  scheme is not removed.
- Tags: `http://` / `https://` are matched case-insensitively, like the prefixes.
- Bare value tokens are read up to whitespace or a stop character. All digits means a number;
  anything else is looked up as a macro: @string first, then the month names.
- `@string` macros store the collapsed, trimmed value.
- `@preamble` reads one value, and scanning resumes right after it.

## Revision 1 (search-query, contract sha256:ed12c430…)
- The revised description and the new property `test_only_the_last_year_filter_counts` settle
  the `year:` question. Only the last `year:` term in the query applies, whatever its form
  (`year:2017 year:1900-2020` behaves as the range; `year:1900-1950 year:1974` as 1974). My
  first reading (exact year last-wins, ranges conjunctive) was wrong, and the implementation now
  keeps one year slot. An unparseable last `year:` value still matches nothing (unspecified).
