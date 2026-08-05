import { SELECTABLE_MOOD_IDS, type MoodId } from "@/lib/moods"
import type { Book, ReadStatus } from "@/lib/types"
import { genreFromHardcoverTags, type Genre, type HardcoverTagCount } from "@/lib/genres"
import { hardcoverQuery } from "@/lib/hardcoverClient"

/**
 * Hardcover's tag_category ids, confirmed via schema introspection (no
 * public enum for these — they're stable per-install ids, not slugs).
 * 1 = genre, 4 = mood. (2 = tag/freeform, 3 = content-warning, 37 = pace,
 * unused here.)
 */
const CATEGORY_GENRE = 1
const CATEGORY_MOOD = 4

interface HardcoverTagRef {
  tag: string
  categoryId: number
}

/**
 * Our mood → the Hardcover tag that represents it. Restricted to real
 * Hardcover "Mood"-category tags only (categoryId 4) — a curated,
 * StoryGraph-style taxonomy (Cozy, dark, emotional, tense, reflective,
 * feel-good...), genuine per-book community signal. Earlier versions of
 * this map fell back to Genre/Tag categories for concepts with no direct
 * mood tag (gothic→Horror genre, historical→Historical Fiction genre,
 * nature→Nature genre, small town→a freeform tag) — dropped entirely, on
 * request: a genre proxy answers "is this book *about* X", not "does this
 * book *feel like* X", and the gap between those two questions is large
 * enough that most books matching the genre never carried the mood as a
 * real signal either (confirmed live: only 11 of 65 books found via the
 * "Nature" genre tag actually had "naturaleza" in their own weighted top
 * moods — the rest were about nature but felt tragic, suspenseful,
 * reflective, anything but "nature-mood"). `otonal`/`estival`/`invernal`
 * (matched via `book.season` instead) and `saga-familiar` (no tag of any
 * kind exists for it) were already excluded for the same reason. The
 * `MoodId` type still has all 18 values — CSV imports may still carry the
 * dropped ones — only the picker (`MOOD_OPTIONS` in moods.ts) and this
 * search map are restricted to the 6 with real Hardcover mood-tag backing
 * *and* a large enough real (post-scoring) result count to be worth
 * offering. Three more were cut: acogedor/Cozy and reconfortante/Feel-Good
 * only have 72 and 86 books on all of Hardcover that pass the quality gate
 * at all (verified live) — a hard ceiling on Hardcover's own tagging
 * volume. inquietante/scary passes that raw count (173) but almost never
 * survives into a book's own top-3 *weighted* moods — it's a low-volume tag
 * (194 uses site-wide) that "dark"/"tense" (tens of thousands of uses)
 * completely outweigh on the same books, since a scary book is usually also
 * dark/tense and those get tagged far more often (0 real matches out of 113
 * author-capped candidates, confirmed live). All three kept out of this map
 * since nothing ever calls buildQueries() with those MoodIds anymore.
 */
const MOOD_TO_HARDCOVER_TAG: Partial<Record<MoodId, HardcoverTagRef>> = {
  atmosferico: { tag: "mysterious", categoryId: CATEGORY_MOOD },
  "que-hace-pensar": { tag: "reflective", categoryId: CATEGORY_MOOD },
  emotivo: { tag: "emotional", categoryId: CATEGORY_MOOD },
  suspense: { tag: "tense", categoryId: CATEGORY_MOOD },
  oscuro: { tag: "dark", categoryId: CATEGORY_MOOD },
  tragico: { tag: "sad", categoryId: CATEGORY_MOOD },
}

const GENRE_TO_HARDCOVER_TAG: Record<Genre, string> = {
  Thriller: "Thriller",
  Mystery: "Mystery",
  Crime: "Crime",
  Horror: "Horror",
  Romance: "Romance",
  Fantasy: "Fantasy",
  "Sci-Fi": "Science Fiction",
  Historical: "Historical Fiction",
  Literary: "Literature",
  Contemporary: "Contemporary",
  Classics: "Classics",
  "Young Adult": "Young Adult",
  Biography: "Biography",
  "Self-Help": "Self-Help",
  Poetry: "Poetry",
  "Non-fiction": "Nonfiction",
}

/** Hardcover mood-tag string → our MoodId, for reading a book's *own*
 * `cached_tags.Mood` back into our taxonomy (the reverse of the map above —
 * kept separate since a couple of our moods read from Genre/Tag tags that
 * would otherwise collide with unrelated Mood-category strings). */
