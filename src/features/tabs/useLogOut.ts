import { signOut } from "firebase/auth"
import { useAuth } from "../../lib/auth/AuthContext"
import { getJournalAuth } from "../media/journalStorage"
import { signOutOfWaniKani } from "../wanikani/signOutOfWaniKani"

export type LogOutChoices = {
  shouldDeleteApiKey: boolean
  shouldLogOutOfGoogle: boolean
}

export function useLogOut() {
  const { signOut: signOutOfBenkyou } = useAuth()

  return async ({ shouldDeleteApiKey, shouldLogOutOfGoogle }: LogOutChoices) => {
    await Promise.all([
      shouldDeleteApiKey && signOutOfWaniKani(),
      shouldLogOutOfGoogle && signOutOfBenkyou(),
      shouldLogOutOfGoogle && signOut(getJournalAuth()),
    ])
  }
}
