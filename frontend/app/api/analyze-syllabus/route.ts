import { callGemini, errorResponse, GeminiError, readKey } from "@/lib/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

// Vercel caps request bodies at 4.5 MB, so keep uploads under that.
const MAX_PDF_BYTES = 4 * 1024 * 1024

const PROMPT = `For context: Class hours is the start_time and end_time of classes. Analyze the syllabus PDF and return structured data in this exact JSON format:
{
  "course_name": string,
  "instructor_name": string,
  "start_time": "HH:MM XM",
  "end_time": "HH:MM XM",
  "schedule": [{
    "date": "YYYY-MM-DD",
    "type": "class|assignment|quiz|exam|project|other",
    "title": string,
    "description": string
  }],
  "marks_distribution": {
    "assignment": percentage,
    "quiz": percentage,
    "exam": percentage,
    "project": percentage
  }
}
Use numbers (not strings) for percentages. If the syllabus lists a date without a year, infer the year from the term.
Your response must be valid JSON only, with no additional text, markdown formatting, or code blocks.`

const TYPES = new Set(["class", "assignment", "quiz", "exam", "project", "other"])

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value)
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(str(value).replace("%", ""))
  return Number.isFinite(n) ? n : 0
}

// Gemini returns free-form JSON; coerce it to the shape the dashboard expects.
function normalize(raw: unknown) {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const marks: Record<string, number> = {}
  const rawMarks = data.marks_distribution
  if (rawMarks && typeof rawMarks === "object") {
    for (const [k, v] of Object.entries(rawMarks as Record<string, unknown>)) {
      marks[k.toLowerCase()] = num(v)
    }
  }
  const schedule = Array.isArray(data.schedule) ? data.schedule : []
  return {
    course_name: str(data.course_name),
    instructor_name: str(data.instructor_name),
    start_time: str(data.start_time),
    end_time: str(data.end_time),
    marks_distribution: marks,
    schedule: schedule
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => {
        const type = str(item.type).toLowerCase()
        return {
          date: str(item.date),
          type: TYPES.has(type) ? type : "other",
          title: str(item.title),
          description: str(item.description),
        }
      })
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

function parseJson(text: string): unknown {
  let t = text.trim()
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/, "").replace(/```$/, "").trim()
  return JSON.parse(t)
}

export async function POST(req: Request) {
  try {
    const key = readKey(req)

    const form = await req.formData().catch(() => null)
    const file = form?.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Choose a syllabus PDF to upload." }, { status: 400 })
    }
    if (file.size > MAX_PDF_BYTES) {
      return Response.json({ error: "That PDF is over 4 MB. Try a smaller file." }, { status: 413 })
    }
    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return Response.json({ error: "That file is not a PDF." }, { status: 400 })
    }

    const res = await callGemini(key, "generateContent", {
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: "application/pdf", data: bytes.toString("base64") } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    })

    const body = await res.json()
    const text: string = (body?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
    if (!text) throw new GeminiError("Gemini returned an empty answer. Try again.", 502)

    let parsed: unknown
    try {
      parsed = parseJson(text)
    } catch {
      throw new GeminiError("Gemini's answer was not valid JSON. Try again.", 502)
    }
    return Response.json(normalize(parsed))
  } catch (err) {
    return errorResponse(err)
  }
}
