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
 * Fetches and sanitizes a book's Hardcover description (plus its cover, for
 * callers that need a fallback image). Fails soft: any miss along the way
 * is `null`, never an error the caller has to handle.
 */
export async function fetchSynopsis(title: string, author: string): Promise<SynopsisResult | null> {
  const candidate = await findBestCandidate(title, author)
  if (!candidate) return null

  const coverUrl = candidate.image?.url
  if (!candidate.description) return coverUrl ? { text: "", coverUrl } : null

  const cleaned = cleanSynopsis(candidate.description)
  if (!cleaned) return coverUrl ? { text: "", coverUrl } : null

  return { text: cleaned, coverUrl }
}
