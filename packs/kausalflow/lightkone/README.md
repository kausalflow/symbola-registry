# Lightkone pilot

This is the first spec pack built from a real product: [kausalflow/lightkone](https://github.com/kausalflow/lightkone) at commit 46f86da.

| Path | What it is | Ships to buyers |
| --- | --- | --- |
| `1/` | The pack: BRIEF, BUILD, AGENTS, and three component contracts | yes |
| `oracle/` | Publisher side: lightkone's own TypeScript bundled as command implementations, fixtures, example recorder, holdout | no |
| `rebuilds/python-1/` | An AI build in Python made from `1/` alone, with the builder's NOTES.md | no |
| `attestations/` | Signed evidence for both builds, plus the runner keys | yes, as evidence |

## Results (milestone 1)

| Contract | Checks | lightkone (oracle) | Python rebuild | Holdout (rebuild) | Second runner |
| --- | --- | --- | --- | --- | --- |
| `lightkone/search-query@1` | 71 examples + 11 properties | PASSED | PASSED | 91/91 | reproduced both |
| `lightkone/bibtex-import@1` | 28 examples + 13 properties | PASSED | PASSED | 47/47 | reproduced both |
| `lightkone/bibtex-export@1` | 19 examples + 6 properties | PASSED | PASSED | 28/28 | reproduced both |

How it went:

1. **Oracle check.** Examples were recorded by running lightkone's code. The properties were written from the description, and lightkone passed all of them.
2. **Replication.** An AI builder got only `1/`. Lightkone's source and the oracle were moved off the machine while it worked. It passed all three contracts, each on its first test run, and then passed the holdout: a different property seed, 5× the generated cases, and 18 examples it never saw.
3. **Divergence found.** Comparing the two builds on the builder's listed ambiguities turned up one real gap. Lightkone keeps a single `year:` filter, so the last one wins whatever its form. The first contract said "all filters must hold", and its conjunction property never generated the pair that would tell the two apart. The contract now states the rule and has a property and two examples for it. The builder revised from the new contract alone, and both builds pass it. The other ambiguities it listed matched lightkone.
4. **Reproduction.** A second runner key re-ran all six attestations in a fresh container, and every check had the same outcome. Both runners were on the same machine; runners on different machines come with the registry.

Lightkone quirks the contracts pin rather than fix (worth a lightkone issue each):

- A `}` in a BibTeX key ends the entry early, so the entry is silently dropped. Example: `@ARTICLE{Erd\H{o}s1959, ...`.
- `Na\"{\i}ve` comes out as `Na\"ıve`, because the accent rule needs a plain letter.
- Everything after the first malformed field in an entry is lost.

## Re-running

```bash
LIGHTKONE=/path/to/lightkone oracle/build.sh        # needs npm ci in lightkone
python3 oracle/record-examples.py search-query     # re-record golden examples
oracle/holdout.sh search-query rebuilds/python-1/search-query
symbolon verify attestations/search-query.python-1.json --trust attestations/runner-a.pub \
  --contract 1/components/search-query/1 --impl rebuilds/python-1/search-query --rerun
```
