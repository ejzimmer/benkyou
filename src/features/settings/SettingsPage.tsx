import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../lib/auth/AuthContext"
import { useSync } from "../../lib/sync/SyncContext"
import { useWakeLock } from "../../lib/useWakeLock"
import { formatSyncLogLine } from "../../lib/sync/syncLog"
import type {
  BulkImportPayload,
  GrammarCandidate,
  GrammarDecisionMap,
} from "../../lib/import/types"
import type { ImportGapDraft } from "../../lib/import/gaps"
import {
  ankiImportNeedsUserInput,
  completeAnkiImport,
  convertImportSession,
  importBulkPayload,
  startAnkiImport,
  type AnkiImportSession,
  type ImportProgress,
} from "../../services/ankiImport"
import { BUILD_LABEL_LOCAL } from "../../lib/buildInfo"
import { AnkiImportGapReview } from "./AnkiImportGapReview"
import { GrammarClassifyReview } from "./GrammarClassifyReview"

function importProgressLabel(progress: ImportProgress): string {
  switch (progress.phase) {
    case "reading":
      return progress.total > 0
        ? `Reading images… ${progress.current}/${progress.total}`
        : "Reading package…"
    case "saving":
      return progress.total > 0
        ? `Saving cards… ${progress.current}/${progress.total}`
        : "Saving…"
    case "syncing":
      return `Syncing to the cloud… ${progress.current}/${progress.total}`
    case "uploading-media":
      return progress.total > 0
        ? `Uploading images… ${progress.current}/${progress.total}`
        : "Uploading images…"
  }
}

