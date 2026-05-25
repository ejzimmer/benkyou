# Firebase (project `benkyou-c1a8b`)

Cloud sync uses the existing Firebase project:

**Console:** https://console.firebase.google.com/project/benkyou-c1a8b/overview

## What the app uses

| Product | Purpose |
|---------|---------|
| **Authentication** | Google sign-in (same account on every device) |
| **Cloud Firestore** | Decks, cards, FSRS scheduling (`users/{uid}/…`) |
| **Cloud Storage** | Card image blobs at `users/{uid}/media/{mediaId}` |

**Not supported:** [Firebase Realtime Database](https://firebase.google.com/docs/database). If your project only has Realtime Database, create **Cloud Firestore** in the same project before sync will work.

Security rules for Firestore live in [`firestore.rules`](../firestore.rules) at the repo root. Deploy them after changes:

From the repo root (requires [Node 22+](../README.md)):

```bash
npm install
npm run firebase:login
npm run firebase:deploy-rules
```

The CLI npm package is **`firebase-tools`** (command name `firebase`). Do **not** run `npx firebase login` — that is the web SDK package and will fail with “could not determine executable to run”.

Without installing in the project:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,storage --project benkyou-c1a8b
```

Or install globally: `npm install -g firebase-tools`, then `firebase login` and `firebase deploy …`.

**No CLI:** publish rules in the console — [Firestore rules](https://console.firebase.google.com/project/benkyou-c1a8b/firestore/rules) (paste `firestore.rules`), [Storage rules](https://console.firebase.google.com/project/benkyou-c1a8b/storage/rules) (paste `storage.rules`).

If Storage is not enabled yet, deploy Firestore rules only:

```bash
npx firebase-tools deploy --only firestore:rules --project benkyou-c1a8b
```

## One-time console setup

Enable each product below before `firebase:deploy-rules` (or deploy will fail with “not set up”).

1. Open the [project overview](https://console.firebase.google.com/project/benkyou-c1a8b/overview).
2. **Authentication → Sign-in method** — enable **Google** (and add your app’s authorized domains for production, e.g. Netlify URL).
3. **Firestore Database** (sidebar: **Firestore**, not Realtime Database) — **Create database** if none exists (production mode is fine; `firestore.rules` restrict access to `request.auth.uid`).
4. **Storage** — [open Storage](https://console.firebase.google.com/project/benkyou-c1a8b/storage) → **Get started** → use the default bucket (same Google Cloud region as Firestore if prompted). Card images sync to `users/{uid}/media/{mediaId}`; without Storage, rule deploy and image sync fail.
5. **Project settings → Your apps** — add a **Web** app if you have not already. Copy the `firebaseConfig` object (including `storageBucket`).

## Storage CORS (required for image sync in the browser)

Firebase **security rules** are not enough. The Google Cloud Storage bucket must allow your site’s origin to **read** blobs with `getBytes` / `getBlob` (used during sync). If CORS is missing, the console shows:

`CORS header 'Access-Control-Allow-Origin' missing` (often with HTTP 200).

This is configured on the bucket, not in the Firebase Console UI.

1. Edit [`storage.cors.json`](../storage.cors.json) at the repo root. Add your production origin(s), e.g. `https://your-site.netlify.app` or your custom domain, to the `"origin"` array (keep `http://localhost:5173` for local dev).
2. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and log in (`gcloud auth login`), or use an account that owns project `benkyou-c1a8b`.
3. Apply CORS to the bucket name from `VITE_FIREBASE_STORAGE_BUCKET` (usually `benkyou-c1a8b.firebasestorage.app`):

```bash
gcloud storage buckets update gs://benkyou-c1a8b.firebasestorage.app --cors-file=storage.cors.json
```

Older tooling:

```bash
gsutil cors set storage.cors.json gs://benkyou-c1a8b.firebasestorage.app
```

4. Confirm: `gcloud storage buckets describe gs://benkyou-c1a8b.firebasestorage.app --format="json(cors)"`

If your bucket ends in `.appspot.com`, use that name instead. Re-run sync after CORS is applied (no app redeploy needed).

## Local / Netlify environment variables

Copy [`.env.example`](../.env.example) to `.env.local` (gitignored) and fill values from the web app config:

| Variable | Typical value for this project |
|----------|--------------------------------|
| `VITE_FIREBASE_PROJECT_ID` | `benkyou-c1a8b` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `benkyou-c1a8b.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `benkyou-c1a8b.firebasestorage.app` (or `…appspot.com` if shown in console) |
| `VITE_FIREBASE_API_KEY` | From console (secret — do not commit) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From console |
| `VITE_FIREBASE_APP_ID` | From console |

Use the **storage bucket** exactly as shown in the web app config (often `benkyou-c1a8b.firebasestorage.app` or `benkyou-c1a8b.appspot.com`).

Restart `npm run dev` after changing `.env.local`. Settings should no longer say “offline-only”; use **Sign in with Google**, then **Sync now**.

For **Netlify**, set the same `VITE_*` variables in the site’s environment settings and redeploy.

## Data layout (Firestore)

```
users/{uid}/decks/{deckId}
users/{uid}/cards/{cardId}
users/{uid}/scheduling/{schedulingId}   // e.g. "{cardId}:{modeId}"
```

Sync logic: [`src/lib/sync/firestoreSync.ts`](../src/lib/sync/firestoreSync.ts).

## Sync behaviour

- **Sync now** (Settings) or sign-in runs a full merge: decks, cards, scheduling, images, and tombstones for deletes.
- If the same item changed on two devices since the last sync, a dialog asks which copy to keep.
- Edits while signed in also push in the background (debounced).
- Review event history stays local only (not synced).
