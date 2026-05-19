// 2026-05-11 (Luiz/dev): customiza ARCHITECTURE.md com stack detectado.
// Plano 02 fase-03. Atende PRD M3, CA-19, CA-20, CA-21.
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — usa stack.primary (Plano 01 fase-03).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DetectedStack, StackId } from './detect-stack'

const STACK_BLOCK_MARKER = '<!-- INIT:STACK_BLOCK -->'

// 2026-05-18 (Luiz/dev): Record keyed por Exclude<StackId, 'unknown'> — 'unknown' nao e um
// stack primario valido em D22 (primary=null representa fallback). Fallback tratado via getPresentation().
const STACK_PRESENTATION: Record<Exclude<StackId, 'unknown'>, { display: string; note: string }> = {
  nextjs:    { display: 'Next.js',                note: 'Next.js framework detected via package.json (D7).' },
  'node-ts': { display: 'Node.js + TypeScript',   note: 'Node.js + TypeScript detected via package.json (D7).' },
  rails:     { display: 'Ruby on Rails',           note: 'Rails framework detected via Gemfile (D7).' },
  laravel:   { display: 'Laravel (deferred)',      note: 'PHP+Laravel detected. Knowledge pack ships in v6.x.' },
  python:    { display: 'Python (deferred)',        note: 'Python detected via pyproject.toml/requirements.txt. Knowledge pack ships in v6.x.' },
}

const UNKNOWN_PRESENTATION = { display: 'unknown', note: 'No supported stack detected — please document the stack manually.' }

function getPresentation(primary: Exclude<StackId, 'unknown'> | null): { display: string; note: string } {
  if (primary === null) return UNKNOWN_PRESENTATION
  return STACK_PRESENTATION[primary]
}

export type CustomizeArchitectureOptions = {
  targetDir: string
  stack: DetectedStack
  generatedAt?: Date // injectable for deterministic tests
  /**
   * 2026-05-18 (Luiz/dev): writer injetavel — Quick Plan /init v6.4.0 fix (dry-run wiring).
   * Default: fs.writeFile real. Em dry-run: makeWriter({dryRun:true,recorder}).
   */
  writeFile?: (path: string, body: string) => Promise<void>
}

export type CustomizeArchitectureResult = {
  written: boolean
  blockBody: string
}

/**
 * Replaces the `<!-- INIT:STACK_BLOCK -->` marker in ARCHITECTURE.md with a
 * "Detected Stack" section based on the detected stack.
 *
 * Idempotent via marker consumption: after first run the marker is gone,
 * so a second call returns `{ written: false }` — preserving manual edits.
 *
 * @example
 * const result = await customizeArchitecture({ targetDir: '/path/to/project', stack })
 * console.log(result.written) // true on first run, false if marker was already consumed
 */
export async function customizeArchitecture(
  opts: CustomizeArchitectureOptions,
): Promise<CustomizeArchitectureResult> {
  const archPath = path.join(opts.targetDir, 'ARCHITECTURE.md')
  const original = await fs.readFile(archPath, 'utf8')

  if (!original.includes(STACK_BLOCK_MARKER)) {
    // Marker absent — template was hand-edited or wrong version. Do not overwrite.
    return { written: false, blockBody: '' }
  }

  // 2026-05-18 (Luiz/dev): usa stack.primary (D22) — null mapeia para unknown presentation
  const presentation = getPresentation(opts.stack.primary)
  const generatedAt = (opts.generatedAt ?? new Date()).toISOString().slice(0, 10)

  const blockBody = [
    '## Detected Stack',
    '',
    `- Stack: **${presentation.display}**`,
    `- Detected on: ${generatedAt}`,
    `- Source signal: ${opts.stack.signalSource}`,
    '',
    presentation.note,
    '',
  ].join('\n')

  const updated = original.replace(STACK_BLOCK_MARKER, blockBody)
  const writer = opts.writeFile ?? ((p: string, b: string) => fs.writeFile(p, b, 'utf8'))
  await writer(archPath, updated)

  return { written: true, blockBody }
}
