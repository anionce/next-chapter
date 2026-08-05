import { create } from "zustand"
import { persist } from "zustand/middleware"
import { SELECTABLE_MOOD_IDS, type MoodId } from "@/lib/moods"

export type ReadingSource = "mood" | "genre" | "surprise" | "favorites"

interface ReadingState {
  selectedMoods: MoodId[]
  selectedGenre: string | null
  lastSource: ReadingSource | null
  /** A standing preference, not scoped to one flow like the fields above —
   * stays set across Mood/Genre visits until the user turns it off. */
  excludeNonFiction: boolean
  toggleMood: (id: MoodId) => void
  setGenre: (genre: string) => void
  setSource: (source: ReadingSource) => void
  toggleExcludeNonFiction: () => void
  /** Sets selectedMoods directly and marks the source as "surprise" in one
   * step — used by "Surprise me" to jump straight to a result without the
   * picker. Distinct from "mood" so the result page can tell a consciously
   * chosen mood apart from a randomly assigned one (and hide the "why this"
   * reasons panel, since the user never actually asked for that mood). */
  setSurpriseMood: (moods: MoodId[]) => void
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set) => ({
      selectedMoods: [],
      selectedGenre: null,
      lastSource: null,
      excludeNonFiction: false,
      // Only one mood at a time — combining moods narrows the real candidate
      // pool too far (each extra mood is another AND condition against an
      // already-thin per-book signal). Clicking a different chip replaces
      // the selection outright rather than blocking until the old one is
      // manually deselected first.
      toggleMood: (id) =>
        set((state) => {
          const has = state.selectedMoods.includes(id)
          return { selectedMoods: has ? [] : [id] }
        }),
      setGenre: (genre) => set({ selectedGenre: genre }),
      setSource: (source) => set({ lastSource: source }),
      toggleExcludeNonFiction: () => set((state) => ({ excludeNonFiction: !state.excludeNonFiction })),
      setSurpriseMood: (moods) => set({ selectedMoods: moods, lastSource: "surprise" }),
    }),
    {
      name: "next-chapter-reading-state",
      // A mood dropped from MOOD_OPTIONS (moods.ts) can still be sitting in
      // an existing user's persisted selectedMoods from before the cut —
      // sanitized once here, right after rehydration, so every consumer
      // (MAX_MOODS counting, search, display) always sees clean data instead
      // of each call-site needing its own filter.
      onRehydrateStorage: () => (state) => {
        if (state) state.selectedMoods = state.selectedMoods.filter((m) => SELECTABLE_MOOD_IDS.has(m))
      },
    }
  )
)
