import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../lib/auth/AuthContext"
import { useSync } from "../../lib/sync/SyncContext"
import { formatSyncLogLine } from "../../lib/sync/syncLog"
import type { BulkImportPayload } from "../../lib/import/types"
import type { ImportGapDraft } from "../../lib/import/gaps"
import {
  ankiImportNeedsUserInput,
  completeAnkiImport,
  importBulkPayload,
  parseAnkiPackageFile,
} from "../../services/ankiImport"
import { AnkiImportGapReview } from "./AnkiImportGapReview"

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

  function resetImportState() {
    setPendingImport(null)
    setImporting(false)
    setImportErr(null)
  }

  async function onPickAnkiPackage(file: File | null) {
    setImportMsg(null)
    setImportErr(null)
    setPendingImport(null)
    if (!file) return
    setImporting(true)
    try {
      const lower = file.name.toLowerCase()
      if (!lower.endsWith(".apkg") && !lower.endsWith(".colpkg")) {
        throw new Error("Choose an Anki package (.apkg or .colpkg)")
      }
      const payload = await parseAnkiPackageFile(file)
      if (ankiImportNeedsUserInput(payload)) {
        setPendingImport(payload)
        return
      }
      await importBulkPayload(payload, user)
      setImportMsg(
        `Imported ${payload.cards.length} cards into “${payload.deck.name}”. Open it from the home screen.`,
      )
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  async function onConfirmGapReview(drafts: Record<string, ImportGapDraft>) {
    if (!pendingImport) return
    setImporting(true)
    setImportErr(null)
    try {
      const completed = await completeAnkiImport(pendingImport, drafts, user)
      setPendingImport(null)
      setImportMsg(
        `Imported ${completed.cards.length} cards into “${completed.deck.name}”. Open it from the home screen.`,
      )
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImporting(false)
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
          online and signed in. A typical first sync finishes in a few seconds;
          large decks can take up to a minute. Open the browser console (F12) for{" "}
          <code>[benkyou sync]</code> logs — if a step stays on “→ start” for
          more than 30s, check network, ad blockers, or Firebase rules.
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
        {!pendingImport && (
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
        {importing && !pendingImport && <p className="muted">Reading package…</p>}
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
    </div>
  )
}
