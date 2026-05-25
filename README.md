# Benkyou

Local-first Japanese SRS (FSRS) with optional Firestore sync. Web/PWA; runs on Linux, macOS, ChromeOS, and Android browsers without an app store.

## Development

Requires **Node.js 22.13+** or **24+** (`engines` in `package.json`, `.nvmrc` / `.node-version` for `nvm` / `fnm`). Older **22.0–22.12** builds trip `EBADENGINE` on some devDependencies (e.g. `eslint-visitor-keys`). Netlify builds use **Node 22** via `NODE_VERSION` in `netlify.toml`.

```bash
npm install
npm run dev
```

Build (outputs to **`build/`** for Netlify and similar hosts):

```bash
npm run build
npm run preview
```

Tests (Vitest; `fake-indexeddb` for Dexie in jsdom):

```bash
npm test
```

## Configuration

Copy `.env.example` to `.env.local` and add Firebase keys to enable sign-in and cloud sync. Without them, the app works offline-only using IndexedDB.

The cloud project is **`benkyou-c1a8b`** ([Firebase console](https://console.firebase.google.com/project/benkyou-c1a8b/overview)). Setup steps, env vars, and rule deployment: [docs/FIREBASE.md](docs/FIREBASE.md).

## Agent / bulk import

See [docs/AGENT_API.md](docs/AGENT_API.md). Local helpers live in `src/services/agentLocal.ts`.

**Anki (.apkg):** run `npm run dev`, open **Settings**, and choose a single-deck export (`.apkg`). Import runs entirely in the browser (IndexedDB). Optional Vitest integration test reads `とんがり帽子のアトリエ-20260514195355.apkg` from Downloads when present (`src/lib/import/parseApkg.integration.test.ts`).

## Cursor: code review skill

The [awesome-skills/code-review-skill](https://github.com/awesome-skills/code-review-skill) bundle lives in [`.cursor/skills/code-review-skill`](.cursor/skills/code-review-skill). In Cursor Agent, invoke **`/code-review-excellence`** or attach that skill from `@`. Details: [`.cursor/skills/README.md`](.cursor/skills/README.md).
