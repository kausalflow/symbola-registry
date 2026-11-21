# powerbi-cli (`pbi`)

`pbi` is a command line tool for people who administer or document a Power BI tenant. They give it a bearer token, and it asks the Power BI REST API (`https://api.powerbi.com/v1.0/myorg`) for workspaces, apps, reports, report users, user access and workspace scans, and saves the answers as JSON files and Excel workbooks, one folder per day if they like. Results can be cached in a folder (local or S3) so later runs can work offline, and saved files can be fed back into later commands (convert to Excel, fetch the users of each report).

Its users script it (PowerShell or bash loops, scheduled backups), so what they rely on is the command line, the exit codes, the names and shapes of the files it writes, the profile/config/cache files in `~/.pbi_cli`, and the messages that say why a run failed. Almost every command needs the live API and cannot be checked here; the pack pins what can be checked offline (profiles and settings, the cache, the saved-file converters, the scan config) and records the API calls as decisions.

## Non-goals

- Getting a token. The user brings a bearer token; there is no sign-in flow, no refresh, no service principal login.
- Changing anything in Power BI. Every call is a read (the one POST asks for a scan).
- A graphical interface, a server, or a library API for others to import.
- Other clouds (national or sovereign Power BI endpoints) and API versions other than `v1.0/myorg`.
- Concurrency control: two `pbi` processes sharing one home directory are not supported.

## Priorities

When goals conflict, earlier ones win:

1. Scripts keep working: command names, options, exit codes, file names and the shapes of saved JSON and Excel files do not change.
2. Tokens stay out of sight: kept in the OS keyring when there is one, otherwise in a file only the user can read; never printed or logged.
3. A run fails loudly and says why; one failing workspace or app does not stop a batch that can go on.
4. Work offline from the cache and from saved files whenever the data is already there.
5. Few dependencies, plain files, no hidden state beyond `~/.pbi_cli` and the cache folder.

## Who resolves gaps

emptymalei, as the namespace holder. If the pack doesn't settle something, record the question and the reading you chose in `NOTES.md` next to your build; obligations marked `open` in `obligations.toml` are yours to choose.
