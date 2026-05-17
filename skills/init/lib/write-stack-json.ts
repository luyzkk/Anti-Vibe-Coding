// 2026-05-16 (Luiz/dev): writer multi-stack — Plano 02 fase-02. Schema final do PRD §Mecanismo (linha 96-101).
// G2 / DI-2: primary e secondary são nomes de pasta do matrix (não StackId interno).
// G5: anchor_files é lista crua de paths relativos — sem stack name.
// G10: primary: null não é erro (CA-06).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MultiStackResult, MatrixFolder } from './detect-multi-stack'

// 2026-05-16 (Luiz/dev): schema final de .claude/stack.json — alinhado com PRD §Mecanismo (linha 96-101).
export interface StackJson {
  primary: MatrixFolder | null
  secondary: MatrixFolder[]
  anchor_files: string[]
  /** ISO 8601 UTC com sufixo `Z`. Ex: `2026-05-16T12:34:56.789Z`. */
  detected_at: string
}

const STACK_JSON_REL_PATH = path.join('.claude', 'stack.json')

// 2026-05-16 (Luiz/dev): atomic write — escreve em .tmp e renomeia. Evita arquivo parcialmente populado em caso de SIGINT.
export async function writeStackJson(
  targetDir: string,
  result: MultiStackResult,
  now: Date = new Date(),
): Promise<{ path: string; written: StackJson }> {
  const dest = path.join(targetDir, STACK_JSON_REL_PATH)
  const tmp = `${dest}.tmp`
  await fs.mkdir(path.dirname(dest), { recursive: true })

  const payload: StackJson = {
    primary: result.primary,
    secondary: result.secondary,
    anchor_files: result.anchor_files,
    detected_at: now.toISOString(), // 2026-05-16 (Luiz/dev): ISO 8601 UTC — Date.toISOString() always returns Z suffix
  }

  const body = JSON.stringify(payload, null, 2) + '\n'
  await fs.writeFile(tmp, body, 'utf8')
  await fs.rename(tmp, dest)
  return { path: dest, written: payload }
}

/**
 * Lê e parseia .claude/stack.json se existir. Retorna `null` se ausente ou inválido.
 * Usado por fase-04 (telemetria) e Plano 06 (preview de keywords).
 */
export async function readStackJson(targetDir: string): Promise<StackJson | null> {
  try {
    const body = await fs.readFile(path.join(targetDir, STACK_JSON_REL_PATH), 'utf8')
    const parsed: unknown = JSON.parse(body)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Record<string, unknown>
    if (typeof candidate.detected_at !== 'string') return null
    if (!Array.isArray(candidate.secondary) || !Array.isArray(candidate.anchor_files)) return null
    if (candidate.primary !== null && typeof candidate.primary !== 'string') return null
    return parsed as StackJson
  } catch {
    return null
  }
}