const REVERSE_MOOD_TAG: Record<string, MoodId> = {
  cozy: "acogedor",
  mysterious: "atmosferico",
  reflective: "que-hace-pensar",
  "thought-provoking": "que-hace-pensar",
  emotional: "emotivo",
  tense: "suspense",
  suspenseful: "suspense",
  dark: "oscuro",
  sad: "tragico",
  depressing: "tragico",
  melancholy: "tragico",
  "feel-good": "reconfortante",
  hopeful: "reconfortante",
  heartwarming: "reconfortante",
  lighthearted: "reconfortante",
  scary: "inquietante",
}

/** A tag needs at least this many real user votes on *this* book before it
 * counts as a signal — filters out one-off/mistaken taggings without being
 * so strict that lesser-known (but still quality-gated) books lose all
 * mood coverage. */
const MOOD_MIN_VOTES = 2

function moodsFromHardcoverTags(cachedTags: HardcoverCachedTags): MoodId[] {
  const counts = new Map<MoodId, number>()
  const bump = (moodId: MoodId | undefined, weight: number) => {
    if (!moodId || weight < MOOD_MIN_VOTES) return
    counts.set(moodId, (counts.get(moodId) ?? 0) + weight)
  }
  for (const t of cachedTags.Mood ?? []) bump(REVERSE_MOOD_TAG[t.tag.toLowerCase()], t.count)

  // REVERSE_MOOD_TAG still maps a couple of tags (cozy, feel-good/hopeful/
  // heartwarming/lighthearted) to moods that were cut from MOOD_OPTIONS —
  // filtered out here so a book's own .moods can never carry an id that's
  // no longer selectable/searchable, matching SELECTABLE_MOOD_IDS everywhere
  // else. counts' keys (a Map) are already unique, so no dedup step needed.
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mood]) => mood)
    .filter((mood) => SELECTABLE_MOOD_IDS.has(mood))
}

interface HardcoverCachedTags {
  Mood?: HardcoverTagCount[]
  Genre?: HardcoverTagCount[]
  Tag?: HardcoverTagCount[]
}

interface HardcoverEdition {
  isbn_13: string | null
  isbn_10: string | null
}

interface HardcoverBook {
  id: number
  title: string
  pages: number | null
  release_year: number | null
  editions_count: number
  cached_tags: HardcoverCachedTags
  contributions?: { author: { name: string } | null }[]
  editions?: HardcoverEdition[]
  image?: { url: string } | null
  description?: string | null
}

const BOOK_FIELDS = `
  id
  title
  pages
  release_year
  editions_count
  cached_tags
  contributions { author { name } }
  editions(limit: 5) { isbn_13 isbn_10 }
  image { url }
`

/**
 * "Known and normal" filter, now based purely on `editions_count` (a direct
 * scalar field on `books`, not a relation — sortable/filterable server-side)
 * — not `users_count`/`ratings_count`. Those measure engagement *within*
 * Hardcover's own (comparatively small, newer) community specifically,
 * which can badly understate a book's real-world reach: "Out of My Mind" (a
 * genuine #1 NYT bestseller) had only 262 Hardcover users but 19 real
 * editions — confirmed live, alongside junk duplicate catalog stubs with 0
 * editions and 0 users, both ends of the check matching real-world fact.
 * How many times a book has actually been reprinted/republished is a
 * signal about the book itself, independent of any one platform's size.
 * Threshold picked empirically: at editions_count >= 5, every one of the 15
 * selectable genres has 300+ distinct authors passing (weakest: Self-Help
 * at 369) — comfortably above the 200-result target; at >= 10 the weakest
 * genre drops to 176, already short of 200.
 */
const MIN_EDITIONS = 5

function passesQualityBar(doc: HardcoverBook): boolean {
  return doc.editions_count >= MIN_EDITIONS
}

function pickIsbn(editions: HardcoverEdition[] | undefined): string | undefined {
  if (!editions) return undefined
  for (const e of editions) if (e.isbn_13) return e.isbn_13
  for (const e of editions) if (e.isbn_10) return e.isbn_10
  return undefined
}

