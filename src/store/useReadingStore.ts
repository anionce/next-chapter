import { create } from "zustand"
import { persist } from "zustand/middleware"
import { SELECTABLE_MOOD_IDS, type MoodId } from "@/lib/moods"

const MAX_MOODS = 3

export type ReadingSource = "mood" | "genre"

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
  /** Sets selectedMoods directly and marks the source as "mood" in one step
   * — used by "Surprise me" to jump straight to a result without the picker. */
  setMoods: (moods: MoodId[]) => void
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set) => ({
      selectedMoods: [],
      selectedGenre: null,
      lastSource: null,
      excludeNonFiction: false,
      toggleMood: (id) =>
        set((state) => {
          const has = state.selectedMoods.includes(id)
          if (has) return { selectedMoods: state.selectedMoods.filter((m) => m !== id) }
          if (state.selectedMoods.length >= MAX_MOODS) return state
          return { selectedMoods: [...state.selectedMoods, id] }
        }),
      setGenre: (genre) => set({ selectedGenre: genre }),
      setSource: (source) => set({ lastSource: source }),
      toggleExcludeNonFiction: () => set((state) => ({ excludeNonFiction: !state.excludeNonFiction })),
      setMoods: (moods) => set({ selectedMoods: moods, lastSource: "mood" }),
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
