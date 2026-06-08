# Benkyou - Japanese Flashcard App

A React TypeScript SPA (Vite) for Japanese vocabulary study using FSRS spaced repetition. Local-first with IndexedDB (Dexie); optional Firebase sync (Auth + Firestore + Storage) when `.env.local` is configured.

## Cursor Cloud specific instructions

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
