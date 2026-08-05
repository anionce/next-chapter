import Dexie, { type EntityTable } from "dexie"
import type { Book } from "@/lib/types"
import { SEED_BOOKS } from "@/data/books"
import { DEFAULT_ELO, updateElo } from "@/lib/elo"

export interface Comparison {
  id?: number
  bookAId: string
  bookBId: string
  winnerId: string
  comparedAt: number
}

export const db = new Dexie("next-chapter") as Dexie & {
  books: EntityTable<Book, "id">
  comparisons: EntityTable<Comparison, "id">
}

db.version(1).stores({
  books: "id, title, author, genre, source, status",
})

// eloRating/eloComparisons are new fields on the existing `books` records —
// no version bump needed for those (Dexie/IndexedDB only requires declaring
// *indexed* fields, and nothing here is ever queried by rating). The new
// `comparisons` table does need one.
db.version(2).stores({
  books: "id, title, author, genre, source, status",
  comparisons: "++id, bookAId, bookBId, comparedAt",
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

/** "Read this." — the decision loop this app exists for: move a book from
 * "unread" straight to "read" the moment the user commits to it. No
 * intermediate "reading" state — that used to sit here, and got cut since
 * the only thing it changed was where a book sat in the library list. */
export async function markAsRead(id: string) {
  await db.books.update(id, { status: "read" })
}

export async function removeFromLibrary(id: string) {
  await db.books.delete(id)
}

function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join("::")
}

/** Below this many read books, comparisons stop being worth asking for at
 * all — 2 books means exactly one possible pair, exhausted after a single
 * comparison. 4 gives 6 real pairs, enough for a first session to mean
 * something before running out. */
export const MIN_BOOKS_TO_COMPARE = 4

export type ComparisonPairResult =
  | { status: "ok"; pair: [Book, Book] }
  | { status: "not-enough-books" }
  /** Every possible pair among your read books has already been compared —
   * a real, reachable end state, not a bug. Grows again the moment you mark
   * one more book "read". */
  | { status: "exhausted" }

/**
 * Picks a "which did you prefer?" matchup from your read shelf. Never
 * repeats a pair that's already been asked — checked against *every*
 * possible combination among your read books (`readBooks.length` is a
 * personal library, realistically at most a few hundred, so the full O(n²)
 * pair set costs nothing to compute), not just a sampled subset, since a
 * repeat is a real thing to avoid rather than an acceptable fallback. Among
 * the pairs that are still fresh, prefers the ones whose books have been
 * compared the fewest times combined, so coverage spreads across the whole
 * shelf instead of clustering on whichever books get picked first.
 */
export async function pickComparisonPair(): Promise<ComparisonPairResult> {
  const readBooks = await db.books.where("status").equals("read").toArray()
  if (readBooks.length < MIN_BOOKS_TO_COMPARE) return { status: "not-enough-books" }

  const comparisons = await db.comparisons.toArray()
  const seenPairs = new Set(comparisons.map((c) => pairKey(c.bookAId, c.bookBId)))

  const freshPairs: [Book, Book][] = []
  for (let i = 0; i < readBooks.length; i++) {
    for (let j = i + 1; j < readBooks.length; j++) {
      if (!seenPairs.has(pairKey(readBooks[i].id, readBooks[j].id))) freshPairs.push([readBooks[i], readBooks[j]])
    }
  }
  if (freshPairs.length === 0) return { status: "exhausted" }

  const pairCompCount = (pair: [Book, Book]) => (pair[0].eloComparisons ?? 0) + (pair[1].eloComparisons ?? 0)
  const minCount = Math.min(...freshPairs.map(pairCompCount))
  const leastCompared = freshPairs.filter((p) => pairCompCount(p) === minCount)

  return { status: "ok", pair: leastCompared[Math.floor(Math.random() * leastCompared.length)] }
}

/** Updates both books' Elo ratings from a single head-to-head result and
 * logs the matchup (so `pickComparisonPair` won't immediately re-ask it). */
export async function recordComparison(bookA: Book, bookB: Book, winnerId: string): Promise<void> {
  const ratingA = bookA.eloRating ?? DEFAULT_ELO
  const ratingB = bookB.eloRating ?? DEFAULT_ELO
  const [newA, newB] = updateElo(ratingA, ratingB, winnerId === bookA.id ? "A" : "B")

  await db.transaction("rw", db.books, db.comparisons, async () => {
    await db.books.update(bookA.id, { eloRating: newA, eloComparisons: (bookA.eloComparisons ?? 0) + 1 })
    await db.books.update(bookB.id, { eloRating: newB, eloComparisons: (bookB.eloComparisons ?? 0) + 1 })
    await db.comparisons.add({ bookAId: bookA.id, bookBId: bookB.id, winnerId, comparedAt: Date.now() })
  })
}