function mapHardcoverBook(doc: HardcoverBook, fallbackGenre: string): Book | null {
  const title = doc.title?.trim()
  const author = doc.contributions?.[0]?.author?.name?.trim()
  if (!title || !author) return null
  if (!passesQualityBar(doc)) return null

  // Moods come *only* from the book's own weighted `cached_tags` — never
  // from "this book matched the search filter, so credit it anyway". Tried
  // that (forcing the searched mood onto every result whose live `taggings`
  // row matched, to fix a thin-candidate-pool problem): it surfaced Elie
  // Wiesel's "Night" — a Holocaust memoir — as a "Feel-Good" match, because
  // some single stray/mistaken tagging matched the retrieval filter despite
  // being completely absent from the book's real mood profile (dark, sad,
  // emotional, reflective — nowhere near "feel-good"). A thin pool is an
  // honest outcome `rankBooks` already handles (fewer real matches, or the
  // "closest we found" disclaimer); a wrong match presented with confidence
  // is not.
  const moods = moodsFromHardcoverTags(doc.cached_tags ?? {})
  // `fallbackGenre` is a real searched-for Genre only when this came from a
  // genre-driven query (buildQueries sets "Unclassified" for mood/generic
  // searches) — only then does "what we searched for" mean anything to
  // prefer.
  const preferred = fallbackGenre !== "Unclassified" ? (fallbackGenre as Genre) : undefined
  const genre = genreFromHardcoverTags(doc.cached_tags?.Genre, preferred)

  return {
    id: `external-hc-${doc.id}`,
    title,
    author,
    pages: doc.pages ?? null,
    year: doc.release_year ?? null,
    genre: genre !== "Unclassified" ? genre : fallbackGenre,
    isbn: pickIsbn(doc.editions),
    coverUrl: doc.image?.url,
    moods,
    status: "unread" as ReadStatus,
    source: "external",
  }
}

/**
 * A prolific, long-running author can still flood one tag's result set
 * (kept from the Open Library era as a safety net — Hardcover's real
 * popularity ranking is far more author-diverse by default than Open
 * Library's per-subject `sort=rating` was, but this costs nothing to keep).
 */
function capPerAuthor(books: Book[], maxPerAuthor: number): Book[] {
  const counts = new Map<string, number>()
  const out: Book[] = []
  for (const b of books) {
    const key = b.author.toLowerCase()
    const count = counts.get(key) ?? 0
    if (count >= maxPerAuthor) continue
    counts.set(key, count + 1)
    out.push(b)
  }
  return out
}

/** Fisher-Yates — `order_by: editions_count desc` is deterministic, so
 * without this the same top-N books would win on every single visit,
 * forever. No separate "top N by popularity" pre-shuffle slice anymore —
 * `editions_count >= MIN_EDITIONS` *is* the popularity bar now, and the
 * target is a genuinely wide, diverse pool (200+ per genre), not a small
 * curated shortlist, so there's nothing left to additionally narrow. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Dedup key independent of any id scheme, so external results can be matched
 * against library rows built by a different slugify() (src/lib/csv.ts).
 * Title-only, on purpose: author fields vary too much across sources
 * ("Jane Austen" vs "Austen, Jane") to be a reliable exact-match signal.
 */
export function bookKey(title: string): string {
  return normalize(title.split(":")[0]).replace(/\s+(a novel|novel)$/, "")
}

interface TagQuery {
  tag: string
  categoryId: number
  fallbackGenre: string
}

/**
 * One query per relevant axis, not just the first selected mood — searching
 * only moods[0] meant picking 2 or 3 moods didn't change the external
 * results at all.
 */
function buildQueries(genre: string | null | undefined, moods: MoodId[]): TagQuery[] {
  if (genre) {
    const tag = GENRE_TO_HARDCOVER_TAG[genre as Genre] ?? genre
    return [{ tag, categoryId: CATEGORY_GENRE, fallbackGenre: genre }]
  }
  if (moods.length > 0) {
    const seen = new Map<string, TagQuery>()
    for (const m of moods.slice(0, 3)) {
      const ref = MOOD_TO_HARDCOVER_TAG[m]
      if (!ref) continue
      const key = `${ref.categoryId}:${ref.tag}`
      if (!seen.has(key)) seen.set(key, { tag: ref.tag, categoryId: ref.categoryId, fallbackGenre: "Unclassified" })
    }
    if (seen.size > 0) return Array.from(seen.values())
  }
  return [{ tag: "Fiction", categoryId: CATEGORY_GENRE, fallbackGenre: "Unclassified" }]
}

