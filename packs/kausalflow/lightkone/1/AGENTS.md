# AGENTS.md

This directory is a Symbolon spec pack for lightkone's core components.

- Read `BRIEF.md` for what the product is, then follow `BUILD.md`.
- The specification of each component is `components/<name>/1/`. Read
  `symbolon.toml` (the description), `schema.py`, `examples.jsonl` and
  `properties.py`. Do not look for lightkone's source; build from these.
- Check a component with `symbolon test components/<name>/1 <impl-dir>`.
- Finished means `symbolon attest` passes for every component.
- Record questions about unclear parts of the spec in `NOTES.md` next to
  your implementation.
