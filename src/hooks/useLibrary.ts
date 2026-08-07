import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { firestore } from "@/lib/firebase"
import { useAuth } from "@/hooks/useAuth"
import type { Book } from "@/lib/types"

export function useLibrary(): Book[] {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])

  useEffect(() => {
    if (!user) {
      setBooks([])
      return
    }
    return onSnapshot(collection(firestore, "users", user.uid, "books"), (snapshot) => {
      setBooks(snapshot.docs.map((d) => d.data() as Book))
    })
  }, [user])

  return books
}
