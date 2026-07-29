# benkyou-agent

A small standalone web app that runs translation-practice sessions against
your benkyou deck using a locally-hosted LLM: it pulls due cards from the
[Agent API](../docs/AGENT_API.md), asks the LLM for an English sentence to
translate, grades what you type against the target word/construction, and
reports the result back so FSRS reschedules the card.

It's a separate Node/Express server from the main Vite app (different
runtime shape: long-running process vs. static SPA build), kept in this repo
because it's tightly coupled to `docs/AGENT_API.md`.

## Why a server instead of a browser-only app

Two things a plain client-side webapp can't do:

- **Reach your LLM.** The model runs on your local network, not the public
  internet, so whatever calls it needs to be running on that same network.
- **Keep two API keys secret.** The benkyou agent token and (if your LLM
  endpoint needs one) its API key must never end up in code shipped to a
  browser. Here they live server-side in `.env` and never leave the process;
  the browser only ever talks to this server's own `/api/*` routes.

The UI itself is a plain page served by the same process, so any device on
your LAN (including a Chromebook) can just open a browser tab to it.

## Setup

```bash
cd agent
npm install
cp .env.example .env
```

Fill in `.env`:

- `BENKYOU_API_URL` / `BENKYOU_AGENT_TOKEN` — from your deployed benkyou
  Netlify site's Agent API, see [`../docs/AGENT_API.md`](../docs/AGENT_API.md)
  for how to generate the token and where the base URL comes from.
- `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` — your local LLM server's
  OpenAI-compatible chat endpoint (e.g. Ollama's `http://<lan-ip>:11434/v1`,
  or LM Studio's `http://<lan-ip>:1234/v1`). `LLM_API_KEY` can be left blank
  for servers that don't require one.

Run it on a machine that's on the same network as your LLM:

```bash
npm run dev      # tsx, hot-reloads on change
# or
npm run build && npm start
```

It listens on `0.0.0.0:$PORT` (default `3001`) so other devices on your LAN
can reach it at `http://<this-machine's-lan-ip>:3001` — open that from your
Chromebook's browser.

## Known gaps (infrastructure-first pass)

- No auth on the web UI itself — anyone who can reach this port on your LAN
  can use it and spend your LLM's/benkyou's API calls. Fine for a home
  network; add a shared password or basic auth before exposing it further.
- Card selection is a random pick from the due batch, and grading/feedback
  quality depends entirely on the local model's prompt-following — both are
  meant to be iterated on, not final.
- No session persistence: refreshing mid-exercise loses the current prompt
  (a `Next card` press fetches a new one from the due queue, so nothing is
  lost from benkyou's side, just the in-progress sentence).
