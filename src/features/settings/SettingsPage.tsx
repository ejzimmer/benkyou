import { Link } from "react-router-dom"
import { useAuth } from "../../lib/auth/AuthContext"
import { useSync } from "../../lib/sync/SyncContext"

export function SettingsPage() {
  const { user, offlineOnly, loading, signInGoogle, signOut } = useAuth()
  const { syncNow, syncing, lastError, lastSyncedAt, conflictActive } = useSync()

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
          online and signed in.
        </p>
        <button
          type="button"
          className="btn primary"
          disabled={offlineOnly || !user || syncing || conflictActive}
          onClick={() => syncNow()}
        >
          {conflictActive
            ? "Resolve conflict…"
            : syncing
              ? "Syncing…"
              : "Sync now"}
        </button>
        {lastSyncedAt && (
          <p className="muted small">
            Last synced: {new Date(lastSyncedAt).toLocaleString()}
          </p>
        )}
        {lastError && <p className="error">{lastError}</p>}
      </section>
    </div>
  )
}
