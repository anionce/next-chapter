import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore"

// Firebase's web config is not a secret (unlike the Hardcover key in
// hardcoverClient.ts) — access control is enforced by Firestore security
// rules + Auth, not by hiding this, so it's fine to read via the VITE_
// prefix and ship in the client bundle.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Persistent local cache (IndexedDB-backed) in front of Firestore's server
// data — gives the same instant, no-spinner feel Dexie had, but as a cache,
// not the source of truth: clearing it just forces a re-fetch from the
// server on next load instead of losing anything.
export const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
})
