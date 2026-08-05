const HARDCOVER_API_URL = "https://api.hardcover.app/v1/graphql"

/**
 * Core "forward this GraphQL request to Hardcover" logic, shared between
 * netlify/functions/hardcover.ts (production) and vite.config.ts's dev-mode
 * middleware (local `npm run dev`) — the two runtimes have incompatible
 * request/response shapes (Netlify's {statusCode,body} vs. Vite/Connect's
 * raw req/res), so only this inner fetch-and-forward step is shared; each
 * caller still wraps it in its own envelope.
 */
export async function forwardToHardcover(
  apiKey: string,
  bodyText: string
): Promise<{ status: number; bodyText: string }> {
  try {
    const upstream = await fetch(HARDCOVER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: bodyText,
    })
    return { status: upstream.status, bodyText: await upstream.text() }
  } catch {
    return { status: 502, bodyText: JSON.stringify({ error: "Upstream request failed" }) }
  }
}
