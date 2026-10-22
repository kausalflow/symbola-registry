# go-1 rebuild: notes and spec gaps

Go standard library only. Layout: `src/lk` (shared helpers), `src/<component>/main.go`, `build.sh`
(static linux/amd64, `CGO_ENABLED=0 -trimpath -buildvcs=false -ldflags="-s -w"`), and per component a
directory holding only `impl` and `symbolon-impl.toml` (`language = "command"`, `command = ["./impl"]`;
that form was accepted as is).

Result of `symbolon test` for every component: PASS (search-query 82 checks, bibtex-import 41,
bibtex-export 25, citation-key 25, pdf-filing 25, library-merge 29, tidy 26, library-file 46).

## Cross-cutting gaps

* **Unicode tables.** The pack requires NFKD, "Unicode full case mapping" (ß -> SS), Python-style
  `lower()` and NFC of letter+mark, and Go's standard library has none of these (they live in
  `golang.org/x/text`). I generated `src/lk/tables.go` from Python 3.13's `unicodedata` (Unicode 15.1)
  and checked NFKD, lower and upper against Python on 20,000 random strings. The pack does not say
  which Unicode version is meant; a different version can change results for newly assigned characters.
* **Final sigma.** Python's `lower()` maps a word-final Σ to ς; JavaScript does too. The pack only says
  "lower-cased". I implemented the final-sigma rule (approximately: preceded by a cased letter, not
  followed by one, ignoring marks/apostrophes).
* **"Whitespace".** Only bibtex-import says what it means (ASCII space, tab, CR, LF; other whitespace
  "unspecified"). Everywhere else (`trim`, `strip`, `\s`, "whitespace runs") I used JavaScript's
  `\s`/`trim()` set (Unicode White_Space + U+FEFF, not U+0085 or U+001C..1F, which Python's `strip`
  would also remove). Search tokenizing, pdf-filing `clean`, tidy `trim`, library-file path `trim`
  use that set; bibtex-import uses ASCII only everywhere, including inside `plain()` (step 6 and
  "optional whitespace" in step 1).
* **Error type.** Invalid input is reported as `{"error":{"type":"ValueError",...}}` (library-file
  only; the other contracts have no `raises` examples).

## search-query

Hard: tokenizer and the "default sort depends on query" rule. Everything else was direct.

* **Tokenizer is described only by example.** Description: `field:value or field:"quoted value"`,
  `"quoted phrase"`, "anything else one word". Not stated: what `field:"unterminated` is (I treat it
  like `field:\S+`, so the value is `"unterminated`, quote included, consistent with
  example 23 `"\"attention"` "an unmatched quote is part of the word"); what `tag:` (colon, no value) is
  (I make it an ordinary word `tag:`); whether text such as `a"b c"` splits (I take `a"b` as one word
  because "anything else" is non-whitespace). Regex-like order: `\w+:"..."`, `\w+:\S+`, `"..."`, `\S+`.
* **Unknown field with a quoted value.** "Any other field:value term is an ordinary word, including the
  colon." For `foo:"a b"` I make the word `foo:a b` (quotes dropped, original field case kept). The
  alternative `foo:"a b"` (raw text) is equally defensible. No example.
* **Empty quoted word `""`.** It is a word that is a substring of everything, so it scores 5+4+1 and
  also turns on relevance ordering. No example; the description's formula taken literally.
* **`year:` with a malformed value** (`year:abc`, `year:1-`, `year:-5`, `year:2000-2010-2020`, `year:`
  quoted-empty): "unspecified in v1". I make it the last year term (so it replaces earlier ones) and
  match nothing. Not pinned by any check.
* **Year filter on papers with year 0**: schema forbids it; I treat 0 as missing.
* **title sort for anything but lowercase ASCII**: unspecified; I compare the raw strings by code point
  (Python `sorted` on str), stable.
* **explicit sort vs `is:recent`**: description: "sort=added: ... a query with is:recent orders by
  opened". Example 60 shows `sort=year` overrides it. What `sort=relevance` + `is:recent` does is not
  stated; I let the explicit `relevance` win (and `sort=opened` is plain opened).
* **has:/no: asymmetry** (likely product bug or at least surprising): `has:pdf` counts `file`, `no:pdf`
  does not, so a paper with only `file` is matched by both `has:pdf` and `no:pdf` (examples 48/49).
  Faithfully kept.
