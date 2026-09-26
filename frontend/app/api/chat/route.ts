import { callGemini, errorResponse, readKey } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

const SYSTEM_PROMPT = `You are an AI assistant for students. Your goal is to help students organize their academic life and succeed in their studies.
Be concise, helpful, and encouraging. Focus on providing actionable advice and clear organization.`

const MAX_PROMPT_CHARS = 8000

// Streams newline-delimited JSON ({"chunk": "..."} lines, then {"status": "complete"}),
// the same wire format the original Flask backend used.
export async function POST(req: Request) {
  try {
    const key = readKey(req)
    const body = await req.json().catch(() => null)
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
    if (!prompt) return Response.json({ error: "No prompt provided" }, { status: 400 })
    if (prompt.length > MAX_PROMPT_CHARS) {
      return Response.json({ error: "That message is too long." }, { status: 413 })
    }

    const upstream = await callGemini(key, "streamGenerateContent", {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    })

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = upstream.body!.getReader()

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ""
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""
            for (const line of lines) {
              if (!line.startsWith("data:")) continue
              try {
                const event = JSON.parse(line.slice(5))
                const text = (event?.candidates?.[0]?.content?.parts ?? [])
                  .map((p: { text?: string }) => p.text ?? "")
                  .join("")
                if (text) controller.enqueue(encoder.encode(JSON.stringify({ chunk: text }) + "\n"))
              } catch {
                // skip partial or non-JSON events
              }
            }
          }
          controller.enqueue(encoder.encode(JSON.stringify({ status: "complete" }) + "\n"))
        } catch {
          controller.enqueue(encoder.encode(JSON.stringify({ error: "The response was interrupted." }) + "\n"))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
