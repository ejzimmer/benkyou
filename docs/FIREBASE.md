# Firebase (project `benkyou-c1a8b`)

Cloud sync uses the existing Firebase project:

**Console:** https://console.firebase.google.com/project/benkyou-c1a8b/overview

## What the app uses

| Product | Purpose |
|---------|---------|
| **Authentication** | Google sign-in (same account on every device) |
| **Cloud Firestore** | Decks, cards, FSRS scheduling (`users/{uid}/…`) |
| **Cloud Storage** | Not wired yet — card images are still local-only |

Security rules for Firestore live in [`firestore.rules`](../firestore.rules) at the repo root. Deploy them after changes:

```bash
npx firebase-tools deploy --only firestore:rules --project benkyou-c1a8b
```

(Requires Firebase CLI login: `npx firebase-tools login`.)

## One-time console setup

1. Open the [project overview](https://console.firebase.google.com/project/benkyou-c1a8b/overview).
2. **Authentication → Sign-in method** — enable **Google** (and add your app’s authorized domains for production, e.g. Netlify URL).
3. **Firestore Database** — create a database if none exists (production mode is fine; rules restrict access to `request.auth.uid`).
4. **Project settings → Your apps** — add a **Web** app if you have not already. Copy the `firebaseConfig` object.

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

Restart `npm run dev` after changing `.env.local`. Settings should no longer say “offline-only”; use **Sign in with Google**, then **Sync now**.

For **Netlify**, set the same `VITE_*` variables in the site’s environment settings and redeploy.

## Data layout (Firestore)

```
users/{uid}/decks/{deckId}
users/{uid}/cards/{cardId}
users/{uid}/scheduling/{schedulingId}   // e.g. "{cardId}:{modeId}"
```

Sync logic: [`src/lib/sync/firestoreSync.ts`](../src/lib/sync/firestoreSync.ts).

## Known sync limitations

See the product discussion in issues/PRs; briefly:

- Images are not uploaded to Storage yet.
- Deletes and some creates may need a full **Sync now** until write-through gaps are closed.
- Review event history stays local only.
