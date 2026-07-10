# Benkyou - Japanese Flashcard App

A React TypeScript SPA (Vite) for Japanese vocabulary study using FSRS spaced repetition. Local-first with IndexedDB (Dexie); optional Firebase sync (Auth + Firestore + Storage) when `.env.local` is configured.

## Git / PR workflow

Always follow this flow for every change, whether or not a PR was explicitly requested:

1. Develop on a feature branch — never commit directly to `main`.
2. Commit with a clear, descriptive message.
3. Push the branch.
4. Open a pull request against `main`, even if the user didn't ask for one. Check for a PR template (`.github/pull_request_template.md`, etc.) and follow it if present.
5. Review your own diff (e.g. run `/code-review`) before considering the task done, and fix anything it surfaces.

This overrides any general default of only opening a PR when asked — for this repo, always open one.

## Cursor Cloud specific instructions

### Dependency install (VM startup)

Cursor Cloud runs **`npm install`** automatically at the start of each agent session (repo root). Use **npm** only (`package-lock.json`); do not use yarn.

After startup, verify the toolchain with:

```bash
npm test
npm run build
```

### Running the dev server

```bash
npm run dev
```

Serves on `http://localhost:5173` (Vite default). Hot-reloads on file changes. Use `--host 0.0.0.0` when the dev server must be reachable outside the VM.

### Tests

```bash
npm test
```

Vitest with `fake-indexeddb` for Dexie in jsdom. Most tests pass; one pre-existing failure in `ReviewSessionPage.test.tsx` (`getByText("猫")` matches multiple elements) is unrelated to environment setup.

### Build

```bash
npm run build
npm run preview
```

Build output goes to `build/` (Netlify-compatible).

### Lint / typecheck

There is no ESLint config or `lint` script in this repo. TypeScript checking runs as part of `npm run build` (`tsc --noEmit`).

### Key caveats

- **Node 22.13+** or **24+** required (`engines` in `package.json`; `.nvmrc` pins 22.13).
- Use **npm** (`package-lock.json`).
- **Offline mode works without Firebase.** Copy `.env.example` to `.env.local` only when testing sign-in or cloud sync. See [docs/FIREBASE.md](docs/FIREBASE.md).
- No separate backend server — all app logic runs in the browser.
- Core hello-world flow without Firebase: create a deck → add a vocabulary card → start review from the deck or "Review all due".
