// Server-side helper for the Gemini API. The visitor's key arrives on each
// request in the x-gemini-key header and is used for that one upstream call.
// It is never stored, cached or logged here.

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
// Tried in order: the rolling Flash alias first, then a pinned Flash model.
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash"]

export class GeminiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export function readKey(req: Request): string {
  const key = req.headers.get("x-gemini-key")?.trim() ?? ""
  if (!key) throw new GeminiError("Add your Gemini API key first.", 401)
  if (key.length > 200 || /\s/.test(key)) throw new GeminiError("That does not look like a Gemini API key.", 400)
  return key
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } }

interface GeminiRequest {
  contents: { role: "user" | "model"; parts: Part[] }[]
  systemInstruction?: { parts: { text: string }[] }
  generationConfig?: Record<string, unknown>
}

async function toGeminiError(res: Response): Promise<GeminiError> {
  let message = ""
  let reason = ""
  try {
    const body = await res.json()
    message = body?.error?.message ?? ""
    reason = JSON.stringify(body?.error?.details ?? "")
  } catch {
    // non-JSON error body
  }
  if (reason.includes("API_KEY_INVALID") || res.status === 401 || res.status === 403) {
    return new GeminiError("Gemini rejected that API key. Check it and try again.", 401)
  }
  if (res.status === 429) {
    return new GeminiError("Your Gemini key hit its rate limit or quota. Wait a minute and try again.", 429)
  }
  return new GeminiError(message || `Gemini request failed (${res.status}).`, res.status >= 500 ? 502 : 400)
}

/** POST to Gemini, falling back to the next model if one is not available. */
export async function callGemini(
  key: string,
  method: "generateContent" | "streamGenerateContent",
  body: GeminiRequest,
): Promise<Response> {
  let lastError: GeminiError | null = null
  for (const model of MODELS) {
    const url = `${GEMINI_BASE}/${model}:${method}${method === "streamGenerateContent" ? "?alt=sse" : ""}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (res.ok) return res
    if (res.status === 404) {
      lastError = await toGeminiError(res)
      continue
    }
    throw await toGeminiError(res)
  }
  throw lastError ?? new GeminiError("No Gemini model was available.", 502)
}

export function errorResponse(err: unknown): Response {
  if (err instanceof GeminiError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  return Response.json({ error: "Something went wrong talking to Gemini." }, { status: 500 })
}