async function fetchByTag(ref: TagQuery, limit: number): Promise<Book[]> {
  const query = `
    query FetchByTag($tag: String!, $categoryId: Int!, $limit: Int!) {
      books(
        where: {taggings: {tag: {tag: {_eq: $tag}, tag_category_id: {_eq: $categoryId}}}}
        order_by: {editions_count: desc}
        limit: $limit
      ) {
        ${BOOK_FIELDS}
      }
    }
  `
  const data = await hardcoverQuery<{ books: HardcoverBook[] }>(query, {
    tag: ref.tag,
    categoryId: ref.categoryId,
    limit,
  })
  if (!data) return []
  const books: Book[] = []
  for (const doc of data.books) {
    const book = mapHardcoverBook(doc, ref.fallbackGenre)
    if (book) books.push(book)
  }
  // Shuffling the *entire* capped pool (not a pre-sliced "top N") is what
  // makes both the composition and order of the final result vary across
  // visits — `order_by: editions_count desc` + a fixed `limit` alone would
  // fetch the exact same deterministic set from Hardcover every time.
  return shuffle(capPerAuthor(books, 3))
}

/**
 * Discovers new titles from Hardcover (free with a personal API key, see
 * README/memory for setup) for a genre/mood combo, excluding anything
 * already tracked in the user's own library. Queries every selected mood
 * (not just the first) in parallel and round-robin interleaves the results.
 * Fails soft — a missing key or network error just yields an empty list.
 */
export async function searchExternalBooks(
  genre: string | null | undefined,
  moods: MoodId[],
  excludeKeys: Set<string>,
  limit = 200
): Promise<Book[]> {
  const queries = buildQueries(genre, moods)
  // Fetch a pool well beyond `limit` per axis — the weakest genre (Self-Help)
  // has its *entire* real pool (467 books) inside this range, and shuffling
  // that whole thing (not just its top N) is what makes both which books
  // show up and their order vary across visits, not just the order.
  const perQueryLimit = Math.min(700, Math.max(200, limit * 3))
  const results = await Promise.all(queries.map((ref) => fetchByTag(ref, perQueryLimit)))

  const seen = new Set(excludeKeys)
  // One slot per author in the final visible set — without this, two
  // different mood queries can each independently surface the same author.
  const authorSeen = new Set<string>()
  const merged: Book[] = []
  for (let i = 0; merged.length < limit && results.some((list) => i < list.length); i++) {
    for (const list of results) {
      if (merged.length >= limit) break
      const book = list[i]
      if (!book) continue
      const key = bookKey(book.title)
      if (seen.has(key)) continue
      const authorKey = book.author.toLowerCase()
      if (authorSeen.has(authorKey)) continue
      seen.add(key)
      authorSeen.add(authorKey)
      merged.push(book)
    }
  }
  return merged
}

/**
 * Retrieval for the "For you" flow (HomePage.tsx's "For you" card): unlike
 * every other search here, this actively queries by your favorites
 * directly, not just a single derived genre. Same-author is the strongest
 * signal `bestFavoriteMatch()` (score.ts) already checks for when scoring,
 * but a plain genre search only ever surfaces it by coincidence — this
 * queries each of your top (up to 3) distinct favorite authors' catalogs
 * directly (same underlying author search as an explicit Filters-page
 * search) *and* the usual genre pool, in parallel, then interleaves them —
 * author-catalog matches first (rarer and a stronger signal), the genre
 * pool filling out the rest.
 */
export async function searchByFavorites(
  favorites: Book[],
  fallbackGenre: string | null,
  excludeKeys: Set<string>,
  limit = 200
): Promise<Book[]> {
  const authors: string[] = []
  const seenAuthors = new Set<string>()
  for (const b of favorites) {
    const key = b.author.toLowerCase()
    if (seenAuthors.has(key)) continue
    seenAuthors.add(key)
    authors.push(b.author)
    if (authors.length >= 3) break
  }

  const [authorResults, genrePool] = await Promise.all([
    Promise.all(authors.map((author) => searchExternalByFilters({ author, excludeKeys, limit: 30 }))),
    searchExternalBooks(fallbackGenre, [], excludeKeys, limit),
  ])

  const seen = new Set(excludeKeys)
  const merged: Book[] = []
  for (const list of authorResults) {
    for (const book of list) {
      if (merged.length >= limit) break
      const key = bookKey(book.title)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(book)
    }
  }
  for (const book of genrePool) {
    if (merged.length >= limit) break
    const key = bookKey(book.title)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(book)
  }

  return merged
}

