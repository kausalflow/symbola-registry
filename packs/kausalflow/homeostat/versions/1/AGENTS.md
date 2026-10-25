# AGENTS.md

This is a Symbolon spec pack. Build from it; do not look for the original source.

1. Read `BRIEF.md`: what the product is, its non-goals and priorities.
2. Read `assumptions/`: what you may take as true about the world. Don't build for cases they rule out.
3. Read `obligations.toml`: the decisions you must keep. Obligations marked `open` are yours to choose.
4. Each component's full specification is `components/<name>/versions/<n>/`: `symbolon.toml`
   (the description), `schema.py`, `examples.jsonl` and `properties.py`. Where the
   description and an example seem to disagree, the example is what the original does.

**Harness.** An implementation is a directory with `symbolon-impl.toml`
(`symbolon impl-init <dir> --contract components/<name>/versions/<n>`). In Python, define
`run(input)` returning the contract's output; in any other language, a program
that reads one JSON input per line on stdin and writes `{"output": ...}` per line.

**Done** means `symbolon attest components/<name>/versions/<n> <impl-dir>` reports PASSED
for every component. Don't special-case the examples: the properties generate
other inputs, and the publisher keeps a holdout. Write questions about unclear
parts, and the reading you chose, in `NOTES.md` next to your build.

**If the spec contradicts itself**, don't code around it. Run
`symbolon flag <component>#example:<line> "<what disagrees, and the reading you chose>" --dir <impl-dir>`,
build the reading you think is right, and carry on.
