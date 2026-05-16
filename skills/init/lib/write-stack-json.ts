// 2026-05-16 (Luiz/dev): writer monostack — Plano 01 fase-03. PRD §Mecanismo "stack.json schema".
// G1 do plano: alias map node-ts → nodejs-typescript para resolver naming do PRD vs StackId.
// G6 do plano: stack.json.primary armazena matrix folder (canônico); StateMD continua com StackId.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectedStack, StackId } from './detect-stack'

// G1 — alias map. Apenas node-ts mapeia em v6.3.2 (monostack).
// Plano 02 estende para rails/python/laravel/nextjs (ver Plano 01 MEMORY.md DI-1).
const STACK_ID_TO_MATRIX_FOLDER: Partial<Record<StackId, string>> = {
  'node-ts': 'nodejs-typescript',
}

// Mapa de signalSource → anchor file. Mínimo viável para Node+TS.
function anchorFilesFromSignal(signalSource: string): string[] {
  if (signalSource.startsWith('package.json')) return ['package.json']
  return []
}

export type StackJson = {
  primary: string | null
  secondary: string[]
  detected_at: string
  anchor_files: string[]
}

export async function writeStackJson(targetDir: string, stack: DetectedStack): Promise<StackJson> {
  const primary = STACK_ID_TO_MATRIX_FOLDER[stack.id] ?? null
  const payload: StackJson = {
    primary,
    secondary: [],
    detected_at: new Date().toISOString(),
    anchor_files: anchorFilesFromSignal(stack.signalSource),
  }
  mkdirSync(join(targetDir, '.claude'), { recursive: true })
  writeFileSync(join(targetDir, '.claude', 'stack.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8')
  return payload
}
