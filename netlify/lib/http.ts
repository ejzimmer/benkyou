import type { HandlerResponse } from "@netlify/functions"

export function json(statusCode: number, body: unknown): HandlerResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }
}

/** Bearer-token check against the `AGENT_API_TOKEN` env var — see docs/AGENT_API.md. */
export function isAuthorized(headers: Record<string, string | undefined>): boolean {
  const expected = process.env.AGENT_API_TOKEN
  if (!expected) return false
  const header = headers.authorization ?? headers.Authorization
  if (!header) return false
  const [scheme, token] = header.split(" ")
  return scheme === "Bearer" && token === expected
}
