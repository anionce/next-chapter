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
  /** Elo rating from head-to-head "which did you prefer?" comparisons
   * (src/pages/ComparePage.tsx) — undefined until the book has been in at
   * least one matchup. A far stronger taste signal than `rating` (a 1-5
   * star score is absolute and noisy; a pairwise pick is a much easier,
   * more honest judgment), and what drives the "resembles your favorites"
   * recommendation bonus in score.ts. */
  eloRating?: number
  eloComparisons?: number
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
  /** "reading"/"read" books never belong in a search for what to read next
   * — the only real choice is your own untouched wishlist, or something
   * genuinely new. */
  source: "wishlist" | "external"
  /** Page-count presets — real data either way, works for both sources. Replaced
   * a free-form min/max Pages range on request: two arbitrary number inputs
   * combined with any other filter narrowed results too aggressively for no
   * real benefit over the coarser short/long presets. */
  length: "short" | "long" | null
}
