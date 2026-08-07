import { collection, deleteDoc, doc, getDocs, updateDoc, writeBatch } from "firebase/firestore"
import type { Book } from "@/lib/types"
import { SEED_BOOKS } from "@/data/books"
import { firestore } from "@/lib/firebase"

// Firestore write batches cap at 500 operations — chunk anything larger
// (a personal library realistically never gets close, but CSV imports are
// user-supplied data, not a size we control).
const BATCH_LIMIT = 500

function booksCollection(uid: string) {
  return collection(firestore, "users", uid, "books")
}

async function batched(books: Book[], op: (batch: ReturnType<typeof writeBatch>, book: Book) => void) {
  for (let i = 0; i < books.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const book of books.slice(i, i + BATCH_LIMIT)) op(batch, book)
    await batch.commit()
  }
}

export async function ensureSeeded(uid: string) {
  const snapshot = await getDocs(booksCollection(uid))
  if (snapshot.empty) {
    await batched(SEED_BOOKS, (batch, book) => batch.set(doc(booksCollection(uid), book.id), book))
  }
}

export async function replaceLibrary(uid: string, books: Book[]) {
  const existing = await getDocs(booksCollection(uid))
  for (let i = 0; i < existing.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const d of existing.docs.slice(i, i + BATCH_LIMIT)) batch.delete(d.ref)
    await batch.commit()
  }
  await batched(books, (batch, book) => batch.set(doc(booksCollection(uid), book.id), book))
}

export async function mergeIntoLibrary(uid: string, books: Book[]) {
  await batched(books, (batch, book) => batch.set(doc(booksCollection(uid), book.id), book))
}

/** "Read this." — the decision loop this app exists for: move a book from
 * "unread" straight to "read" the moment the user commits to it. No
 * intermediate "reading" state — that used to sit here, and got cut since
 * the only thing it changed was where a book sat in the library list. */
export async function markAsRead(uid: string, id: string) {
  await updateDoc(doc(booksCollection(uid), id), { status: "read" })
}

export async function removeFromLibrary(uid: string, id: string) {
  await deleteDoc(doc(booksCollection(uid), id))
}
