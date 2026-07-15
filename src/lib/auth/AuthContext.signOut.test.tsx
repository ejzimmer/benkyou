/**
 * `lastSyncedAt` isn't scoped per-account (see runSync.ts's
 * `LAST_SYNCED_AT_KEY`) — if it survives a sign-out, a different user
 * signing in on the same device could inherit it and have the no-op
 * short-circuit wrongly skip pulling their data. `signOut` must clear it.
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { firebaseSignOutMock } = vi.hoisted(() => ({
  firebaseSignOutMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  signOut: firebaseSignOutMock,
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
    cb(null)
    return () => {}
  },
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  getAuth: () => ({}),
}))

vi.mock("../firebase", () => ({
  getFirebaseApp: () => ({}),
  isFirebaseConfigured: () => true,
}))

import { AuthProvider, useAuth } from "./AuthContext"
import { writeLastSyncedAt, readLastSyncedAt } from "../sync/runSync"

function SignOutButton() {
  const { signOut } = useAuth()
  return <button onClick={() => signOut()}>sign out</button>
}

describe("AuthContext signOut", () => {
  beforeEach(() => {
    localStorage.clear()
    firebaseSignOutMock.mockClear()
  })

  it("clears lastSyncedAt so the next signed-in user doesn't inherit it", async () => {
    writeLastSyncedAt(Date.now())
    expect(readLastSyncedAt()).not.toBeNull()

    render(
      <AuthProvider>
        <SignOutButton />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByText("sign out"))

    expect(firebaseSignOutMock).toHaveBeenCalled()
    expect(readLastSyncedAt()).toBeNull()
  })
})
