# AGENTS.md

This is a Symbolon spec pack for lightkone, a web app for a research-paper
library. Build the app from it; do not look for lightkone's source.

1. Read `BRIEF.md`: what the product is, its non-goals and priorities.
   Then `PRODUCT.md`: the app you are building, its screens, flows and interfaces,
   and the order to build them in.
2. Read `assumptions/`: what you may take as true about the world. Don't build for cases they rule out.
3. Read `obligations.toml`: the decisions you must keep. Obligations marked `open` are yours to choose;
   ones with an `unchecked` reason (the `app.*` ones) are required although no check covers them yet.
4. The app's core is eight components. Each one's full specification is `components/<name>/versions/1/`: `symbolon.toml`
   (the description), `schema.py`, `examples.jsonl` and `properties.py`. Where the
   description and an example seem to disagree, the example is what lightkone does.

**Harness.** An implementation is a directory with `symbolon-impl.toml`
(`symbola impl-init <dir> --contract components/<name>/versions/1`). In Python, define
`run(input)` returning the contract's output; in any other language, a program
that reads one JSON input per line on stdin and writes `{"output": ...}` per
line (`docs/ATTESTATION.md`, "Implementations in other languages").

**The app** calls your component builds wherever `PRODUCT.md` names a component;
keep each one a separate module that the app imports and the harness runs, so the
checks test the code the app uses. Don't build a demo page around the components
instead of the app.

**Done** means the flows in `PRODUCT.md` work in the app (at least tier 1 of its
Order) and `symbola attest components/<name>/versions/1 <impl-dir>` reports PASSED
for every component. Don't special-case the examples: the properties generate
other inputs, and the publisher keeps a holdout. Write questions about unclear
parts, and the reading you chose, in `NOTES.md` next to your build.

**If the spec contradicts itself** (an example disagrees with the description or
with a property), don't code around it. Run
`symbola flag <component>#example:<line> "<what disagrees, and the reading you chose>" --dir <impl-dir>`,
build the reading you think is right, and carry on. A flagged contradiction counts
in your favour; matching an example the spec rules out does not.
