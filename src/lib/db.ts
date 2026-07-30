import Dexie, { type EntityTable } from "dexie"
import type { Book } from "@/lib/types"
import { SEED_BOOKS } from "@/data/books"

export const db = new Dexie("next-chapter") as Dexie & {
  books: EntityTable<Book, "id">
}

db.version(1).stores({
  books: "id, title, author, genre, source, status",
})

export async function ensureSeeded() {
  const count = await db.books.count()
  if (count === 0) {
    await db.books.bulkPut(SEED_BOOKS)
  }
}

export async function replaceLibrary(books: Book[]) {
  await db.transaction("rw", db.books, async () => {
    await db.books.clear()
    await db.books.bulkPut(books)
  })
}

export async function mergeIntoLibrary(books: Book[]) {
  await db.books.bulkPut(books)
}

/** "Lee este." — the decision loop this app exists for: move a book from
 * "unread" to "reading" the moment the user commits to it. */
export async function markAsReading(id: string) {
  await db.books.update(id, { status: "reading" })
}

export async function removeFromLibrary(id: string) {
  await db.books.delete(id)
}