/**
 * Direct author/genre search for the Filters page's "search outside" mode.
 * Hardcover's `_ilike`/fuzzy operators are disabled on the public API, so
 * author matching goes through the Typesense-backed `search` endpoint
 * (query_type: "Author") to resolve fuzzy author names to ids first, then
 * filters the main `books` query by those ids.
 *
 * A `pace` filter (fast-paced/slow-paced, Mood category id 4) used to live
 * here too — removed on request after checking real coverage: only 2,572
 * books on all of Hardcover have ever been tagged "fast-paced" (481 for
 * slow-paced), vs. 23,026 for a common mood like "dark" — combined with any
 * other filter it reliably wiped out 98%+ of an otherwise healthy pool
 * (confirmed live: "<300 pages, published 2020+" alone = 1,700 books;
 * adding "fast-paced" = 24). Same structural problem as inquietante/scary
 * getting cut from the mood picker, just discovered on this axis instead.
 *
 * Diversification (author cap + shuffle, same as `searchExternalBooks`)
 * only applies when there's no author filter — if you searched for a
 * specific author, you want *their* catalog, not one book from them capped
 * down like every other candidate.
 */
export async function searchExternalByFilters(params: {
  author?: string
  genre?: string | null
  afterYear?: number | null
  beforeYear?: number | null
  minPages?: number | null
  maxPages?: number | null
  excludeKeys?: Set<string>
  limit?: number
}): Promise<Book[]> {
  const limit = params.limit ?? 200
  const fetchLimit = params.author ? limit : Math.min(700, Math.max(200, limit * 3))
  const conditions: string[] = []
  const variables: Record<string, unknown> = { limit: fetchLimit }
  let variableDecls = "$limit: Int!"

  if (params.author) {
    const authorData = await hardcoverQuery<{ search: { ids: number[] } }>(
      `query SearchAuthor($q: String!) { search(query: $q, query_type: "Author") { ids } }`,
      { q: params.author }
    )
    const authorIds = authorData?.search.ids.slice(0, 10) ?? []
    if (authorIds.length === 0) return []
    conditions.push("{contributions: {author_id: {_in: $authorIds}}}")
    variableDecls += ", $authorIds: [Int!]"
    variables.authorIds = authorIds
  }

  const fallbackGenre = params.genre ?? "Unclassified"
  if (params.genre) {
    const tag = GENRE_TO_HARDCOVER_TAG[params.genre as Genre] ?? params.genre
    conditions.push("{taggings: {tag: {tag: {_eq: $genreTag}, tag_category_id: {_eq: 1}}}}")
    variableDecls += ", $genreTag: String!"
    variables.genreTag = tag
  }

  // Year/pages need to narrow the query itself, not just post-filter its
  // results — without this, a query with no author/genre set fetches the
  // top ~600 books by *all-time* editions_count (ancient, universally
  // reprinted classics dominate that ranking), and a client-side "published
  // 2020+" filter on that pool can easily find nothing at all, even though
  // thousands of real 2020+ books exist on Hardcover — the fetch itself was
  // just never scoped to look for them.
  if (params.afterYear) {
    conditions.push("{release_year: {_gte: $afterYear}}")
    variableDecls += ", $afterYear: Int!"
    variables.afterYear = params.afterYear
  }
  if (params.beforeYear) {
    conditions.push("{release_year: {_lte: $beforeYear}}")
    variableDecls += ", $beforeYear: Int!"
    variables.beforeYear = params.beforeYear
  }
  if (params.minPages) {
    conditions.push("{pages: {_gte: $minPages}}")
    variableDecls += ", $minPages: Int!"
    variables.minPages = params.minPages
  }
  if (params.maxPages) {
    conditions.push("{pages: {_lte: $maxPages}}")
    variableDecls += ", $maxPages: Int!"
    variables.maxPages = params.maxPages
  }

  const where = conditions.length > 0 ? `{_and: [${conditions.join(", ")}]}` : "{}"
  const query = `
    query SearchByFilters(${variableDecls}) {
      books(where: ${where}, order_by: {editions_count: desc}, limit: $limit) {
        ${BOOK_FIELDS}
      }
    }
  `
  const data = await hardcoverQuery<{ books: HardcoverBook[] }>(query, variables)
  if (!data) return []

  const excludeKeys = params.excludeKeys ?? new Set<string>()
  const books: Book[] = []
  for (const doc of data.books) {
    const book = mapHardcoverBook(doc, fallbackGenre)
    if (book && !excludeKeys.has(bookKey(book.title))) books.push(book)
  }
  // Same diversification as searchExternalBooks — skipped when browsing a
  // specific author's catalog, where "one book per author" would be wrong.
  return params.author ? books.slice(0, limit) : shuffle(capPerAuthor(books, 3)).slice(0, limit)
}
