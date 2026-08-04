const HARDCOVER_PROXY_URL = "/.netlify/functions/hardcover"

/**
 * Thin client for the Hardcover GraphQL proxy (netlify/functions/hardcover.ts,
 * mirrored for local dev by the Vite plugin in vite.config.ts). The browser
 * never talks to Hardcover directly: its API blocks arbitrary browser
 * origins (CORS), and a direct call would also ship the personal API key in
 * the client bundle. Fails soft: a missing key, network error, or GraphQL
 * error just returns null, never throws — every caller treats "no external
 * data" as a normal case, same contract the old Open Library integration had.
 */
export async function hardcoverQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(HARDCOVER_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
