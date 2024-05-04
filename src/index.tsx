import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import App from "./App"
import reportWebVitals from "./reportWebVitals"

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"

const firebaseConfig = {
  apiKey: "AIzaSyCHGdflmLLS7GdfHSzyBNK_kZJUi9VhC48",
  authDomain: "benkyou-c1a8b.firebaseapp.com",
  projectId: "benkyou-c1a8b",
  storageBucket: "benkyou-c1a8b.appspot.com",
  messagingSenderId: "788522912273",
  appId: "1:788522912273:web:e327d2e3f407a4a605bfb0",
  databaseURL:
    "https://benkyou-c1a8b-default-rtdb.asia-southeast1.firebasedatabase.app",
}

// Initialize Firebase
initializeApp(firebaseConfig)

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
