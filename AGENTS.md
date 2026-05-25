# Benkyou - Japanese Flashcard App

A React TypeScript SPA (Create React App) for Japanese vocabulary study using spaced repetition. No backend server — communicates directly with Firebase (Realtime Database + Auth with Google sign-in).

## Cursor Cloud specific instructions

### Running the dev server

```bash
npm start
```

Serves on `http://localhost:3000`. Hot-reloads on file changes.

### Lint

ESLint is configured via `eslintConfig` in `package.json` (extends `react-app` + `react-app/jest`):

```bash
npx eslint src/
```

### Tests

```bash
CI=true npm test -- --watchAll=false
```

**Known issue:** The single test file (`App.test.tsx`) fails with `ReferenceError: TextEncoder is not defined` due to a CRA Jest + Firebase Auth SDK incompatibility (the `undici` package used by Firebase Auth requires `TextEncoder` which is not available in the Jest/jsdom environment configured by CRA). This is a pre-existing issue unrelated to environment setup.

### Build

```bash
npm run build
```

### Key caveats

- Firebase config (API key, project ID, database URL) is **hardcoded** in `src/index.tsx` — no `.env` files or environment variables are needed.
- The app requires Google sign-in to access any functionality beyond the landing page. Without a valid Google account authenticated against the Firebase project, you can only verify the landing page renders and the OAuth redirect works.
- Both `yarn.lock` and `package-lock.json` exist; use **npm** (matches README instructions and `package-lock.json`).
- Node 18 is required (CRA react-scripts 5.0.1 compatibility).
