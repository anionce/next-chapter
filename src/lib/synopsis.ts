import { hardcoverQuery } from "@/lib/hardcoverClient"

/**
 * Descriptions can still contain the odd markdown link or escaped-newline
 * backslash even from a curated source like Hardcover (publisher blurbs get
 * pasted in as-is) — cheap insurance to strip them, and bail out if what's
 * left is too short to be a real synopsis.
 */
function cleanSynopsis(raw: string): string | null {
  let text = raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^#+.*$/gm, "")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-—*.,;:\s]+/, "")

  if (text.length < 40) return null
  if (text.length > 320) {
    text = text.slice(0, 320)
    const lastSpace = text.lastIndexOf(" ")
    text = (lastSpace > 200 ? text.slice(0, lastSpace) : text) + "…"
  }
  return text
}

export interface SynopsisResult {
  text: string
  /** Real edition cover art, when one exists — used as a fallback for local
   * library books that don't already carry a cover of their own. */
  coverUrl?: string
  /** A short excerpt from a real, positive (rating >= 4) reader review —
   * never negative, never spoiler-flagged. `undefined` when none qualify;
   * this is a nice-to-have, not something worth a disclaimer when absent. */
  reviewQuote?: string
}

/** Study guides, "summary of" knockoffs, and box-set bundles regularly
 * outrank the real book in Hardcover's search relevance ranking — filtered
 * out before picking a candidate rather than trusted as the top hit. */
const JUNK_TITLE_PATTERN = /^(summary|study guide|book club discussion guide)\b/i

interface CandidateBook {
  id: number
  title: string
  users_count: number
  description: string | null
  image: { url: string } | null
}

/**
 * Looks up a book by title+author via Hardcover's fuzzy `search` endpoint.
 * The endpoint's relevance ranking regularly puts a zero-content knockoff
 * first (observed: "SUMMARY OF THE THURSDAY MURDER CLUB..." outranked the
 * real novel, which had 3,325 real readers against the knockoff's 2) — so
 * this fetches several candidates and picks the one with the most real
 * engagement, filtering out obvious knockoffs by title first.
 */
async function findBestCandidate(title: string, author: string): Promise<CandidateBook | null> {
  const searchData = await hardcoverQuery<{ search: { ids: number[] } }>(
    `query SearchBook($q: String!) { search(query: $q, query_type: "Book") { ids } }`,
    { q: `${title} ${author}` }
  )
  const ids = searchData?.search.ids.slice(0, 10) ?? []
  if (ids.length === 0) return null

  const bookData = await hardcoverQuery<{ books: CandidateBook[] }>(
    `query GetCandidates($ids: [Int!]) {
      books(where: {id: {_in: $ids}}) { id title users_count description image { url } }
    }`,
    { ids }
  )
  const candidates = (bookData?.books ?? []).filter((b) => !JUNK_TITLE_PATTERN.test(b.title))
  if (candidates.length === 0) return null

  return candidates.reduce((best, b) => (b.users_count > best.users_count ? b : best))
}

/**
 * Reviews come back as HTML (Hardcover's rich-text editor output — `<p>`,
 * `<strong>`, spoiler `<span>` wrappers, HTML entities like `&#39;`), and
 * are often many paragraphs long. This strips markup down to plain text and
 * truncates to quote length — same truncate-at-a-space-boundary shape as
 * `cleanSynopsis`, just shorter, since a multi-paragraph review reads as a
 * wall of text where a two-line synopsis doesn't.
 */
function cleanReviewQuote(html: string): string | null {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Some reviews (often ones migrated from Goodreads/StoryGraph) open
    // with a literal "Title by Author X Stars" line as part of the review
    // body itself — not something we're adding, but redundant with the
    // book's own title/rating already shown right above the quote, so it
    // reads as duplicated clutter rather than part of the actual opinion.
    .replace(/^.{1,80}?\s+by\s+.{1,60}?\s+\d(?:\.\d)?\s*stars?\.?\s*/i, "")

  if (text.length < 20) return null
  if (text.length <= 180) return text
  const truncated = text.slice(0, 180)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + "…"
}

/** Hardcover reviews are written in whatever language the reviewer used —
 * this app is English-only (see useLanguageStore.ts), so a Spanish/French/
 * etc. quote would be the one piece of non-English text on the page.
 * No language-detection library here, just a cheap positive check: real
 * English text almost always contains several of the handful of words that
 * appear in nearly every English sentence, at a density foreign-language
 * text won't have by chance. */
const ENGLISH_STOPWORDS = new Set([
  "the",
  "and",
  "was",
  "this",
  "that",
  "with",
  "for",
  "have",
  "are",
  "but",
  "you",
  "from",
  "not",
  "its",
  "been",
  "were",
  "they",
  "she",
  "he",
  "it",
  "of",
  "to",
  "is",
  "a",
])

function looksEnglish(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/)
  let matches = 0
  for (const w of words) {
    if (ENGLISH_STOPWORDS.has(w.replace(/[^a-z']/g, ""))) matches++
    if (matches >= 3) return true
  }
  return false
}

interface ReviewRow {
  review: string
}

/**
 * A short excerpt from a real, positive reader review — `rating >= 4` (of
 * Hardcover's 5-star scale), never spoiler-flagged, and only ever English
 * (see `looksEnglish` above) — ordered by `likes_count` so a genuinely
 * well-regarded take wins over an arbitrary one. Several candidates are
 * fetched, not just one, since an individual review can clean down to
 * `null` (too short once markup is stripped) or fail the language check —
 * the first one that survives both wins.
 */
async function fetchPositiveReviewQuote(bookId: number): Promise<string | undefined> {
  const data = await hardcoverQuery<{ user_books: ReviewRow[] }>(
    `query GetPositiveReviews($bookId: Int!) {
      user_books(
        where: {book_id: {_eq: $bookId}, has_review: {_eq: true}, review_has_spoilers: {_eq: false}, rating: {_gte: 4}}
        order_by: {likes_count: desc}
        limit: 8
      ) { review }
    }`,
    { bookId }
  )
  for (const row of data?.user_books ?? []) {
    const cleaned = cleanReviewQuote(row.review)
    if (cleaned && looksEnglish(cleaned)) return cleaned
  }
  return undefined
}

/**
 * Cover-only lookup — same candidate resolution as `fetchSynopsis` (real
 * engagement wins over knockoffs), but skips the description-cleaning and
 * review-fetching work for callers that only need an image (ComparePage.tsx,
 * for local-library books whose CSV import never carried a cover of their
 * own). Fails soft: `undefined` on any miss, never an error.
 */
export async function fetchBookCoverUrl(title: string, author: string): Promise<string | undefined> {
  const candidate = await findBestCandidate(title, author)
  return candidate?.image?.url
}

/**
 * Fetches and sanitizes a book's Hardcover description (plus its cover and
 * a positive review quote, for callers that want them). Fails soft: any
 * miss along the way is `null`/`undefined`, never an error the caller has
 * to handle.
 */
export async function fetchSynopsis(title: string, author: string): Promise<SynopsisResult | null> {
  const candidate = await findBestCandidate(title, author)
  if (!candidate) return null

  const coverUrl = candidate.image?.url
  const reviewQuote = await fetchPositiveReviewQuote(candidate.id)

  if (!candidate.description) return coverUrl || reviewQuote ? { text: "", coverUrl, reviewQuote } : null

  const cleaned = cleanSynopsis(candidate.description)
  if (!cleaned) return coverUrl || reviewQuote ? { text: "", coverUrl, reviewQuote } : null

  return { text: cleaned, coverUrl, reviewQuote }
}
