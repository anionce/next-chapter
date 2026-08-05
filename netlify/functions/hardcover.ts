import { forwardToHardcover } from "../../src/lib/hardcoverProxy"

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

  const { status, bodyText } = await forwardToHardcover(apiKey, event.body ?? "")
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: bodyText }
}
