// 2026-05-11 (Luiz/dev): inject markdown block after a marker. Plano 02 fase-05.
// Generico — Plano 05 fase-06 reusa para Compound Decision Gate.

import { promises as fs } from 'node:fs'

export type InjectOptions = {
  filePath: string
  marker: string
  body: string
}

export type InjectResult =
  | { status: 'injected' }
  | { status: 'already-present' }
  | { status: 'marker-missing' }

/**
 * Injects `body` into the file at `filePath` immediately after `marker`.
 *
 * Idempotent: if the first non-empty line of `body` is already present in the
 * file, returns `already-present` without writing. The marker is preserved in
 * both cases so the section can be re-injected later if needed.
 *
 * Returns `marker-missing` when the marker is not found (e.g. the file was
 * hand-edited or generated from a different template version).
 */
export async function injectOptionalSection(opts: InjectOptions): Promise<InjectResult> {
  const original = await fs.readFile(opts.filePath, 'utf8')

  if (!original.includes(opts.marker)) {
    return { status: 'marker-missing' }
  }

  // Idempotence: detect by first non-empty line of body (sufficient — section
  // heading like "## Delivery Loop" is unique in the file).
  const firstLine = opts.body.split('\n').find(l => l.trim().length > 0)
  if (firstLine !== undefined && original.includes(firstLine)) {
    return { status: 'already-present' }
  }

  // Replace marker with marker + body, preserving marker for future re-injection.
  const updated = original.replace(opts.marker, `${opts.marker}\n\n${opts.body}`)
  await fs.writeFile(opts.filePath, updated, 'utf8')

  return { status: 'injected' }
}
