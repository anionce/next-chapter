const HARDCOVER_API_URL = "https://api.hardcover.app/v1/graphql"
const API_KEY = import.meta.env.VITE_HARDCOVER_API_KEY

/**
 * Thin GraphQL client for Hardcover's free API (requires a personal API key
 * in `.env` as `VITE_HARDCOVER_API_KEY` — a personal-use-only setup, since
 * the key is tied to one Hardcover account and ships in the client bundle).
 * Fails soft: a missing key or any network/GraphQL error just returns null,
 * never throws — every caller treats "no external data" as a normal case,
 * same contract the old Open Library integration had.
 */
export async function hardcoverQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  if (!API_KEY) return null
  try {
    const res = await fetch(HARDCOVER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) return null
    const json: { data?: T; errors?: unknown } = await res.json()
    if (json.errors || !json.data) return null
    return json.data
  } catch {
    return null
  }
}
