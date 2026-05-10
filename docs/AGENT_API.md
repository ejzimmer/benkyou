# Agent API (planned)

The web client stores data in IndexedDB and (when configured) syncs to Firestore. For **AI agent** access, expose authenticated HTTPS endpoints that mirror the local helpers in `src/services/agentLocal.ts`.

## Proposed routes (not implemented server-side in this repo)

- `GET /v1/agent/due` — cards ready for review (same shape as `agentListDue()`).
- `GET /v1/agent/trouble` — cards the learner struggles with (same heuristics as `agentListTrouble()`).
- `POST /v1/bulk/cards` — reserved for Anki / bulk import (empty stub).

Use Firebase ID tokens (`Authorization: Bearer`) or your deployment’s auth scheme. Rate-limit and scope all reads/writes to the authenticated user.
