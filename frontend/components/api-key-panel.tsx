"use client"

import { useState } from "react"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setGeminiKey, useGeminiKey } from "@/hooks/use-gemini-key"

const REPO_URL = "https://github.com/zero-abd/StudySync"

export default function ApiKeyPanel() {
  const key = useGeminiKey()
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState(false)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    setGeminiKey(draft)
    setDraft("")
    setEditing(false)
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 text-xs space-y-2">
      <div className="flex items-center gap-1 font-medium">
        <KeyRound size={14} />
        Gemini API key
      </div>

      {key && !editing ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-green-700 dark:text-green-400">Key set for this tab (…{key.slice(-4)})</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
              Change
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setGeminiKey("")}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="flex gap-1">
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste your key"
            aria-label="Gemini API key"
            className="h-8 text-xs bg-white dark:bg-gray-950"
          />
          <Button type="submit" size="sm" className="h-8 px-3 text-xs" disabled={!draft.trim()}>
            Save
          </Button>
        </form>
      )}

      <p className="text-gray-600 dark:text-gray-400 leading-snug">
        Syllabus analysis and chat run on Gemini with your own key.{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Get a free key
        </a>
        .
      </p>
      <p className="text-gray-600 dark:text-gray-400 leading-snug">
        Your key stays in your browser and is sent only with your own requests. Nothing is saved. This
        project is open source, so you can check the code:{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline">
          github.com/zero-abd/StudySync
        </a>
      </p>
    </div>
  )
}
