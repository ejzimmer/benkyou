# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Benkyou is a local-first Japanese SRS (FSRS spaced repetition) flashcard app. React + TypeScript SPA built with Vite, runs as a PWA. Local-first with IndexedDB (Dexie); optional Firebase (Auth + Firestore + Storage) sync when `.env.local` is configured — without it the app works fully offline.

## Commands

```bash
npm install
npm run dev            # Vite dev server, http://localhost:5173
npm test                # vitest run — full suite
npm run build           # tsc --noEmit && vite build (output: build/)
npm run preview         # preview the production build
```

Single test file or name:

```bash
npx vitest run src/features/review/ReviewSessionPage.test.tsx
npx vitest run -t "blocks submitting a reading answer"
```

There is no ESLint config or `lint` script despite `eslint` being a devDependency — type checking (`tsc --noEmit`) is the only static check, and runs as part of `npm run build`.

Requires Node **22.13+** or **24+** (`engines` in `package.json`; `.nvmrc`/`.node-version` pin it). Use npm (`package-lock.json`), not yarn.

Tests use Vitest with `fake-indexeddb` standing in for Dexie under jsdom.

## Git / PR workflow

- Always create a PR, even if the user didn't explicitly ask for one. Develop on a feature branch (never commit directly to `main`), commit with a clear message, push, and open a PR against `main` (check for a PR template first).
- Review the PR yourself — there will be no other reviews. Use `/code-review` on the diff and fix anything it surfaces.
- Merge the PR yourself once you're happy with it. There's no need to keep the PR open waiting on outside activity (reviews, comments) that isn't coming.

## Architecture

### Data model (`src/domain/types.ts`, `src/lib/db/schema.ts`)

`Card` is a discriminated union: `{ kind: "vocabulary", content: VocabularyCardContent } | { kind: "grammar", content: GrammarCardContent }` — vocabulary and grammar cards are structurally different content shapes, not a shared base type. `REVIEW_MODES` (`domain/types.ts`) is the single source of truth for the 6 `ReviewModeId`s (3 per card kind, e.g. `vocab_type_reading`, `vocab_type_word_from_clue`, `grammar_type_construction`); `reviewModesForCard(card)` derives which modes actually apply to a given card from which optional content fields are filled in.

Dexie DB `benkyou` has tables: `decks`, `cards`, `scheduling` (one row per card × `ReviewModeId`, so each mode has its own independent FSRS schedule), `reviewEvents` (judgement audit log, used for grading heuristics and undo), `reviewUndo` (single-slot "undo last judgement" snapshot), `media` (blobs + cached digest for sync comparisons), `tombstones`, and `syncOutbox`. FSRS card state is stored serialized (dates as epoch ms) since Dexie doesn't index `Date` well across sync JSON.

Adding a new review mode touches: `REVIEW_MODES`/`reviewModesForCard` (`domain/types.ts`), latency-to-grade thresholds (`lib/srs/time-to-rating.ts`), UI labels (`REVIEW_MODE_LABELS` in `reviewFlowHelpers.ts`), and the per-mode expected-answer/typing logic in `reviewFlowHelpers.ts`.

### Services (`src/services/`)

- `cards.ts` — CRUD + validation, creates the initial `scheduling` rows for whichever modes `reviewModesForCard` returns, pushes to remote on write.
- `decks.ts` — deck CRUD; deleting a deck cascades tombstones across its cards/scheduling/media.
- `review.ts` — the due-queue and grading engine. `getDueQueue(now)` loads due `scheduling` rows, bulk-fetches only the referenced cards, filters to modes still valid for the card, and shuffles while keeping two due items for the same card non-adjacent. Judging: `prepareJudgement` snapshots the row for undo → `commitJudgement` converts response latency to an FSRS grade (`lib/srs/time-to-rating.ts`; a wrong answer is always "Again") → `applyGrade` (`lib/srs/schedule.ts`, via `ts-fsrs`) computes the next due date.
- `bulkImport.ts`/`ankiImport.ts` — persist a parsed `BulkImportPayload` into Dexie and push it to remote in batches.

