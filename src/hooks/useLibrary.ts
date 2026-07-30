import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

export function useLibrary() {
  const books = useLiveQuery(() => db.books.toArray(), [], [])
  return books ?? []
}
