# Lightkone pilot

This is the first spec pack built from a real product: [kausalflow/lightkone](https://github.com/kausalflow/lightkone) at commit 46f86da; `bibtex-import` follows 1d2b4dd, which has the importer fixes below.

| Path | What it is | Ships to buyers |
| --- | --- | --- |
| `versions/1/` | The pack, version 1: BRIEF, AGENTS, assumptions, obligations, and eight component contracts | yes |
| `oracle/` | Publisher side: lightkone's own TypeScript bundled as command implementations, fixtures, example recorder, holdout, differential tester | no |
| `rebuilds/python-1/` | Milestone 1: an AI build in Python (Claude Opus 5.5 in Claude Code) of the first three contracts, made from `versions/1/` alone | no |
| `rebuilds/go-1/` | Milestone 2: a second AI build in Go of all eight contracts, made from `versions/1/` alone, with its NOTES.md | no |
| `attestations/` | Signed evidence for both builds, plus the runner keys | yes, as evidence |

## Results (milestone 1)

| Contract | Checks | lightkone (oracle) | Python rebuild | Holdout (rebuild) | Second runner |
| --- | --- | --- | --- | --- | --- |
| `lightkone/search-query@1` | 71 examples + 11 properties | PASSED | PASSED | 91/91 | reproduced both |
| `lightkone/bibtex-import@1` | 28 examples + 13 properties | PASSED | PASSED | 47/47 | reproduced both |
| `lightkone/bibtex-export@1` | 19 examples + 6 properties | PASSED | PASSED | 28/28 | reproduced both |

How it went:

1. **Oracle check.** Examples were recorded by running lightkone's code. The properties were written from the description, and lightkone passed all of them.
2. **Replication.** An AI builder got only `versions/1/`. Lightkone's source and the oracle were moved off the machine while it worked. It passed all three contracts, each on its first test run, and then passed the holdout: a different property seed, 5× the generated cases, and 18 examples it never saw.
3. **Divergence found.** Comparing the two builds on the builder's listed ambiguities turned up one real gap. Lightkone keeps a single `year:` filter, so the last one wins whatever its form. The first contract said "all filters must hold", and its conjunction property never generated the pair that would tell the two apart. The contract now states the rule and has a property and two examples for it. The builder revised from the new contract alone, and both builds pass it. The other ambiguities it listed matched lightkone.
4. **Reproduction.** A second runner key re-ran all six attestations in a fresh container, and every check had the same outcome. Both runners were on the same machine; runners on different machines come with the registry.

Lightkone bugs the milestone 1 contracts pinned, all fixed in [kausalflow/lightkone#50](https://github.com/kausalflow/lightkone/pull/50); `bibtex-import` now describes the fixed behaviour, and both builds pass it:

- A `}` in a BibTeX key ended the entry early, so the entry was silently dropped. Example: `@ARTICLE{Erd\H{o}s1959, ...`.
- `Na\"{\i}ve` came out as `Na\"ıve`, because the accent rule needed a plain letter.
- Everything after the first malformed field in an entry was lost when the field had a braced value.

## Results (milestone 2)

Five more contracts: `citation-key`, `pdf-filing`, `library-merge`, `tidy`, and `library-file`, the data contract for `library.json` itself (how lightkone reads it and writes it back, byte for byte, with `library.bib`). Contracts can now share sample data in `fixtures/`, including raw text files with `{"$text": ...}`; `library-file` ships three sample libraries.

| Contract | Checks | lightkone | Go rebuild | Holdout (Go) | Second runner |
| --- | --- | --- | --- | --- | --- |
| `lightkone/search-query@1` | 81 examples + 11 properties | PASSED | PASSED | 101/101 | reproduced both |
| `lightkone/bibtex-import@1` | 37 examples + 13 properties | PASSED | PASSED | 56/56 | reproduced both |
| `lightkone/bibtex-export@1` | 19 examples + 6 properties | PASSED | PASSED | 28/28 | reproduced both |
| `lightkone/citation-key@1` | 19 examples + 6 properties | PASSED | PASSED | 28/28 | reproduced both |
| `lightkone/pdf-filing@1` | 19 examples + 6 properties | PASSED | PASSED | 28/28 | reproduced both |
| `lightkone/library-merge@1` | 21 examples + 8 properties | PASSED | PASSED | 31/31 | reproduced both |
| `lightkone/tidy@1` | 21 examples + 5 properties | PASSED | PASSED | 28/28 | reproduced both |
| `lightkone/library-file@1` | 39 examples + 7 properties | PASSED | PASSED | 54/54 | reproduced both |

How it went:

1. **Second build, second language.** A fresh Claude Code session (Claude Opus 5.5, the same model as the Python build, with no access to it) got only `versions/1/` and built all eight components in Go (standard library only), with lightkone, the oracle and the Python rebuild moved off the machine. It passed all eight contracts and all eight holdouts.
2. **Passing is not agreeing.** `oracle/differential.py` sends the same generated inputs to lightkone and the Go build and reports every disagreement on inputs the contract accepts. On about 5,000 inputs, six contracts agreed completely. `bibtex-import` and `search-query` showed five real gaps that both the spec and the holdout had missed:
   - a malformed BibTeX field skipped to a `}` ends the entry, but one skipped to a comma does not (the contract said the rest was always lost);
   - "whitespace" means JavaScript's `\s`, including no-break space and U+2028;
   - the arXiv URL match ignores case, so `V3` and `.PDF` are stripped;
   - `year:` terms that are not numbers do not count, and do not replace an earlier one;
   - `title` sort is Unicode collation (`localeCompare`), not code-point order.
3. **Tightened and rebuilt.** The contracts now state each rule, with 18 new examples recorded from lightkone. The Go builder revised from the new text alone (adding `golang.org/x/text` for collation) and passes. The differential test then found no disagreement on search-query within scope, and 11 in 2,000 heavily mutated BibTeX files, all deliberately broken input (unbalanced braces, a value starting with `#`); those are left for a later version.
4. **Evidence.** Runner A attested lightkone and the Go build on all eight contracts; runner B re-ran all sixteen in fresh containers with identical outcomes. The Python build's milestone 1 attestations are kept: they are for the earlier digests of search-query and bibtex-import.

The pack now has 63 obligations, all decided. Four defaults that were lightkone bugs are fixed and decided: papers in the trash are left out of `library.bib`, and top-level keys of `library.json` that lightkone does not use are kept on save (lightkone#51); a user folder named in capitals (`ML`, `2019`) is no longer taken for a Paperpile author folder unless it is an author's surname, and blank DOIs no longer match each other in tidy (lightkone#52). On 2026-10-24 kausalflow settled the last five: an empty `journal` no longer hides the `booktitle` as the venue, and a `library.json` saved by a newer lightkone is refused rather than read as version 1 (lightkone#53); a mistyped `year:` filter still filters nothing, title sort keeps Unicode collation, and import keeps JavaScript's whitespace set.

Two Symbolon bugs turned up and are fixed: examples containing U+2028 were split into two lines, and the container sandbox removed the execute bit, so no compiled implementation could run.

## Re-running

```bash
LIGHTKONE=/path/to/lightkone oracle/build.sh        # needs npm ci in lightkone
python3 oracle/record-examples.py search-query     # re-record golden examples
oracle/holdout.sh search-query rebuilds/go-1/search-query
python3 oracle/mutate.py bibtex-import 2000 9 > /tmp/cases.jsonl  # inputs for a differential run
python3 oracle/differential.py bibtex-import /tmp/cases.jsonl rebuilds/go-1
symbolon verify attestations/search-query.python-1.json --trust attestations/runner-a.pub \
  --contract versions/1/components/search-query/versions/1 --impl rebuilds/python-1/search-query --rerun
```
