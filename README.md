# Benkyou

Local-first Japanese SRS (FSRS) with optional Firestore sync. Web/PWA; runs on Linux, macOS, ChromeOS, and Android browsers without an app store.

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

Tests:

```bash
npm test
```

## Configuration

Copy `.env.example` to `.env.local` and add Firebase keys to enable sign-in and cloud sync. Without them, the app works offline-only using IndexedDB.

## Agent / bulk import

See [docs/AGENT_API.md](docs/AGENT_API.md). Local helpers live in `src/services/agentLocal.ts`.
