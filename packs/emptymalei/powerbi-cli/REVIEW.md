# Review notes for the publisher

Please confirm or correct the items below. Anything you do not answer stays as written.

## Non-goals and priorities (BRIEF.md)

- Non-goals: the Power BI service itself (no fake API), the Windows path and terminal details, `pbi version` and the greeting line (depends on the environment), and the output of the logging library.
- Priorities, in order: (1) the same files and exit codes for the same arguments, (2) the config, credentials and cache file formats, (3) the table and message wording, (4) which endpoint and query each command uses, (5) speed. Is that the order you want?

## `default` obligations (my choice; change what you disagree with)

- `auth.legacy-import`: old `auth.json` / `profiles.json` are still imported. Drop it if nobody has them any more.
- `profile.switch-interactive`: the numbered prompt, with an empty answer meaning 1.
- `config.show`: the exact wording of `config show`.
- `cache.notice-from-file`: the notice line takes `cached_at` and `version` from inside the file.
- `cache.unreadable-latest`: an unreadable latest version does not fall back to an older one.
- `cache.table-columns`: the restricted column lists and the all-columns fallback.
- `flatten.child-wins`: a child field named like an own field replaces it.
- `convert.excel-target`: the refusal of an Excel target with a file extension.
- `scan.yaml-1-1`: `yes`/`no`/`on`/`off` read as booleans.

## Assumptions (assumptions/)

- K-bearer-token: the user brings an access token and the tool never refreshes it.
- K-api-shape: the Power BI answers have the fields the code reads (`value`, `ArtifactAccessEntities`, `status`, `error`).
- K-api-limits: the throttling of the admin endpoints is the user's problem.
- K-single-user: one process at a time uses the config and cache folders.
- K-keyring-optional: the tool must work without an OS keyring.

## Open obligations (no checks; builds may differ)

- `cache.user-access-save`: `users user-access --target-folder` saves nothing in the original.
- `cache.workspaces-excel-from-cache`: `workspaces list --use-cache -ft excel` crashes in the original after writing the JSON.
- `flatten.empty-listing`: a listing with no workspaces crashes the flattener (it reads `all_workspaces[0]`).

## Apparent bugs and quirks in the original

- `workspaces list` / `workspaces format-convert` of an empty listing: `IndexError`.
- The excel save of cached workspace data (above).
- An Excel target with a file extension ends in an internal error rather than a usage error.
- `users user-access` does not follow the continuation URI, so users with many artifacts get only the first page. `_get_user_artifacts` also has a mutable default (`existing_data=[]`).
- `get_session_query_configs` in `web.py` is defined with a required `headers` argument but called without one when no config is given.
- Retries cover 500, 502 and 504 only, not 429 or 503.
- Certificate verification is off for every request. You decided it should be configurable, so the pack now says verify by default with a `verify_certificates` setting (`app.verify-certificates`); powerbi-cli#33 (merged) adds it, and the pack now checks the setting commands (`config.verify-certificates`, 6 examples) against pbi at e094f67.
- The credentials file mode (600) and keyring use cannot be observed by the test harness.
- The `apps list` excel save has an index column, the other saves do not.

## Adapter copies of inline code

Two oracle adapters copy expressions that live inline in the CLI instead of calling a function: the `key` operation of `cache-keys` (cache keys and the user-id slug) and the label / file stem in `workspace-entries`. If the original changes these, the adapters need to follow.

## Unchecked share: cap raised to 30% for this pack

20 of 68 decided or default obligations are unchecked (29%). Twelve are the `app.*` API calls, which no check can reach because the base URL is hard-coded; the other eight need things the harness cannot see (file modes, keyring, deletions, worksheet contents, a fake API for the fetch, scan and report-users loops). `symbola pack validate` caps this at 10% by default, so the manifest sets `max_unchecked = 0.3`. The alternative is a fake Power BI API (a base-URL override in pbi, or a proxy), which BRIEF lists as a non-goal.

## Left out on purpose

`workspaces report-users` (kept only as an unchecked endpoint decision), `scan get`/`initiate`/`status`/`result`, `reports list`/`pages`/`export` and `apps app` (endpoint decisions only), `pbi version`, the greeting, Windows paths, a `file://` cache folder, and tracebacks for invalid YAML.

## Mutants

Each component has mutants the checks must kill: 38 of 38 are killed (auth-profiles 6/6, cache-keys 5/5, cached-reads 5/5, config-cache 4/4, file-converters 4/4, flatten 5/5, scan-batch 4/4, workspace-entries 5/5). The real `pbi` 0.3.0 passes all 194 checks.
