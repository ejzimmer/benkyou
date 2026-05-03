import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  type User,
} from "firebase/auth"
import { getFirebaseApp, isFirebaseConfigured } from "../firebase"

type AuthCtx = {
  user: User | null
  loading: boolean
  offlineOnly: boolean
  signInGoogle: () => Promise<void>
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const offlineOnly = !isFirebaseConfigured()

  useEffect(() => {
    const app = getFirebaseApp()
    if (!app) {
      setLoading(false)
      return
    }
    const auth = getAuth(app)
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const signInGoogle = useCallback(async () => {
    const app = getFirebaseApp()
    if (!app) throw new Error("Firebase not configured")
    const auth = getAuth(app)
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }, [])

  const signInEmail = useCallback(async (email: string, password: string) => {
    const app = getFirebaseApp()
    if (!app) throw new Error("Firebase not configured")
    await signInWithEmailAndPassword(getAuth(app), email, password)
  }, [])

  const signUpEmail = useCallback(async (email: string, password: string) => {
    const app = getFirebaseApp()
    if (!app) throw new Error("Firebase not configured")
    await createUserWithEmailAndPassword(getAuth(app), email, password)
  }, [])

  const signOut = useCallback(async () => {
    const app = getFirebaseApp()
    if (!app) return
    await firebaseSignOut(getAuth(app))
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      offlineOnly,
      signInGoogle,
      signInEmail,
      signUpEmail,
      signOut,
    }),
    [
      user,
      loading,
      offlineOnly,
      signInGoogle,
      signInEmail,
      signUpEmail,
      signOut,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error("AuthProvider missing")
  return v
}
