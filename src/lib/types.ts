import type { MoodId, Season } from "@/lib/moods"

export type BookSource = "seed" | "goodreads" | "storygraph" | "external" | "added"

/** "read" books are never recommended — they only feed the favorites/taste signal. */
export type ReadStatus = "unread" | "reading" | "read"

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
  minPages: number | null
  maxPages: number | null
  afterYear: number | null
  beforeYear: number | null
  /** "reading"/"read" books never belong in a search for what to read next
   * — the only real choice is your own untouched wishlist, or something
   * genuinely new. */
  source: "wishlist" | "external"
  /** Real signal only in "external" mode, via Hardcover's own "fast-paced"/
   * "slow-paced" tags (searched at query time, not post-filtered — no local
   * book ever carries this data, so wishlist-mode filtering by pace always
   * returns nothing, honestly, rather than guessing). */
  pace: "fast" | "slow" | null
  /** Page-count presets — real data either way, works for both sources. */
  length: "short" | "long" | null
}
