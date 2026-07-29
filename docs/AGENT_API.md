# Agent API

HTTPS endpoints for an AI agent to run **translation exercises** against your deck: it fetches Japanese words/constructions due for review, gives you an English prompt to translate, and reports back whether you got it right.

Implemented as Netlify Functions (`netlify/functions/agent-*.ts`) reading/writing the same Firestore mirror the app's own sync uses (`users/{uid}/cards`, `users/{uid}/scheduling`) via the Firebase Admin SDK — no separate database, no local IndexedDB access (functions run outside the browser). This means **cards must have been synced to Firestore at least once** (Settings → Sync now) before the agent can see them, and any updates the agent makes land on the next "Sync now"/pull on your device, same as an edit made on another device.

The pure selection/grading logic lives in `netlify/lib/agentCore.ts` (unit tested in `netlify/lib/agentCore.test.ts`); `src/services/agentLocal.ts` is a separate, older local-only helper (used for on-device heuristics, not by these routes).

## Routes

Both require `Authorization: Bearer <AGENT_API_TOKEN>`.

### `GET /.netlify/functions/agent-cards?count=N`

Returns up to `N` (default 10, max 50) cards whose Japanese-production review is due — for vocabulary, the "supply the word from a clue" mode; for fill-in-the-gap (grammar) cards, the "type the construction" mode. These are the two modes shaped like a translation exercise: given an English clue, produce the Japanese.

Selection is a **weighted random draw**, not a strict sort — cards further overdue, mid-relearning (i.e. just failed), with more lifetime lapses, or with low memory stability are more likely to be picked, but not guaranteed, so repeated calls don't always return the same set.

Response:

```json
{
  "cards": [
    {
      "id": "abc123",
      "kind": "vocabulary",
      "japaneseWord": "本",
      "meaning": "book",
      "exampleSentences": ["本を読みます"],
      "due": 1732900000000
    },
    {
      "id": "def456",
      "kind": "grammar",
      "japaneseWord": "学生",
      "meaning": "I am a student",
      "exampleSentences": ["私は___です"],
      "due": 1732900000000
    }
  ]
}
```

For a grammar card, `exampleSentences` is the sentence-with-gap itself (`sentenceWithGap`) — the sentence the fill-in-the-gap question is built from. Readings and images are intentionally omitted (not needed for a translation prompt). `id` is the card's own id — unique, stable — and is what to send back to `agent-review`.

### `POST /.netlify/functions/agent-review`

Grades one card's translation-exercise review and reschedules it via FSRS, same as answering it in the app.

Request body:

```json
{ "id": "abc123", "rating": "easy" }
```

or, if the id wasn't kept around:

```json
{ "word": "本", "rating": "ok" }
```

- `id` — a card id as returned by `agent-cards`. Preferred when available.
- `word` — fallback lookup by the Japanese word/construction text (`content.wordJa` for vocabulary, `content.construction` for grammar) when `id` isn't at hand. Provide exactly one of `id`/`word`.
- `rating` — one of `"easy" | "ok" | "hard" | "incorrect"` (maps to FSRS Easy/Good/Hard/Again).

For a vocabulary card this updates its "supply the word from a clue" schedule; for a grammar card, its fill-in-the-gap schedule — whichever mode `agent-cards` used to select it.

Response:

```json
{
  "id": "abc123",
  "kind": "vocabulary",
  "japaneseWord": "本",
  "modeId": "vocab_type_word_from_clue",
  "rating": "easy",
  "nextDue": 1733500000000
}
```

Errors are `{ "error": "..." }` with a non-2xx status (400 bad input, 401 unauthorized, 404 no matching card/schedule, 500 server/config error).

## Setup

Set these as **Netlify site environment variables** (Site configuration → Environment variables) — not in `.env.local`, which is only for the client's `VITE_*` keys.

| Variable | Where to get it |
|---|---|
| `AGENT_API_TOKEN` | Any long random string you generate yourself (e.g. `openssl rand -hex 32`). Give this to the AI agent as its bearer token. |
| `AGENT_FIREBASE_UID` | Your Firebase Auth uid — [Authentication → Users](https://console.firebase.google.com/project/benkyou-c1a8b/authentication/users) in the console, or the `users/{uid}` segment of any doc path under [Firestore data](https://console.firebase.google.com/project/benkyou-c1a8b/firestore/data). |
| `FIREBASE_PROJECT_ID` | `benkyou-c1a8b` |
| `FIREBASE_CLIENT_EMAIL` | From a service account key — Project settings → **Service accounts** → **Generate new private key**. |
| `FIREBASE_PRIVATE_KEY` | Same downloaded JSON's `private_key` field, pasted as-is (Netlify's UI accepts embedded newlines; if yours strips them, escape them as `\n` — the function un-escapes on load). |

Deploy (or `netlify dev` locally with the same vars in a `.env` file) after setting these — functions are picked up from `netlify/functions` per `netlify.toml`.

**Keep the service account key and `AGENT_API_TOKEN` secret** — the service account can read/write your entire Firestore database, and the token is the only thing gating these routes.
