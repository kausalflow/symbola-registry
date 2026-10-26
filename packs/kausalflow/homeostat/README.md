# Homeostat pilot

The second spec pack built from a real product, and the first that is not a set of pure functions: [kausalflow/homeostat](https://github.com/kausalflow/homeostat) at 3938464 (0.1.0a3), a Python library and command line that turns a declarative scenario into simulated plant data with its ground truth.

| Path | What it is | Ships to buyers |
| --- | --- | --- |
| `versions/1/` | The pack: BRIEF, PRODUCT (the whole package around the components), AGENTS, assumptions, 60 obligations, four components at the product's surfaces (scenario in, issues / ground truth / series out, and the command line) | yes |
| `oracle/` | Adapters that run homeostat itself for each component (for `cli-contract`, just the `homeostat` command) | no |
| `REVIEW.md` | Questions for kausalflow: priorities, the 8 `default` obligations, suspected homeostat bugs | no |

## How it went

1. **Extract.** A blind `symbola extract` with a hint to specify at surfaces drafted the pack. Randomness is specified through statistical properties that hold across seeds, and the command line through an adapter that runs it in a scratch directory. `cli-contract` now uses symbola's `cli` driver: builds ship the real program, `observe.py` reduces each run, and the oracle is the `homeostat` command itself.
2. **Replication 1** (three Go builds, one of them prose-only, i.e. without examples or properties). The full builds passed all four components. The prose-only build passed only `run-series`, and that exposed four wrong or missing rules in the descriptions. The descriptions are fixed, and the inputs where builds split from homeostat are now recorded as examples.
3. **Replication 2** (one full Go build, one prose-only). The full build passes all four components. The prose-only build passes `run-series` and 130 of 131 `scenario-issues` checks. That run found one more missing rule (an `exogenous` source's `tau` takes a duration), which is now fixed. Its remaining failures are malformed-input edge cases that only the examples carry.

4. **Product layer.** Like lightkone, the pack first specified only the four components, so a rebuild asked for "homeostat" had no process library, plans, families, labelers or most commands. `PRODUCT.md` now describes the whole package, drafted from homeostat's README and docs. A clean-room Python rebuild from the pack (Opus, 84 min) built all four tiers of its Order except the optional compiled step, attested all four components, and ran homeostat's own 13 eval reference scenarios with the same signals, loops, events and observed means within a few percent. Its five gaps (loop names, `meta` types, where distributions may appear, expectation fields, task expansions) are fixed in PRODUCT.md. The rebuild's source is not kept here.

`seed: -1` passes validation but crashes the run; it is listed in `REVIEW.md` and not pinned.
