# powerbi-cli pack

The fourth spec pack built from a real product, and the first for a tool that mostly talks to someone else's API: [emptymalei/powerbi-cli](https://github.com/emptymalei/powerbi-cli) at e094f67 (0.3.0 plus the `verify_certificates` setting), the `pbi` command line tool for the Power BI REST API.

| Path | What it is | Ships to buyers |
| --- | --- | --- |
| `versions/1/` | BRIEF, PRODUCT (the whole CLI), AGENTS, 5 assumptions, 71 obligations, eight components | yes |
| `attestations/` | pbi itself attested against all eight components, with the runner key | yes, as evidence |
| `oracle/` | How each component runs the original: the real `pbi` for the five cli components, small Python adapters for the three pure ones | no |
| `REVIEW.md` | Questions for emptymalei, with the answers | no |

## How it went

1. **Extract.** A blind `symbola extract` with a hint to write PRODUCT.md for the whole CLI, check the offline commands through the cli driver and record each API call as a decision. The agent run hit its one-hour limit while running the mutants (each check starts `pbi`, about 0.6 s), so the last checks were run by hand. It produced eight components:
   - `auth-profiles`: tokens, the user and admin groups, which token a command uses, legacy files (cli)
   - `config-cache`: the settings commands, `cache list` and `cache clear` (cli)
   - `cached-reads`: `--use-cache` and `--cache-only` reads of the last result (cli)
   - `file-converters`: `workspaces format-convert`, `apps augment`, `reports users` on saved files (cli)
   - `scan-batch`: the YAML config of `workspaces scan batch` and its errors (cli)
   - `flatten`, `cache-keys`, `workspace-entries`: the sheet flatteners, the cache layout and keys, and the scan entries with their file names (pure)

   The real `pbi` passes all 200 checks, and the checks kill all 40 mutants.
2. **Review.** emptymalei decided that TLS certificate verification must be configurable (the original never verified). That landed in powerbi-cli#33: a `verify_certificates` setting, on by default, which the pack now checks.
3. **Not yet checked.** 20 of 68 decided or default obligations (29%) have no check, so this pack raises the cap to 30%. Twelve are the `app.*` API calls: the base URL is hard-coded to api.powerbi.com, so no check can reach them without a fake API. The others need things the harness cannot see (file modes, the OS keyring, deletions, worksheet contents).

## Running the oracle

Install pbi into a virtual environment and put it first on `PATH`, so that `pbi` and `python3` are the ones with `pbi_cli`:

```sh
uv venv .pbi && uv pip install --python .pbi "pbi_cli @ git+https://github.com/emptymalei/powerbi-cli@e094f67"
PATH="$PWD/.pbi/bin:$PATH" symbola test versions/1/components/config-cache/versions/1 oracle/config-cache
```
