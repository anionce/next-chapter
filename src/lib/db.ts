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
  // Snapshot of both books' rating state immediately before this comparison
  // — undo restores these exact values rather than trying to reverse the
  // Elo math itself (which isn't safely invertible in general; a plain
  // subtraction of the last delta would only be correct if you could prove
  // neither book had been touched since, which a snapshot sidesteps
  // entirely by construction).
  previousRatingA: number
  previousRatingB: number
  previousComparisonsA: number
  previousComparisonsB: number
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
 * all. Raised from an earlier, much lower value on request — a small read
 * shelf gives too few possible pairs (and too little real spread of taste)
 * for a ranking to mean anything; 50 books is C(50,2) = 1,225 possible
 * pairs, plenty of room for a genuinely informative ranking to emerge. */
export const MIN_BOOKS_TO_COMPARE = 50

/** Below this many actual head-to-head comparisons made, the "For you" home
 * card treats you as not having a real ranking yet (see HomePage.tsx) —
 * having *some* books marked read isn't the same as having compared enough
 * of them for Elo to mean anything; a book with 1 or 2 comparisons has a
 * rating that's still mostly noise, not a real signal of what you actually
 * prefer. */
export const MIN_COMPARISONS_FOR_FAVORITES = 20

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
 * logs the matchup (so `pickComparisonPair` won't immediately re-ask it,
 * and `undoLastComparison` can restore the exact prior state). */
export async function recordComparison(bookA: Book, bookB: Book, winnerId: string): Promise<void> {
  const ratingA = bookA.eloRating ?? DEFAULT_ELO
  const ratingB = bookB.eloRating ?? DEFAULT_ELO
  const comparisonsA = bookA.eloComparisons ?? 0
  const comparisonsB = bookB.eloComparisons ?? 0
  const [newA, newB] = updateElo(ratingA, ratingB, winnerId === bookA.id ? "A" : "B")

  await db.transaction("rw", db.books, db.comparisons, async () => {
    await db.books.update(bookA.id, { eloRating: newA, eloComparisons: comparisonsA + 1 })
    await db.books.update(bookB.id, { eloRating: newB, eloComparisons: comparisonsB + 1 })
    await db.comparisons.add({
      bookAId: bookA.id,
      bookBId: bookB.id,
      winnerId,
      comparedAt: Date.now(),
      previousRatingA: ratingA,
      previousRatingB: ratingB,
      previousComparisonsA: comparisonsA,
      previousComparisonsB: comparisonsB,
    })
  })
}

/**
 * Reverts the single most recent comparison — restores both books' rating
 * and comparison-count to their exact pre-comparison snapshot and removes
 * the log entry, so `pickComparisonPair` can ask that pair again. Calling
 * this repeatedly walks back through history one step at a time (each undo
 * just operates on whatever the new "most recent" comparison now is), for
 * "actually I meant to pick the other one" mistakes. Returns `false` with
 * nothing to undo (an empty comparison history) rather than throwing.
 */
export async function undoLastComparison(): Promise<boolean> {
  const last = await db.comparisons.orderBy("comparedAt").last()
  if (!last) return false

  await db.transaction("rw", db.books, db.comparisons, async () => {
    await db.books.update(last.bookAId, {
      eloRating: last.previousRatingA,
      eloComparisons: last.previousComparisonsA,
    })
    await db.books.update(last.bookBId, {
      eloRating: last.previousRatingB,
      eloComparisons: last.previousComparisonsB,
    })
    await db.comparisons.delete(last.id!)
  })
  return true
}
