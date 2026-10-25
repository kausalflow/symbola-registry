# Component builds

One folder per component of the lightkone pack. Each holds:

- `src/index.ts`: the component, a pure TypeScript module with no Node or DOM
  APIs. The app (`src/`) imports it directly.
- `main.ts`: the harness adapter (`serve(run)` from `_harness/lines.ts`).
- `main.mjs`: `main.ts` bundled by `npm run build:impl`; what symbola runs.
- `symbolon-impl.toml`: `language = "command"`, `command = ["node", "main.mjs"]`.

Check one: `node scripts/build-impl.mjs <name> && symbola test spec/components/<name>/versions/1 impl/<name>`.
