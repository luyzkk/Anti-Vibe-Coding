import type { TelemetryEntry } from "../../skills/lib/telemetry-types"
import { parseTelemetryEntry } from "../../skills/lib/telemetry-schema"

export type ParseResult = {
  entries: TelemetryEntry[]
  malformedCount: number
  malformedLines: number[] // 1-indexed
}

/** Parses raw JSONL content, skipping invalid lines silently. Never throws. */
export function parseJsonlContent(raw: string): ParseResult {
  const lines = raw.split("\n")
  const entries: TelemetryEntry[] = []
  const malformedLines: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim()
    if (line === "") continue
    try {
      const obj = JSON.parse(line) as unknown
      const entry = parseTelemetryEntry(obj)
      entries.push(entry)
    } catch {
      malformedLines.push(i + 1)
    }
  }

  return { entries, malformedCount: malformedLines.length, malformedLines }
}