* `is:trash` combined with `is:recent`/`is:starred` composes as a plain AND; fine.
* Rest text does not include `file`, `folders`, `type`: as described.

## bibtex-import

Hardest component. The description reads like a summary of a hand-rolled JavaScript parser and I had to
infer many details.

* **What "the rest of that entry is lost" means.** Description: "a field without a name or "=" is skipped
  up to the next comma or the end of the entry". Taken literally, skipping to the comma and continuing
  would keep `volume = 7` in example 18, but the expected `fields` is `{}`. The obligation text says "so
  the rest of that entry is lost". My reading: on the first field with no name or no `=`, skip to the
  next comma/closing character and **stop reading fields of that entry** (the entry is still emitted
  with what was read before). Scanning for the next `@` resumes at that comma, not after the entry's
  closing brace (so an `@` later inside the rest of that same entry would start a new entry; unspecified).
  Alternative reading that also fits example 18: only a *nameless* field (`= {x}`) stops the loop, while
  `junk,` is skipped and parsing goes on. I chose the first because of the obligation text.
* **Stray commas.** After a field one comma is consumed; `a = 1,, b = 2` therefore reads the second comma
  as a nameless field and loses the rest. Not specified.
* **Bare values.** "digits, or a bare word": I read any run of non-delimiter characters as one bare word
  (macro lookup, else as written), so `pages = 12-15` is `12-15` and `2012a` is `2012a`. Reading
  digits and words as separate token kinds would make `12-15` malformed.
* **Backslash inside "quoted" values**: braced values say "a backslash escapes the next character", quoted
  ones only say "a quote inside braces does not end it". I do **not** treat backslash as an escape in
  quoted values (so `"G\"odel"` ends at the second quote). Example 21 does not decide it.
* **Whitespace collapse is applied after joining parts** (`" suffix"` keeps its leading space when joined
  after a macro; property test pins this).
* **@preamble / @string closing.** After the value I consume the closing character if it is next; any
  junk before it is simply scanned over. `@string` bodies are read with the same field loop, so
  `@string{a="x", b="y"}` defines both; macro values are stored collapsed.
* **@comment**: "skip only the @" - I resume at the character after `@`, before checking for a brace.
* **Which fields are removed when several candidates exist**: the description says "each one used is
  removed". I implemented `journal || booktitle || publisher` with short circuit: `journal` is always
  removed if present (even empty, example 20), `booktitle` is removed only when journal was empty/absent,
  `publisher` is never removed. So an entry with both journal and booktitle keeps `booktitle` in `fields`.
  Same for notes: `annote` removed when present; `note` removed only if `annote` was empty/absent
  (example 20 confirms the non-empty case). If `annote = {}` and no `note`, I output `notes: ""`. Unspecified.
