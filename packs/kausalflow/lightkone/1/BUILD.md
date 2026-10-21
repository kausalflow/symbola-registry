# Building from this pack

You are building components that behave exactly like lightkone's. You do not
have lightkone's source code, and you do not need it: each contract under
`components/` is the complete specification.

## Each contract

```
components/<name>/1/
  symbolon.toml     the description: read it first, it is the specification in words
  schema.py         input and output types (pydantic); schema/*.json is the same as JSON Schema
  examples.jsonl    golden examples recorded from lightkone itself, each with a note
  properties.py     property-based tests that state the rules on generated inputs
```

Where the description and an example seem to disagree, the example is right:
it is what lightkone does. Notes on examples explain the less obvious cases.

## Order of work

1. `lightkone/bibtex-export`: the smallest, and fully determined by its description.
2. `lightkone/search-query`.
3. `lightkone/bibtex-import`: the largest. Build the value reader, then
   `plain()`, then the draft mapping, testing as you go.

## Implementing a component

Any language works. Either:

- **Python:** a file that defines `run(input)`, taking the contract's `Input`
  model and returning its `Output` model (or a dict of the same shape).
- **Any other language:** a program that reads one JSON input per line on
  stdin and writes `{"output": ...}` per line on stdout. See the Symbolon
  docs, `docs/ATTESTATION.md`, section "Implementations in other languages".

Each implementation is a directory with a `symbolon-impl.toml`:

```bash
symbolon impl-init my-impl --contract components/search-query/1
```

## Checking your work

```bash
symbolon test components/search-query/1 my-impl      # every example and property
symbolon attest components/search-query/1 my-impl -o att.json   # signed, in a sandbox
```

**Done** means `symbolon attest` reports PASSED for all three components. The
attestation records the contract digest, so it is evidence for exactly this
version of the pack.

## Rules

- Use only the standard library unless a component needs more; pin anything
  else in `requirements.lock` with `==`.
- Do not special-case the examples. The properties generate thousands of other
  inputs, and the publisher keeps further held-out checks.
- If the specification is unclear, write down the question and the reading you
  chose. Those notes improve the next version of the pack.
