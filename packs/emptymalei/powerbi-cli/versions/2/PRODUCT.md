# powerbi-cli: the product

`pbi` is one command line program that reads Power BI's REST API and saves the answers as files. The components in this pack are its core (the parts that can be checked without the API); this page says what the whole program is.

## Shape

- A command line program, `pbi`, written in Python (3.10 or later) and installed as a package named `pbi_cli` (`uv sync`, then `uv run pbi`, or `pip install`). It runs on Windows, macOS and Linux; its documentation shows PowerShell and bash loops around it. No server, no daemon, no GUI.
- Command line parsing with `click`, nested command groups with `--help` on each, short options like `-t`, `-tf`, `-ft`, `-wn`, `-wi` as listed below. Run with no command it greets and points to `--help`; `pbi version` prints the installed package version.
- Tables and Excel files with `pandas` and `openpyxl`; configuration and the scan config with YAML; HTTP with `requests`; file names with `python-slugify`; cache locations through `cloudpathlib` (local folders and `s3://`); the OS keyring through `keyring` when one exists. Logging goes to standard error at INFO level; results and messages go to standard output.
- It needs a Power BI bearer token supplied by the user (see Interfaces). Commands marked admin need a token with admin rights.
- State lives in `~/.pbi_cli/` (`config.yaml`, `credentials.json`, the legacy `auth.json` and `profiles.json`) and in the optional cache folder. Nothing else is kept between runs.

## Surfaces

Setup and local state (offline, checked):

- `pbi auth -t TOKEN [-p PROFILE] [-g user|admin]`: store a token as a profile. (`auth-profiles`)
- `pbi profile list | switch [NAME] [-g G] | delete NAME [-g G] [--yes]`: manage profiles. (`auth-profiles`)
- `pbi config set-output-folder P | get-output-folder | set-cache-folder P | get-cache-folder | enable-cache | disable-cache | set-verify-certificates true|false|PATH | show`: settings. (`config-cache`)
- `pbi cache list [-k KEY] | clear [-k KEY] [-v VERSION] [--yes]`: look at and empty the cache folder. (`config-cache`, `cache-keys`)
- `pbi version`, and `pbi` alone (a greeting).

Reading the API (needs a token and the network; each can also read the cache, see Flows):

- `pbi workspaces list [--top N] [-e KIND]... [-f ODATA] [-ft json|excel]... [-tf FOLDER] [-n NAME] [--use-cache|--cache-only]`: admin; all workspaces, with users, reports, dashboards, datasets, dataflows, workbooks expanded by default; prints a table, or saves `NAME.json` and `NAME.xlsx` (default name `workspaces`).
- `pbi apps list [-r user|admin] [-tf FOLDER] [-ft ...] [-n NAME] [--use-cache|--cache-only]`: the apps the user can see, or all apps of the tenant (admin); default file name `apps`.
- `pbi apps app -a APP_ID [-t FILE] [-ft json|excel]`: one app with its reports and dashboards; prints JSON, or saves it (an Excel file has the sheets of `flatten` kind app).
- `pbi users user-access -u USER_ID [-tf FOLDER] [-ft ...] [-n NAME] [--use-cache|--cache-only]`: admin; the artifacts a user can access, as `{"artifacts": [...]}`.
- `pbi reports list -g GROUP_ID [-t FILE]`, `pbi reports pages -g GROUP_ID [-r REPORT_ID] [-t FILE]`, `pbi reports export -g GROUP_ID -r REPORT_ID [-t FILE]` and the older `pbi export -g GROUP_ID -r REPORT_ID [-t FILE]`: reports of a workspace, their pages (all reports of the group when `-r` is left out; a report whose pages cannot be fetched is skipped and logged), and the exported report file (without `-t` it prints the size instead of the content).
- `pbi workspaces scan initiate IDS... | status SCAN_ID | result SCAN_ID [-t FILE] | get IDS... [-t FILE | -tf FOLDER]`: admin; the workspace-info scan, step by step or all at once, with `--lineage --datasource-details --dataset-schema --dataset-expressions --get-artifact-users`, `--interval` (default 5) and `--timeout` (default 300) for `get`. `-t` and `-tf` exclude each other and `-tf` takes exactly one workspace id (it saves `<id>.json`).
- `pbi workspaces scan batch -c CONFIG.yaml`: admin; scans many workspaces one by one from a config file. (`scan-batch`, `workspace-entries`)

Working on saved files:

