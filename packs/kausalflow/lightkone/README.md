# Lightkone pilot

This is the first spec pack built from a real product: [kausalflow/lightkone](https://github.com/kausalflow/lightkone) at commit 46f86da; `bibtex-import` follows 1d2b4dd, which has the importer fixes below.

| Path | What it is | Ships to buyers |
| --- | --- | --- |
| `versions/1/` | The pack, version 1: BRIEF, AGENTS, assumptions, obligations, and eight component contracts | yes |
| `oracle/` | Publisher side: lightkone's own TypeScript bundled as command implementations, fixtures, example recorder, holdout, differential tester | no |
| `rebuilds/python-1/` | Milestone 1: an AI build in Python (Claude Opus 5.5 in Claude Code) of the first three contracts, made from `versions/1/` alone | no |
| `rebuilds/go-1/` | Milestone 2: a second AI build in Go of all eight contracts, made from `versions/1/` alone, with its NOTES.md. Source only: `build.sh` makes the binaries byte for byte, and `check.sh` checks them against the attestations | no |
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

## Shorter descriptions (2026-10-24)

The `search-query` and `tidy` descriptions restated, close to pseudocode, rules that `obligations.toml` and the examples already pin down. An ablation run with `symbola replicate` (one Sonnet 5.5 and one Opus 5.5 build per variant, lightkone as the reference, the holdout on) tested which parts of that prose builders needed:

| Variant | search-query distance to lightkone (Sonnet, Opus) | tidy distance (both) |
| --- | --- | --- |
| Full pack | 0.055, 0.000 | 0.117 |
| Descriptions cut to their purpose | 0.100, 0.008 | 0.112 |
| Cut, and the 24 search and tidy obligations removed | 0.041, 0.108 | 0.228 |
| This version: cut, with the facts only the prose carried recorded as examples | 0.099, 0.151 (see below) | 0.092 |

Every build passed every check and the holdout. Most of the tidy distance is lightkone crashing on a blank DOI or arXiv id (kausalflow/lightkone#54). Tidy's description added nothing measurable, so it is now its purpose paragraph. Cutting the search-query description lost two facts that no example pinned down: a paper can leave out its optional fields, and `year:2017a` is not a number. Both are now recorded from lightkone, under the new obligation `search.absent-fields` and under `search.year-malformed`. The description's "other spellings are unspecified" is now an open obligation, `search.year-number-spelling`, so a build that reads `year:+2` as 2 is allowed.

On this version, the remaining search-query distance comes from three things. One is the open `year:+2` and `year:1e3` spellings. Another is collation of a rare Arabic letter. The third is a query of only a BOM, a gap the full pack had too. That gap is now the obligation `search.whitespace` (JavaScript's `\s`), with three examples. The Opus build fails one of them, so the gap is now caught. Lightkone is re-attested on both new digests with a new runner key, `attestations/runner-d.pub`. The Go and Python attestations for these two contracts stay as they are; they are for the earlier digests.

The replication runs also showed tidy crashing on a paper with no `authors` key, which its input schema allows; every rebuild returned no groups. That is fixed in kausalflow/lightkone#54, along with merged `tags` coming out as `[null]` when papers had no `tags` key. The new obligation `tidy.missing-lists` pins both with two examples recorded from the fixed lightkone, and the tidy oracle is rebuilt from it. Lightkone is re-attested on the new tidy digest with runner key `attestations/runner-e.pub`. The Go build passes the new contract unchanged; its tidy attestation stays on the earlier digest.

## Re-running

```bash
LIGHTKONE=/path/to/lightkone oracle/build.sh        # needs npm ci in lightkone
python3 oracle/record-examples.py search-query     # re-record golden examples
rebuilds/go-1/check.sh                             # build the Go binaries, check them against the attestations (needs Go)
oracle/holdout.sh search-query rebuilds/go-1/search-query
python3 oracle/mutate.py bibtex-import 2000 9 > /tmp/cases.jsonl  # inputs for a differential run
python3 oracle/differential.py bibtex-import /tmp/cases.jsonl rebuilds/go-1
symbola verify attestations/search-query.python-1.json --trust attestations/runner-a.pub \
  --contract versions/1/components/search-query/versions/1 --impl rebuilds/python-1/search-query --rerun
```