* **import.venue-empty-journal (open)**: an empty `journal` does *not* block `booktitle` here.
* **Authors**: the braced check ("starts with { and ends with }") must be done on the raw part, before
  `plain()` strips the braces (example 5), whereas the description's order ("plain it ... keep it as is
  if ... starts with {") reads as if after. The comma and `others` checks I do on the plained text. A
  one-word name stays as is. Split pattern is `\s+and\s+` case-insensitively, non-overlapping, so
  `A and and B` gives `A`, `and B`.
* **arXiv**: URL source is the *draft's url field* only; the id is taken up to `?`, `#` or whitespace,
  `.pdf` removed, then `vN`. "A trailing vN" is lower-case `v` only and "arXiv:" is case-insensitive
  (example 28 pins both). When `eprint` is used for the id it is removed; when the id came from a URL
  or `arxivid`, `eprint` stays unless it was also used. `archiveprefix/eprinttype/primaryclass` removed
  whenever an id is found. If both `arxivid` and `eprint` exist, `eprint` stays in fields.
* **plain() step 4/5 interplay**: step 4 turns `\{` into `{`, then step 5 removes "every { and } not
  directly after a backslash", which deletes it (the backslash is gone). Read literally an escaped brace
  never survives except after another backslash. This looks like a bug in the product (the likely
  intent: keep `\{`), but I followed the order of steps. No example.
* **plain() step 1 for `c v u H`**: lookahead "followed by whitespace or {" implemented as a lookahead,
  then optional whitespace. `\c c` gives ç. Greedy `}` `}` consumption can eat a brace belonging to an
  outer group (`{{\"o}}` -> ö with one brace left over: fine after step 5).
* **plain() step 2 "one following space is consumed"** only for the unbraced form, and only an ASCII
  space (values are already collapsed).
* **Year**: first 4-digit run, even inside a longer run (`19999` -> 1999, example 23).
* **Empty `url`/`file`** are kept as `""` while empty abstract/doi/venue are absent (example 20). Notes
  empty: see above.
* **Title emptiness** is judged after `plain()` (so `title = {{}}` is dropped).
* **Entry type** may be empty (`@{key, title={x}}` gives type `""`); unspecified.
* Output omits absent optional keys instead of writing null (the examples do).
* Likely product bug: a `}` in a citation key (`Erd\H{o}s1959`) ends the entry (example 7) so such entries
  vanish silently; also the "rest of the entry is lost" behaviour above, and the vN rule that leaves
  `V2`.

## bibtex-export

Direct. Gaps:

* "written only when its value is present and not empty" vs "title always written": fine. `year`
  `0` is written, an empty-string author is written as `{}` (property test shows it), `authors` that
  are non-empty but join to something are always written. `keywords` is judged on the *joined* string,
  so tags `["", ""]` give `keywords = {;}` while `[""]` gives none (property test pins it, the description
  says only "tags joined by ;").
* Escaping "not already preceded by a backslash" is by the previous *input* character, so `\\&`
  (two backslashes) stays unescaped. Matches the property's regex.
* Name padding counts code points; names are ASCII anyway.
* Possible product bugs: a `fields` entry named `journal` is written *and* suppresses the venue (fine), but
  `fields` entries named `eprint`/`title`/`year` are written a second time (example 13 shows this for
  `title`); and `#` in `url`/`doi` is not escaped while it is in the title, which is presumably intended.

## citation-key

Direct. Gaps:

* "decomposed with Unicode NFKD, keeping only ASCII letters" - NFKD of `Ł` has no decomposition so it is
  dropped (example 16); I follow. Product bug candidate: `Ł`, `Ø`, `ß`, `æ` vanish from keys.
* Lower-casing the title uses full Python-style lowercase (so `İ` becomes `i` + U+0307, then `i` stays and
  the mark goes). The description says "lower-cased", not which lower-casing.
* A key given earlier in the batch is "taken" even if it was an arriving key kept as is: implemented that
  way (example 7). A draft whose arriving key is taken gets a generated key even when the generated
  key equals the arriving one with a counter.
* SUFFIX with only one long word repeats its letter; words are split on single spaces so double spaces
  give empty words (example 18).

## pdf-filing

Gaps:

* **clean() order**: "runs of ' - ' -> one ' - '" cannot ever trigger after whitespace runs have been
  collapsed (two adjacent ' - ' share a space: `a - - b`, see example 5 `why - - it`), so that step is a
  no-op as specified. Implemented as `( - ){2,}` anyway.
* **Which strings are cleaned**: `surname` is *not* cleaned before being used in `who` (example 18 shows
  `Dash- 2000`), only the whole `head` is; the folder uses `clean(surname)`. Obvious from the examples,
  not from the prose.
* **"Other" folder** is exactly `Other` (not upper-cased) and is used when the first author's surname is
  empty *or* cleans to empty (e.g. `---`); description says "that is empty".
* **Lengths** are UTF-16 code units; a cut in the middle of a surrogate pair gives U+FFFD (BMP only is
  defined).
* **Taken names**: the new file name is compared as `papers/<file>`; parts of other papers' `file` are
  trimmed with JS `trim`, empty parts become `papers/`, harmless.
* Truncated name: "first 72 with trailing whitespace removed" - applied to the full NAME (head + " - " +
  title), not to the title, as example 12 shows; result can be shorter than 146.
* Product bug candidates: author folder keeps `-` runs from the middle (`BACK - SLASH`); two different
  papers can still share a name when the *taken* list contains only `file` parts with different
  trimming; names that start with a digit or dot are not treated specially.

## library-merge

Direct once the case table is read carefully. Gaps:

* **Equality** "same fields with equal values, in any key order": numbers compared as doubles (`1` equals
  `1.0`); list order matters (including `tags`).
* **Key order of merged papers** is not specified (and not checked by the comparison); I use ours' keys,
  then theirs', then base-only.
* **tags/folders "when o or t has the list"**: if only one side has the key, the result is still a list
  (possibly empty), never an absent key. If neither side has it the generic rule gives "absent".
* **Set merge** is order-defined only as "every item in o, then every item in t not already listed, minus
  any item of b that o or t removed". An item removed by one side and *re-added* by nobody stays removed
  even if the other side kept it; an item present on both sides after removal elsewhere survives only if
  both still have it. Items are compared by value; duplicates inside one list are collapsed (not stated).
* **fromThem**: ids compared via value equality of the result and ours' version, "a paper, or nothing".
* **bibSync**: compared as lists by value; `null` and missing both count as empty. Output key present only
  when non-empty (example 18).
* **Duplicate ids inside one library** are out of scope (schema forbids); last one wins in my code.
* Likely product weakness: bibSync is never merged item by item - if both sides changed it, ours replaces
  theirs wholesale (example 18) and the `fields` object is also treated as one value (example 20).

## tidy

Direct. Gaps:

* "Whitespace only gives the key doi:undefined (a quirk)" and the prefix removal happens *after* trim +
  lower-case; `doi.org/10.1/a` without scheme is not stripped (example 21). A DOI of `https://doi.org/`
  alone also gives `doi:undefined`.
* "longer than 20/3" is measured in ASCII characters after filtering.
* **Keeper**: "has a pdf" and "has notes" use non-empty (not trimmed) strings, so whitespace-only notes
  make a keeper while the notes patch drops them (the property test does the same). `added` compares as
  text; ties by library order.
* **Patch**: keys the keeper already has are absent from the patch (the description says "when the
  keeper's is absent or empty, the first other's non-empty value"); `pdf`, `file`, `opened` likewise.
  `year` absent keeper means null. `starred` is true or absent. Output omits absent keys.
* **fields**: patch contains the union (keeper wins, then earlier others), not only new keys.
* Group order is by first member in library order; chains via union-find.
* Product bug candidates: a keeper with `pdf` but a *worse* (newer) record still wins; two different
  short-title papers by authors with the same ASCII-only surname residue (e.g. `李` vs `王` both give
  an empty surname) are grouped; whitespace-only DOIs group unrelated papers.

## library-file

Gaps:

* **Parsing**: Python `json.loads` semantics for the accept/reject boundary: strict RFC 8259 (no trailing
  commas, no NaN/Infinity, no raw control characters in strings, no BOM), whitespace only space, tab, LF,
  CR. Duplicate keys: last value in the first position (example 23). The schema's out-of-scope list
  (lone surrogates, huge numbers, nulls, wrongly shaped papers) is not enforced; lone surrogate escapes
  become U+FFFD.
* **Folders**: "directories (every segment but the last)" so a path without `/` has none; an *empty*
  directory name (`/x.pdf`) is "all upper case" (equal to its upper-casing) and skipped; `All Papers` is
  only dropped as the first segment and case-sensitively; upper-case test uses full case mapping so
  `ß` is not upper case. `foldered` counts papers whose newly written list is non-empty.
* **File not a string** (absent) gives `[]`.
* **Number printing** implemented as ECMAScript Number::toString (shortest round trip digits from Go's
  `strconv`). `-0` -> `0`.
* **Key order**: array-index keys first at every object level, including inside papers and `bibSync`.
* **`bibSync`** is kept when it is a non-empty list; any other value is dropped.
* **library.bib** for an unchanged file is `null`, for a changed file it is built from the stored papers
  in file order; field order inside `fields` follows the JSON key order of the file.
* `year` printed with the JS number rule, so `2017.0` -> `2017` in both JSON and bib.
* Product bug candidates (already flagged `default` in the obligations): trashed papers in library.bib;
  upper-case user folders like `ML` skipped; unknown top-level keys dropped; version not checked. Also:
  `written` is decided on exact text equality, so a lightkone-formatted file with a trailing newline is
  rewritten on every other tool's save (example 6).

## Revision 1 (after the contract tightening)

Manifests re-created with `symbolon impl-init` (pinned to the new digests), all 8 pass: search-query 92,
bibtex-import 49, bibtex-export 25, citation-key 25, pdf-filing 25, library-merge 29, tidy 26,
library-file 46.

Changes:
* **Dependency.** `golang.org/x/text` v0.21.0 is used only by search-query (`collate`, `language.Und` =
  CLDR root, default tertiary strength) for `title:` sort. It is vendored (`vendor/`), so `build.sh`
  works offline; everything else is still stdlib.
* **search-query year:** a `year:` term now counts only if its first part is a number other than 0; the
  value is split at `-`, the second part is B only when it is a nonzero number (else B = A), further
  parts ignored. Non-counting terms do not replace an earlier year term. "Number" implemented as ASCII
  digits with an optional single `.` (so `2.`, `.5`, `2.5` are numbers; `1e3`, `+5`, spaces are not).
* **bibtex-import:** whitespace is now JavaScript's `\s` set everywhere (parser skipping, name/word
  delimiters, collapse, trim, the `and` splitter, plain() steps 1 and 6); the malformed-field skip stops at
  the next `,` (consumed, later fields survive) or at the closing character (consumed, entry ends),
  ignoring braces and quotes; the arXiv URL id strips `V3`/`.PDF` case-insensitively (the eprint path
  still strips only lower-case `vN`, as example 28 requires).

Still ambiguous in the new text:
* Fraction syntax for year numbers ("ASCII digits with an optional fraction"): is `2.` or `.5` a number?
  Is `year:2017.0` equal to 2017? I accept both and compare numerically (so it matches 2017).
* Year A-B where B is a fraction or A is fractional: compared numerically against the integer year.
* After a malformed field stops at the closing character, scanning resumes right after that character,
  so with `{x}` inside a nameless field the entry ends at the first `}` and the remainder
  (`, year = 1999}`) is scanned for `@` as plain text. Example 30 agrees; a stray `@` there would start
  an entry.
* Consecutive commas (`a=1,,b=2`) are now simply an empty malformed field skipped to the next comma, so
  `b` survives. The text does not say.
* `Und` vs a specific root locale: I assume JavaScript's default `localeCompare` equals CLDR root; the
  collator does not ignore punctuation (matches the description) but I could not check exotic strings
  (e.g. Hangul, supplementary scripts) against ICU.

## Revision 2 (importer bug fixes)

Only bibtex-import changed; its manifest digest was set from `symbolon digest` (sha256:2d877ecf...) and
checked. All 8 pass: search-query 92, bibtex-import 50, bibtex-export 25, citation-key 25, pdf-filing 25,
library-merge 29, tidy 26, library-file 46.

* **Key** is read to the first `,` or closing character at brace depth 0 (`{` raises, `}` lowers the
  depth when it is above 0). Backslash is not an escape there.
* **Malformed field skip** now steps over `{...}` and `"..."` with the same readers VALUES uses (braced:
  backslash escapes; quoted: braces nest, no backslash escape), stopping at `,` (consumed, reading goes on)
  or the closing character (consumed, entry ends).
* **plain() step 1** accepts `\i` / `\j` as the base letter (read as i / j) when not followed by an ASCII
  letter, digit or `_`; the check looks at the character after `\i`, before the optional closing braces.

Still ambiguous: "outside braces" for keys does not say whether a backslash-escaped brace counts, nor
whether quotes matter in keys (I ignore both); in a skipped malformed field an unterminated brace or quote
swallows the rest of the text; `\i` with the "not followed by a letter" rule means `\"\ix` does not match
step 1 and falls through to step 2/4 (`\"` stays). Two-digit years (example 37) already behaved as needed.

## Revision 3 (library-file)

Only library-file changed (digest sha256:de7d7a24...; 52 checks pass). Other top-level keys are now kept
after format/version/papers/bibSync, in input order (duplicates: last value, first position; index-like
keys still sort first). library.bib skips papers whose `trashed` is JavaScript-truthy (null, false, 0, -0,
"" are falsy; [], {}, "0", " " are truthy). Ambiguity: an input `bibSync` that is empty or not a list is
dropped (not re-emitted as an "other" key); `null` for `trashed` is treated as falsy.

## Revision 4 (library-file author folders, tidy empty keys)

library-file (56 checks) and tidy (28 checks) re-pinned. library-file: a lone directory is skipped only if
"Other" or in N = {upper(clean(surname(a)))} over the paper's authors (empties left out); with N empty the
old test is "upper-case unchanged and lower-case changed". `clean` moved into `lk.Clean` (copy of the
pdf-filing one; pdf-filing source untouched). Authors come from the paper's `authors` list (non-strings
ignored). tidy: a DOI/arXiv id that normalises to "" gives no key. Ambiguity: "Other" is matched
case-sensitively; the N-empty case treats caseless directories (digits) as non-author folders.
