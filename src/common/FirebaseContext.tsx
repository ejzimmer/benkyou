import { createContext, useContext } from "react"
import { Database } from "firebase/database"

type FirebaseContextType = {
  database?: Database
}

export const FirebaseContext = createContext<FirebaseContextType>({
  database: undefined,
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