### Sync (`src/lib/sync/`)

Every mutation writes to Dexie first and is immediately usable offline. Two push paths: a 30s-debounced full resync as a safety net, and a fire-and-forget single-doc push for near-immediate propagation. `runFullSync` (session start, gated by `SyncContext`/`ReviewSyncGate`) first runs a cheap no-op short-circuit: if `lastSyncedAt` (localStorage) is set, the full pipeline last actually ran within `MAX_SHORT_CIRCUIT_INTERVAL_MS` (tracked separately as `lastFullSyncAt`, since `lastSyncedAt` itself advances on every short-circuited pass too and can't bound staleness on its own), and local has decks/cards/scheduling all non-empty, it checks — via indexed Dexie range queries and tiny Firestore `where(...">"...)`/count-aggregation queries, not full downloads — whether anything changed on either side since; if nothing did, it skips straight to a media-hydration retry and returns. Otherwise (or on any doubt, or if that check throws) it falls through to the full pipeline: pull a remote snapshot → apply tombstones (deletions win if newer than the entity) → per-entity conflict resolution by `updatedAt` (real conflicts surface to the user via `SyncConflictModal`) → media sync by content digest (only differing blobs move) → push anything local-only or local-newer. Writes during merge re-check tombstone/staleness inside the same Dexie transaction to close races against concurrent user edits mid-sync.

### Review session UI (`src/features/review/`)

`ReviewSessionPage.tsx` orchestrates a session: builds the queue, runs a `"prompt" | "answer"` phase state machine, times prompt→reveal latency for grading, and supports resuming mid-session via `resumeCardId`/`resumeModeId`/`resumePhase` URL params (e.g. returning from editing a card). `ReviewSessionPromptBody.tsx` renders the mode-specific question/typing input; `ReviewSessionAnswerPanel.tsx` renders the revealed answer and Correct/Incorrect controls. `reviewFlowHelpers.ts` is the shared pure-logic layer: `expectedAnswer()` (correct answer per mode/card), `answersMatch()` (comma vs 、 tolerant comparison for multi-gap answers), and per-mode display predicates.

### Japanese-text domain logic

`src/domain/` holds card-content-aware logic: `grammarGaps.ts` (parsing/joining comma-or-、-separated multi-gap answers), `vocabularyContent.ts`/`grammarContent.ts` (predicates like `hasVocabularyPronunciation`, reading-segment extraction), `readingsMap.ts` (greedy longest-match tokenizer turning a phrase→reading map into furigana segments — shared by both card kinds and by `ui/KanjiRuby.tsx`'s `<ruby>` rendering).

`src/lib/japanese/` holds lower-level text utilities not tied to the card model: `normalize.ts` (NFKC normalization, hiragana/kanji/katakana detection, `finalizeReadingAnswer` which fixes wanakana's dangling-romaji-"n" IME issue on submit), `synonyms.ts` (accepts alternate correct answers via a card's `synonymsJa` list, and detects "typed the primary word instead of its reading").

Typed reading answers are converted live via wanakana's `toHiragana` IME mode, then finalized on submit before grading.

### Anki import (`src/lib/import/`)

Client-side `.apkg` importer: unzips (JSZip), decompresses zstd SQLite (`fzstd`), reads it with `sql.js` (WASM), and resolves the media filename map. `convert.ts` classifies each Anki note into vocabulary vs. grammar by field heuristics, producing a `BulkImportPayload`. `ankiSrs.ts` maps Anki's scheduling fields onto an approximate FSRS state; suspended/leech cards get a due date pushed ~100 years out to mimic never surfacing. Notes the heuristics can't confidently classify go through a manual review UI (`GrammarClassifyReview`, `AnkiImportGapReview`).

## Configuration

Firebase is optional — copy `.env.example` to `.env.local` to enable sign-in and cloud sync (see `docs/FIREBASE.md`). Cloud project: `benkyou-c1a8b`. Without it the app runs offline-only against IndexedDB.
