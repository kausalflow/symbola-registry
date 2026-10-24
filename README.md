# Symbolon pack registry

Public spec packs for [Symbolon](https://github.com/kausalflow/symbolon). The
website that serves them is built from this repository by
`spikinglabs/symbolon-store` and hosted on Cloudflare Pages at
<https://symbolon.pages.dev/> (not live yet).

| Path | What it is |
| --- | --- |
| `packs/<owner>/<name>/versions/<n>/` | Each pack, one folder per released version. Only the latest is offered. |
| `packs/<owner>/<name>/attestations/` | Signed evidence for builds of the pack, shown on its page. |
| `.symbolon-version` | The Symbolon CLI commit that CI checks packs with. Move it to pick up CLI changes. |

## Adding or updating a pack

```
pip install "git+https://github.com/kausalflow/symbolon@$(cat .symbolon-version)"
symbolon release path/to/your/spec --registry packs
symbolon site check packs
```

Then open a pull request. CI runs the same `site check` (every latest version
validates, no released version was edited). After a merge, CI asks Cloudflare
to rebuild the website through the `CLOUDFLARE_DEPLOY_HOOK` secret. See the
[registry guide](https://kausalflow.github.io/symbolon/REGISTRY/) for the pack
format, publisher and support links, and evidence.

To see a pack the way the site will show it, `symbolon site build packs --out /tmp/registry`
writes the same `pack.md`, `parts/` and `index.json` the site serves.

Packs are public and free. Publishers can list their own support links
(Buy Me a Coffee, GitHub Sponsors, ...) under `[publisher]` in the pack manifest.
