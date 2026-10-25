# Symbolon pack registry

Public spec packs for [Symbolon](https://github.com/kausalflow/symbolon). The
website that serves them is built from this repository by
`spikinglabs/symbolon-store` and hosted on Cloudflare Pages at
<https://symbola.sh/> (not live yet).

| Path | What it is |
| --- | --- |
| `packs/<owner>/<name>/versions/<n>/` | Each pack, one folder per released version. Only the latest is offered. |
| `packs/<owner>/<name>/attestations/` | Signed evidence for builds of the pack, shown on its page. |
| `publishers/<owner>.toml` | Publisher profiles edited on symbola.sh; they win over `[publisher]` in manifests. |
| `.github/workflows/publish.yml` | Publishes from symbola.sh (see below). |
| `.symbolon-version` | The Symbolon CLI commit that CI checks packs with. Move it to pick up CLI changes. |

## Publishing from symbola.sh

Publishers sign in at <https://symbola.sh/publish/> with GitHub (or run
`symbolon login` and `symbolon publish spec`). The site checks that the pack's
owner is the publisher's GitHub login or one of their organisations, then starts
`publish.yml` here. Its `build` job downloads the upload and runs `symbolon release`
and `site check` with no secrets, because validation runs the pack's own checks.
Its `propose` job, which holds the Symbola app's token and runs no pack code,
checks that the result is exactly one new version of that pack, and opens a pull
request as the app. New versions of an existing pack get auto-merge; a namespace's
first pack, and removals, wait for a moderator. Profile edits land the same way.

Setup (once): the Symbola GitHub App installed on this repository; secrets
`SYMBOLA_APP_ID`, `SYMBOLA_APP_PRIVATE_KEY` and `SYMBOLA_API_SECRET`; "Allow
auto-merge" on, and `main` protected with the `check` status required.

## Adding or updating a pack by pull request

```
pip install "git+https://github.com/kausalflow/symbolon@$(cat .symbolon-version)"
symbolon release path/to/your/spec --registry packs
symbolon site check packs
```

Then open a pull request. CI runs the same `site check` (every latest version
validates, no released version was edited) on the packs the pull request changes,
through `.github/scripts/check-packs.sh`; a change to `.symbolon-version` or CI
checks every pack, and so does a weekly run. A pack that keeps a build as source
(`rebuilds/<build>/check.sh`) has it rebuilt and checked against its attestations
when the build or its attestations change. After a merge, CI asks Cloudflare
to rebuild the website through the `CLOUDFLARE_DEPLOY_HOOK` secret. See the
[registry guide](https://kausalflow.github.io/symbolon/REGISTRY/) for the pack
format, publisher and support links, and evidence.

To see a pack the way the site will show it, `symbolon site build packs --out /tmp/registry`
writes the same `pack.md`, `parts/` and `index.json` the site serves.

Packs are public and free. Publishers can list their own support links
(Buy Me a Coffee, GitHub Sponsors, ...) under `[publisher]` in the pack manifest.
