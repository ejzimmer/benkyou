/**
 * Thin client for a local, OpenAI-chat-compatible LLM endpoint (Ollama,
 * LM Studio, llama.cpp server, etc.) reachable only on the local network.
 */

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string }

function config(): { baseUrl: string; model: string; apiKey?: string } {
  const baseUrl = process.env.LLM_BASE_URL
  const model = process.env.LLM_MODEL
  if (!baseUrl || !model) {
    throw new Error("LLM_BASE_URL and LLM_MODEL must be set (see .env.example)")
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), model, apiKey: process.env.LLM_API_KEY }
}

export async function chat(messages: LlmMessage[]): Promise<string> {
  const { baseUrl, model, apiKey } = config()
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`LLM request failed: ${res.status} ${body}`)
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    throw new Error("LLM response missing message content")
  }
  return content
}

/** Local models don't reliably support a strict JSON-mode flag, so pull the first {...} block out by hand. */
export function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error(`No JSON object found in LLM response: ${text}`)
  }
  return JSON.parse(match[0]) as T
}
