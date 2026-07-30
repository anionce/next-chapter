import type { Lang } from "@/store/useLanguageStore"

/** The fixed genre taxonomy — genre chips always show this list, never
 * whatever raw shelf/tag text a CSV happens to contain. Values are stored
 * as-is on `Book.genre` and used for exact-match scoring, so they stay
 * fixed regardless of UI language; only the *display* label changes with
 * `genreLabel()`. */
export const GENRES = [
  "Thriller",
  "Mystery",
  "Crime",
  "Horror",
  "Romance",
  "Fantasy",
  "Sci-Fi",
  "Historical",
  "Literary",
  "Contemporary",
  "Classics",
  "Young Adult",
  "Biography",
  "Self-Help",
  "Poetry",
  "Non-fiction",
] as const

export type Genre = (typeof GENRES)[number]

const GENRE_LABEL: Record<Lang, Record<Genre, string>> = {
  es: {
    Thriller: "Thriller",
    Mystery: "Misterio",
    Crime: "Crimen",
    Horror: "Terror",
    Romance: "Romance",
    Fantasy: "Fantasía",
    "Sci-Fi": "Ciencia ficción",
    Historical: "Histórica",
    Literary: "Literaria",
    Contemporary: "Contemporánea",
    Classics: "Clásicos",
    "Young Adult": "Juvenil",
    Biography: "Biografía",
    "Self-Help": "Autoayuda",
    Poetry: "Poesía",
    "Non-fiction": "No ficción",
  },
  en: {
    Thriller: "Thriller",
    Mystery: "Mystery",
    Crime: "Crime",
    Horror: "Horror",
    Romance: "Romance",
    Fantasy: "Fantasy",
    "Sci-Fi": "Sci-Fi",
    Historical: "Historical",
    Literary: "Literary",
    Contemporary: "Contemporary",
    Classics: "Classics",
    "Young Adult": "Young Adult",
    Biography: "Biography",
    "Self-Help": "Self-Help",
    Poetry: "Poetry",
    "Non-fiction": "Non-fiction",
  },
}

/** Display label for a genre — the stored value is always the canonical
 * (English) `Genre` id, regardless of UI language. */
export function genreLabel(genre: string, lang: Lang): string {
  return GENRE_LABEL[lang][genre as Genre] ?? genre
}

/** Keyword → canonical genre. Checked against every raw shelf/tag/subject
 * string from a CSV import or an Open Library subject, most specific first,
 * so a messy tag like "ya-fantasy" still lands on one real genre. */
const KEYWORD_TO_GENRE: [RegExp, Genre][] = [
  [/young.?adult|\bya\b/, "Young Adult"],
  [/sci.?fi|science.fiction/, "Sci-Fi"],
  [/fantasy/, "Fantasy"],
  [/poetry|poems/, "Poetry"],
  [/biograph|memoir/, "Biography"],
  [/self.help|self.improvement/, "Self-Help"],
  [/thriller|suspense/, "Thriller"],
  [/true.crime|detective/, "Crime"],
  [/mystery|cozy/, "Mystery"],
  [/horror|gothic|ghost/, "Horror"],
  [/romance/, "Romance"],
  [/historical/, "Historical"],
  [/classic/, "Classics"],
  [/contemporary/, "Contemporary"],
  [/non.?fiction|essay/, "Non-fiction"],
  [/literary|literature|fiction/, "Literary"],
]

/** Maps one raw tag to a canonical genre, or null if nothing matches. */
export function matchGenre(raw: string): Genre | null {
  const s = raw.toLowerCase()
  for (const [pattern, genre] of KEYWORD_TO_GENRE) {
    if (pattern.test(s)) return genre
  }
  return null
}

/**
 * Majority vote across every tag, not first-match-wins: a heavily-tagged
 * work (50-90+ Open Library subjects) reliably contains a handful of
 * spurious tags from bad catalog merges — e.g. Elie Wiesel's "La Nuit" (a
 * Holocaust memoir) carries a stray "Fiction, science fiction, general" tag
 * among dozens of legitimate Holocaust/history/biography ones. First-match
 * logic let that one noisy tag hijack the whole classification as "Sci-Fi".
 * Instead, classify each tag individually (its first/most-specific genre
 * match) and tally counts per genre — the genre actually described by most
 * of the tags wins, so one or two stray tags can no longer dominate.
 */
export function pickGenreFromTags(tags: string[]): string {
  const lower = tags.map((t) => t.toLowerCase())
  const counts = new Map<Genre, number>()
  for (const tag of lower) {
    for (const [pattern, genre] of KEYWORD_TO_GENRE) {
      if (pattern.test(tag)) {
        counts.set(genre, (counts.get(genre) ?? 0) + 1)
        break
      }
    }
  }

  let best: Genre | null = null
  let bestCount = 0
  for (const [, genre] of KEYWORD_TO_GENRE) {
    const count = counts.get(genre) ?? 0
    if (count > bestCount) {
      bestCount = count
      best = genre
    }
  }
  return best ?? "Unclassified"
}

/** Hardcover's genre tag string (e.g. "Historical Fiction") → our canonical
 * `Genre`. Deliberately excludes generic tags like "Fiction"/"General" that
 * sit on nearly every fiction book — including them would let the most
 * common tag win every tie instead of the most *specific* one. */
const HARDCOVER_GENRE_TAG_TO_GENRE: Record<string, Genre> = {
  thriller: "Thriller",
  suspense: "Thriller",
  mystery: "Mystery",
  "detective and mystery stories": "Mystery",
  crime: "Crime",
  "true crime": "Crime",
  murder: "Crime",
  horror: "Horror",
  romance: "Romance",
  fantasy: "Fantasy",
  "science fiction": "Sci-Fi",
  "historical fiction": "Historical",
  history: "Historical",
  literature: "Literary",
  "literary criticism": "Literary",
  contemporary: "Contemporary",
  classics: "Classics",
  "young adult": "Young Adult",
  "young adult fiction": "Young Adult",
  "juvenile fiction": "Young Adult",
  biography: "Biography",
  "biography & autobiography": "Biography",
  "self-help": "Self-Help",
  poetry: "Poetry",
  nonfiction: "Non-fiction",
}

export interface HardcoverTagCount {
  tag: string
  count: number
}

/**
 * Hardcover gives every genre tag a real community vote count (how many
 * users applied it), unlike Open Library's flat unweighted subject list —
 * so instead of counting *how many tags* point to a genre, this sums the
 * real vote weight behind each one. A book with one stray low-vote tag
 * can no longer outrank the genre backed by hundreds of real votes.
 */
export function genreFromHardcoverTags(tags: HardcoverTagCount[] | undefined): string {
  const counts = new Map<Genre, number>()
  for (const t of tags ?? []) {
    const genre = HARDCOVER_GENRE_TAG_TO_GENRE[t.tag.toLowerCase()]
    if (genre) counts.set(genre, (counts.get(genre) ?? 0) + t.count)
  }

  let best: Genre | null = null
  let bestCount = 0
  for (const [genre, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      best = genre
    }
  }
  return best ?? "Unclassified"
}
