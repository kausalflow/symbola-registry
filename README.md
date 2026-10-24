# Symbolon pack registry

Public spec packs for [Symbolon](https://github.com/kausalflow/symbolon), and the
static site that serves them at <https://kausalflow.github.io/symbolon-registry/>.

| Path | What it is |
| --- | --- |
| `packs/<owner>/<name>/versions/<n>/` | Each pack, one folder per released version. Only the latest is offered. |
| `packs/<owner>/<name>/attestations/` | Signed evidence for builds of the pack, shown on its page. |
| `registry-site/` | The [Astro](https://astro.build) site and [Pagefind](https://pagefind.app) search over what `symbolon site build` writes. |
| `.symbolon-version` | The Symbolon CLI commit that CI and the site build use. Move it to pick up CLI changes. |

## Adding or updating a pack

```
pip install "git+https://github.com/kausalflow/symbolon@$(cat .symbolon-version)"
symbolon release path/to/your/spec --registry packs
symbolon site check packs
```

Then open a pull request. CI runs the same `site check` (every latest version
validates, no released version was edited) and builds the site; the pull request
gets a preview link. See the [registry guide](https://kausalflow.github.io/symbolon/REGISTRY/)
for the pack format, publisher and support links, and evidence.

## Building the site locally

```
registry-site/build.sh /tmp/registry http://localhost:8000 /registry
cd /tmp && mkdir -p serve && cp -r registry serve/ && python -m http.server -d serve 8000
```

Packs are public and free. Publishers can list their own support links
(Buy Me a Coffee, GitHub Sponsors, ...) under `[publisher]` in the pack manifest.