- `pbi workspaces format-convert -s WORKSPACES.json -t WORKSPACES.xlsx`: JSON to Excel. (`file-converters`, `flatten`)
- `pbi apps augment -s APPS.json -t OUT [-ft json|excel]`: fetch every listed app in full. (`file-converters`, `flatten`)
- `pbi reports users -s APPS.json -t OUT [-ft json|excel]`: the same, plus the users of each report. (`file-converters`, `flatten`)
- `pbi workspaces report-users -s WORKSPACES.xlsx [-wn NAME]... [-wi SECONDS] [-ft json|excel]... [-t FOLDER] [-n NAME]`: admin; reads the `reports` sheet of the Excel file `workspaces list` saved, keeps rows whose `type` is `Workspace` (and, with `-wn`, whose workspace `name` is listed), fetches the users of each report (`reports_id` column), waiting `-wi` seconds (default 3) between requests, and saves `workspaces_reports_users.json`/`.xlsx` (name with `-n`) with one list of enriched report records per workspace name, flattened by `flatten` kind report_users; prints a summary table without `-t`.

Files users touch: `~/.pbi_cli/config.yaml`, `~/.pbi_cli/credentials.json`, the cache folder (`<key>/<version>/<key>.json`), saved `*.json` and `*.xlsx` results, scan config YAML files (an example is `examples/scan_config.example.yaml`).

## Flows

1. **First setup.** `pbi auth -t TOKEN -p work -g admin` (and `-g user` for a user token), `pbi profile list` shows ✓ marks and the active profile of each group, `pbi profile switch work -g admin` changes it. Commands then use the right group's active profile. (`auth-profiles`)
2. **Back up all workspaces.** `pbi config set-output-folder ~/PowerBI/backups`, then `pbi workspaces list -ft json -ft excel -tf 2024-01-01` fetches (admin API), caches the result if a cache folder is set (`cache-keys`), and saves `workspaces.json` and a workbook with the sheets users, reports, dashboards, datasets, dataflows, workbooks and workspace (`flatten`) in `~/PowerBI/backups/2024-01-01/`. A JSON saved earlier is converted later with `pbi workspaces format-convert`. (`config-cache`, `file-converters`)
3. **Work offline from the cache.** `pbi config set-cache-folder ~/PowerBI/cache` once; every list command saves what it fetched as a new version. `pbi workspaces list --cache-only` prints the latest saved result without a token or network, `--use-cache` falls back to the API when nothing is cached; `pbi cache list [-k workspaces]` shows keys and versions, `pbi cache clear -k workspaces -v VERSION` removes some. (`cached-reads`, `config-cache`, `cache-keys`)
4. **Who can open which report.** `pbi workspaces list -ft excel -tf ...`, then `pbi workspaces report-users -s workspaces.xlsx -wn "Finance" -wi 5 -tf ...` saves the report users of one workspace; or `pbi apps list -tf ...`, `pbi reports users -s apps.json -t out.json` for apps. (`file-converters`, `flatten`)
5. **Scan many workspaces.** Copy `scan_config.example.yaml`, list workspace ids (with optional names for readable file names), set `target_folder`, run `pbi workspaces scan batch -c scan.yaml`: each workspace is scanned on its own (start the scan, poll its status every `interval` seconds up to `timeout`, fetch the result) and saved as `<name-slug>-<id>.json`; failed workspaces are listed at the end and the exit code is 1. (`scan-batch`, `workspace-entries`)
6. **Look at one thing.** `pbi apps app -a ID`, `pbi reports list -g GROUP`, `pbi reports pages -g GROUP -r REPORT`, `pbi users user-access -u USER`, `pbi reports export -g GROUP -r REPORT -t report.pbix`, `pbi workspaces scan get IDS... --lineage -t result.json`.

## Interfaces

- **Power BI REST API**, `https://api.powerbi.com/v1.0/myorg` (hard-coded), with the header `Authorization: Bearer <token>` on every call. TLS certificates are verified unless the `verify_certificates` setting says otherwise (`app.verify-certificates`). Failed connections and HTTP 500, 502 and 504 are retried up to 5 times with a 0.3 backoff factor. Which endpoint and query parameters each command uses is in the `app.*` obligations.
- **Credentials**: bearer tokens per profile name, in the OS keyring (service `pbi-cli`) when it works, otherwise in `~/.pbi_cli/credentials.json` (mode 600). Profiles are ungrouped or in the groups `user` and `admin`.
- **Cache storage**: any folder `cloudpathlib` understands; local folders and `s3://` are documented (credentials for S3 come from the standard AWS configuration), `gs://` and `az://` are accepted by the setting.

## Order

Build the state layer first (`auth-profiles`, `config-cache`, the cache layout of `cache-keys`), then `flatten` and `workspace-entries`, then the saved-file commands and `cached-reads`, then the API commands one by one (workspaces list, apps, users, reports) and last the scans (`scan-batch`, `scan get`). A build that has the offline commands and the cache already serves scripted users who work from saved files.
