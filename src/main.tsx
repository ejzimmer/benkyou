import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { App } from "./App"
import { AuthProvider } from "./lib/auth/AuthContext"
import { warmFirebaseClients } from "./lib/firebase"
import { SyncProvider } from "./lib/sync/SyncContext"
import "./index.css"

warmFirebaseClients()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
          <App />
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
