import type { MoodId, Season } from "@/lib/moods"

export type BookSource = "seed" | "goodreads" | "storygraph" | "external" | "added"

/** "read" books are never recommended back to you. Deliberately just two
 * states, not three — a "reading" status used to exist between them and was
 * cut: the only thing it changed was where a book sat in the library list,
 * and simplifying to a plain wishlist/read split removed a whole real state
 * (and every place that had to account for it) for something that turned
 * out not to matter. */
export type ReadStatus = "unread" | "read"

export interface Book {
  id: string
  title: string
  author: string
  pages: number | null
  year: number | null
  genre: string
  isbn?: string
  /** Open Library's own cover id — used as a fallback for library books
   * that only have an ISBN (CSV imports). Externally-discovered books carry
   * a direct `coverUrl` from Hardcover instead. */
  coverId?: number
  /** Direct cover image URL (Hardcover-sourced external books). Preferred
   * over `coverId`/`isbn` when present. */
  coverUrl?: string
  moods: MoodId[]
  season?: Season
  status: ReadStatus
  rating?: number
  source: BookSource
}

export interface ScoredBook {
  book: Book
  score: number
  reasons: string[]
}

export interface AdvancedFilters {
  author: string
  genre: string | null
  afterYear: number | null
  beforeYear: number | null
  /** "read" books never belong in a search for what to read next — the only
   * real choice is your own untouched wishlist, or something genuinely new. */
  source: "wishlist" | "external"
  /** Page-count presets — real data either way, works for both sources. Replaced
   * a free-form min/max Pages range on request: two arbitrary number inputs
   * combined with any other filter narrowed results too aggressively for no
   * real benefit over the coarser short/long presets. */
  length: "short" | "long" | null
}
