# Lightkone (TypeScript build)

A research-paper library you own, built from the
[kausalflow/lightkone](https://symbola.sh/packs/kausalflow/lightkone/) spec pack
(in `spec/`). It is a static web app: the library is plain files
(`lightkone/library.json`, `lightkone/library.bib`, PDFs under
`papers/All Papers/`) in storage the owner chooses: this browser, an
S3-compatible bucket, or a GitHub repository.

## Run it

```sh
npm install
npm run dev          # http://localhost:5173/ (front page) and /app/
npm run build        # static site in dist/, plus the component harness builds
npm run preview      # serve dist/ with the /api/ and /mcp/ handlers
```

## Deploy

`dist/` is static and any host can serve it. Two small server pieces are
Cloudflare Pages Functions in `functions/`:

- `/api/fetch?url=…` is a stateless pass-through for what browsers can't fetch
  themselves (arXiv, publisher pages, PDFs). It answers the site's own pages only.
- `/api/mcp-key` and `/mcp/<token>` are the MCP endpoint (flow 13). It needs a
  site key: `npm run mcp-key`, then `wrangler pages secret put MCP_PRIVATE_KEY`.

```sh
npm run build && npx wrangler pages deploy dist
```

For a bucket, add a CORS rule that lets the site's origin GET, PUT, DELETE and
HEAD, with the headers `authorization`, `content-type`, `x-amz-date` and
`x-amz-content-sha256`.

## Layout

| Path | What |
| --- | --- |
| `impl/<component>/src/` | The eight components: pure TypeScript modules the app imports |
| `impl/<component>/main.mjs` | The same code bundled for `symbola test` / `attest` |
| `src/core/` | The app's core, shared by the browser and the MCP endpoint: storage adapters, opening and saving, adding papers, lookups, cite formats, plugins |
| `src/app/`, `src/ui/` | The browser app: state, offline cache, pdf.js, screens |
| `server/`, `functions/` | The pass-through and the MCP endpoint |
| `public/` | Manifest (with the share target), service worker, icons |
| `attestations/` | Signed `symbola attest` results, and the runner's public key |

## Check it

```sh
npm run test:impl    # each component against its contract (symbola test)
npm test             # app core: save/merge, add flow, MCP, S3 signing
npm run build && CHROMIUM=/path/to/chrome npm run test:e2e   # flows 1-13 in a browser
```

See `NOTES.md` for where the build stopped, how it was tested, and the
readings chosen where the pack is silent.
