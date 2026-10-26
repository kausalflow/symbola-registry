# Rondel pilot

The third spec pack built from a real product, and the first with a network protocol and encrypted file formats at its core: [spikinglabs/rondel](https://github.com/spikinglabs/rondel) at 0abb9de (0.29.1), an end-to-end encrypted retrospective and meeting tool. It is a React static app plus a small room server (Node with SQLite, or Cloudflare Durable Objects). The key lives only in the meeting link.

| Path | What it is | Ships to buyers |
| --- | --- | --- |
| `versions/1/` | BRIEF, PRODUCT (the whole app and both server adapters), AGENTS, 7 assumptions, 72 obligations, six components | yes |
| `attestations/` | Rondel itself attested against all six components, with the runner key | yes, as evidence |
| `oracle/` | Adapters that run Rondel's own TypeScript per component (`RONDEL_SRC` points at a checkout with `npm ci` done), the case generators, and the fact-mutant screen | no |
| `REVIEW.md` | Questions for spikinglabs, with the answers | no |

## How it went

1. **Extract.** A blind `symbola extract` (2 rounds, about 33 minutes) with a hint to cover what a rebuild must get exactly right to work with real Rondel clients and saved files. It produced six components:
   - `meeting`: the meeting document and its operations
   - `series`: periods, open/create/closed, and the room and key per meeting
   - `link-crypto`: key derivation, the auth proof, sealing, links and routes, plus updates saved by 0.26.0 and 0.27.0
   - `backup`: plain and passphrase backup files
   - `room`: the room server's WebSocket protocol, limits and retention, as an event trace
   - `template`: template YAML, errors by line, and designer checks

   Randomness is pinned through seeded ids and fixed nonces, with properties for the random parts. About 100 one-line fact mutants were run as a screen, with no agent run. All were killed except two equivalent ones.
2. **Review.** spikinglabs confirmed the priorities and all seven `default` obligations, so every obligation is now `decided`.
3. **Not yet checked.** Five app-level obligations have no checks (7%): the client sync, the HTTP/WebSocket transport and static serving, local-first storage, the peer-to-peer fallback, and the surfaces. Checking the transport needs an http/WebSocket driver. Until then, Rondel's own `e2e/server.mjs` (with `BASE_URL`) can test a rebuilt server against the real app.
