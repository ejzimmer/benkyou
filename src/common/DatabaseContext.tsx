import { createContext, useContext } from "react"
import { Database } from "firebase/database"

export const DatabaseContext = createContext<{ database?: Database }>({
  database: undefined,
})
export function useDatabase() {
  try {
    return useContext(DatabaseContext).database
  } catch (e) {
    console.error("Missing database provider")
  }
}
