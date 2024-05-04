import { createContext, useContext } from "react"
import { Database } from "firebase/database"
import { GoogleAuthProvider } from "firebase/auth"

type FirebaseContextType = {
  database?: Database
  provider?: GoogleAuthProvider
}

export const FirebaseContext = createContext<FirebaseContextType>({
  database: undefined,
  provider: undefined,
})
export function useDatabase() {
  let context
  try {
    context = useContext(FirebaseContext)
  } catch (e) {
    throw new Error("Missing database provider")
  }

  if (!context.database) throw new Error("Database not ready")
  return context.database
}
