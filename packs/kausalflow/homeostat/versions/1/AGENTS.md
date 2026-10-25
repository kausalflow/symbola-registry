# AGENTS.md

This is a Symbolon spec pack for homeostat, a Python package and command line
that generate process-plant time series with their ground truth. Build the
package from it; do not look for homeostat's source.

1. Read `BRIEF.md`: what the product is, its non-goals and priorities.
   Then `PRODUCT.md`: the package you are building, its scenario keys, operators,
   process library, Python API, commands and flows, and the order to build them in.
2. Read `assumptions/`: what you may take as true about the world. Don't build for cases they rule out.
3. Read `obligations.toml`: the decisions you must keep. Obligations marked `open` are yours to choose;
   ones with an `unchecked` reason (the `product.*` ones) are required although no check covers them yet.
4. The package's core is four components. Each one's full specification is `components/<name>/versions/1/`: `symbolon.toml`
   (the description), `schema.py`, `examples.jsonl` and `properties.py`. Where the
   description and an example seem to disagree, the example is what homeostat does.

**Harness.** An implementation is a directory with `symbolon-impl.toml`
(`symbola impl-init <dir> --contract components/<name>/versions/1`). For
`scenario-issues`, `scenario-truth` and `run-series`, define `run(input)` in Python
returning the contract's output, as a thin adapter over your package. `cli-contract`
checks the real program: set `language = "command"` and `command` to your
`homeostat` command (`docs/CONTRACT_FORMAT.md`, "Command lines").

**The package** is what the adapters call: don't build the components as separate
programs beside it, and don't build a demo around them instead of the package.

**Done** means the flows in `PRODUCT.md` work (at least tier 1 of its Order) and
`symbola attest components/<name>/versions/1 <impl-dir>` reports PASSED for every
component. Don't special-case the examples: the properties generate other inputs,
and the publisher keeps a holdout. Write questions about unclear parts, and the
reading you chose, in `NOTES.md` next to your build.

**If the spec contradicts itself** (an example disagrees with the description or
with a property), don't code around it. Run
`symbola flag <component>#example:<line> "<what disagrees, and the reading you chose>" --dir <impl-dir>`,
build the reading you think is right, and carry on. A flagged contradiction counts
in your favour; matching an example the spec rules out does not.
