# search-query build notes

`symbola test`: PASS, 106 checks (95 examples + 11 properties). No flags filed:
I found no example that disagrees with the description, the obligations or the properties.

## Open obligation

- **search.year-number-spelling**: a `year:` part counts as a number only if it is
  ASCII digits with an optional `.digits` fraction (`/^[0-9]+(?:\.[0-9]+)?$/`).
  `+2`, `1e3`, `0x7e1`, `Infinity`, `.5` and `2017.` are not numbers, so a first
  part spelled like that means the term does not count, and a second part spelled
  like that means "just the first year".

## Readings chosen where the spec is unclear

- **Tokens**: `field:"quoted"` | `field:value` | `"quoted"` | bare `\S+`, where a
  field name is JS `\w+`. A known field with an unmatched quote (`tag:"to`) is a
  filter whose value is `"to`, quote included. It is not split.
- **Empty quoted values**: `tag:""` is a tag filter for the empty tag (matches
  nothing in practice). `author:""` matches every paper (the empty substring),
  and a bare `""` is an empty word that matches every paper.
- **Filter values are folded** (NFKD, marks stripped, lower-cased) for every
  field, including `has:`/`no:`/`is:`. `in:` strips trailing slashes from both
  the query value and the paper's folders.
- **`is:recent` with sort `relevance`**: an explicitly chosen `relevance` is an
  explicit sort, so it wins over `is:recent`'s default "opened" order. Only
  `sort: "added"` (the default) gives way to opened (with `is:recent`) or
  relevance (with words). `is:recent` is checked first.
- **Title collation**: `Intl.Collator("und", {sensitivity: "variant"})`, which is
  CLDR root at tertiary strength. Equal titles keep input order because the sort
  is stable.
- **`starred`** matches only `true`. `trashed`, `opened`, `pdf`, `file`,
  `abstract`, `arxiv` and `notes` count as present when truthy (an empty string
  counts as absent).
- **`run` validation**: it rejects (ValueError) only non-list papers, a non-string
  query, an unknown sort, a paper without a string id/title/added, and duplicate
  ids. Extra paper fields are ignored, so the app can pass its full papers.

## Full text (`searchWithFullText`)

A candidate must pass every filter and the trash rule, and at least one word
must have scored 0 in its record. Each such candidate goes to the callback with
all of the query's folded words, and is shown if the callback returns true.
Under relevance (explicit, or the default with words), full-text-only papers come
after every record match, newest added first among themselves. Under `year`,
`title`, `opened` (and `is:recent`'s default), they are merged into that order
like any other result. With no words nothing is dropped, so the callback is never
called. With a callback that always returns false the result equals `search`.