export function SettingsPage() {
  const { user, offlineOnly, loading, signInGoogle, signOut } = useAuth()
  const {
    syncNow,
    syncing,
    syncPhase,
    syncStatusLabel,
    syncLog,
    lastError,
    lastSyncedAt,
    conflictActive,
  } = useSync()
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [pendingImport, setPendingImport] = useState<BulkImportPayload | null>(
    null,
  )
  const [session, setSession] = useState<AnkiImportSession | null>(null)
  const [grammarCandidates, setGrammarCandidates] = useState<
    GrammarCandidate[]
  >([])
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null,
  )
  const wakeLockStatus = useWakeLock(importing)
  const [importElapsedSec, setImportElapsedSec] = useState(0)

  // A visible, second-by-second tick so a stalled/slow phase (e.g. syncing
  // each card over the network) still looks alive between progress updates.
  useEffect(() => {
    if (!importing) {
      setImportElapsedSec(0)
      return
    }
    const startedAt = Date.now()
    const id = setInterval(() => {
      setImportElapsedSec(Math.round((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [importing])

  function resetImportState() {
    setPendingImport(null)
    setSession(null)
    setGrammarCandidates([])
    setImporting(false)
    setImportErr(null)
    setImportProgress(null)
  }

  /** Convert a payload, then either show gap review or import it directly. */
  async function proceedWithPayload(payload: BulkImportPayload) {
    if (ankiImportNeedsUserInput(payload)) {
      setSession(null)
      setGrammarCandidates([])
      setImportProgress(null)
      setPendingImport(payload)
      return
    }
    await importBulkPayload(payload, user, setImportProgress)
    resetImportState()
    setImportMsg(
      `Imported ${payload.cards.length} cards into “${payload.deck.name}”. Open it from the home screen.`,
    )
  }

  async function onPickAnkiPackage(file: File | null) {
    setImportMsg(null)
    setImportErr(null)
    resetImportState()
    if (!file) return
    setImporting(true)
    setImportProgress({ phase: "reading", current: 0, total: 0 })
    try {
      const lower = file.name.toLowerCase()
      if (!lower.endsWith(".apkg") && !lower.endsWith(".colpkg")) {
        throw new Error("Choose an Anki package (.apkg or .colpkg)")
      }
      const { session: parsed, grammarCandidates: candidates } =
        await startAnkiImport(file, (current, total) =>
          setImportProgress({ phase: "reading", current, total }),
        )
      if (candidates.length > 0) {
        // Pause for the user to confirm grammar vs vocab before building cards.
        setSession(parsed)
        setGrammarCandidates(candidates)
        return
      }
      await proceedWithPayload(convertImportSession(parsed))
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }

  async function onConfirmGrammar(decisions: GrammarDecisionMap) {
    if (!session) return
    setImporting(true)
    setImportErr(null)
    try {
      await proceedWithPayload(convertImportSession(session, decisions))
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }

  async function onConfirmGapReview(drafts: Record<string, ImportGapDraft>) {
    if (!pendingImport) return
    setImporting(true)
    setImportErr(null)
    try {
      const completed = await completeAnkiImport(
        pendingImport,
        drafts,
        user,
        setImportProgress,
      )
      resetImportState()
      setImportMsg(
        `Imported ${completed.cards.length} cards into “${completed.deck.name}”. Open it from the home screen.`,
      )
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <Link to="/">← Home</Link>
        <h1>Settings</h1>
      </header>

      <section className="panel">
        <h2>Account</h2>
        {loading && <p>Loading…</p>}
        {offlineOnly && (
          <p className="muted">
            Firebase env vars are not set — running in offline-only mode. Add
            <code> .env.local</code> from <code>.env.example</code> to enable
            sync.
          </p>
        )}
        {!offlineOnly && !user && (
          <div className="stack">
            <button type="button" className="btn primary" onClick={signInGoogle}>
              Sign in with Google
            </button>
            <p className="muted small">
              Email sign-in can be wired from the console; Google is enabled by default.
            </p>
          </div>
        )}
        {user && (
          <div className="stack">
            <p>Signed in as {user.email ?? user.uid}</p>
            <button type="button" className="btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Sync</h2>
        <p className="muted small">
          Data lives in IndexedDB first; sync pushes/pulls to Firestore when
          online and signed in. Open the browser console (F12) for detailed{" "}
          <code>[benkyou sync]</code> logs.
        </p>
        <button
          type="button"
          className="btn primary"
          disabled={offlineOnly || !user || syncing || conflictActive}
          onClick={() => void syncNow()}
        >
          {conflictActive
            ? "Resolve conflict…"
            : syncing
              ? "Syncing…"
              : "Sync now"}
        </button>
        {(syncing || syncPhase === "conflict") && syncStatusLabel && (
          <p className="muted small">{syncStatusLabel}</p>
        )}
        {lastSyncedAt && (
          <p className="muted small">
            Last synced: {new Date(lastSyncedAt).toLocaleString()}
          </p>
        )}
        {lastError && <p className="error">{lastError}</p>}
        {syncLog.length > 0 && (
          <details className="sync-log-details" open={syncing || syncPhase === "conflict"}>
            <summary className="muted small">Sync log ({syncLog.length} lines)</summary>
            <pre className="sync-log-pre small">
              {syncLog.slice(-24).map((e) => formatSyncLogLine(e)).join("\n")}
            </pre>
          </details>
        )}
      </section>

      <section className="panel stack">
        <h2>Anki import</h2>
        <p className="muted small">
          Export <strong>one deck</strong> from Anki as an <code>.apkg</code> (include
          scheduling if you want to keep intervals). Then choose the file here — it
          stays in your browser; nothing is uploaded to a server.
        </p>
        <p className="muted small">
          Full <code>.colpkg</code> files also work: the deck with the most cards is
          imported. Prefer a single-deck <code>.apkg</code> for smaller files.
        </p>
        {!pendingImport && grammarCandidates.length === 0 && (
          <label className="row">
            <span>Anki package</span>
            <input
              type="file"
              accept=".apkg,.colpkg,application/zip"
              disabled={importing}
              onChange={(e) => void onPickAnkiPackage(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        {importProgress && (
          <div className="stack" aria-live="polite">
            <p className="muted">
              <span className="import-spinner" aria-hidden="true" />
              {importProgressLabel(importProgress)}
              {importElapsedSec > 0 ? ` (${importElapsedSec}s)` : ""}
            </p>
            {importProgress.total > 0 && (
              <progress
                value={importProgress.current}
                max={importProgress.total}
                style={{ width: "100%" }}
              />
            )}
            <p className="muted small">
              {wakeLockStatus === "active"
                ? "Your screen will stay on until this finishes."
                : "Keep this screen unlocked until this finishes — locking it may stall or interrupt the import."}
            </p>
          </div>
        )}
        {session && grammarCandidates.length > 0 && (
          <GrammarClassifyReview
            candidates={grammarCandidates}
            deckName={session.pkg.deckName}
            importing={importing}
            onCancel={resetImportState}
            onConfirm={(decisions) => void onConfirmGrammar(decisions)}
          />
        )}
        {pendingImport && (
          <AnkiImportGapReview
            payload={pendingImport}
            importing={importing}
            onCancel={resetImportState}
            onConfirm={(drafts) => void onConfirmGapReview(drafts)}
          />
        )}
        {importMsg && <p className="muted">{importMsg}</p>}
        {importErr && <p className="error">{importErr}</p>}
      </section>

      <p className="muted small" title="If this time is older than the latest GitHub deploy, hard-refresh or clear site data.">
        App build: {BUILD_LABEL_LOCAL}
      </p>
    </div>
  )
}
