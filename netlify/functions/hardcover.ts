const HARDCOVER_API_URL = "https://api.hardcover.app/v1/graphql"

/**
 * Server-side proxy for Hardcover's GraphQL API. The browser calls this
 * same-origin endpoint instead of Hardcover directly — Hardcover's CORS
 * policy blocks arbitrary browser origins, and this also keeps the API key
 * out of the client bundle entirely (it only ever lives in this function's
 * environment, set in Netlify's dashboard, never prefixed with VITE_).
 */
export async function handler(event: { httpMethod: string; body: string | null }) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  const apiKey = process.env.HARDCOVER_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing HARDCOVER_API_KEY" }) }
  }

  try {
    const upstream = await fetch(HARDCOVER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: event.body ?? "",
    })
    const text = await upstream.text()
    return {
      statusCode: upstream.status,
      headers: { "Content-Type": "application/json" },
      body: text,
    }
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: "Upstream request failed" }) }
  }
}
