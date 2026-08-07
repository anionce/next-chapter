import { useEffect, useState } from "react"
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  // Starts true so the sign-in screen never flashes before Firebase has had
  // a chance to restore an existing session.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return {
    user,
    loading,
    signIn: () => signInWithPopup(auth, googleProvider),
    signOut: () => signOut(auth),
  }
}
