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

## Agent API

Netlify Functions (`netlify/functions/agent-*.ts`) let an AI agent fetch due cards and grade reviews for translation exercises. See [docs/AGENT_API.md](docs/AGENT_API.md). (Separate from `src/services/agentLocal.ts`, an older local-only helper set.)

[`agent/`](agent/README.md) is a standalone Node/Express web app that runs practice sessions against that API using a locally-hosted LLM — see its README for setup.

## Cursor: code review skill

The [awesome-skills/code-review-skill](https://github.com/awesome-skills/code-review-skill) bundle lives in [`.cursor/skills/code-review-skill`](.cursor/skills/code-review-skill). In Cursor Agent, invoke **`/code-review-excellence`** or attach that skill from `@`. Details: [`.cursor/skills/README.md`](.cursor/skills/README.md).
