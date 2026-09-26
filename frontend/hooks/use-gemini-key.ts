import { useSyncExternalStore } from "react"

// The visitor's Gemini key lives only in this tab's sessionStorage and is sent
// with each request in the x-gemini-key header. The server never stores it.
const KEY = "studysync:geminiKey"
const listeners = new Set<() => void>()

function read(): string {
  try {
    return window.sessionStorage.getItem(KEY) ?? ""
  } catch {
    return memoryKey
  }
}

let memoryKey = ""

export function setGeminiKey(value: string) {
  const trimmed = value.trim()
  memoryKey = trimmed
  try {
    if (trimmed) window.sessionStorage.setItem(KEY, trimmed)
    else window.sessionStorage.removeItem(KEY)
  } catch {
    // sessionStorage blocked: keep it in memory for this page only.
  }
  listeners.forEach((l) => l())
}

export function getGeminiKey(): string {
  return read()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useGeminiKey(): string {
  return useSyncExternalStore(subscribe, read, () => "")
}
