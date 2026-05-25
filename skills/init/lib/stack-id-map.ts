// 2026-05-17 (Luiz/dev): Wave 3 hardening — single source of truth for MatrixFolder literals.
// Extracted from detect-multi-stack.ts so write-stack-json.ts can share the type guard.
// Wave 4 D4: STACK_ID_TO_MATRIX_FOLDER consolidated here (moved from detect-multi-stack.ts).
// H2.2 (2026-05-17): MatrixFolder type now derived from MATRIX_FOLDER_VALUES — adding a value to the
// array automatically expands the type; the Set is built from the same array (no dual source drift).

import type { StackId } from './detect-stack'

/**
 * Single source of truth for all known MatrixFolder values.
 * MatrixFolder type is derived from this array, so adding a value here
 * automatically expands the type — no dual maintenance of union type + Set.
 */
// 2026-05-24 (Luiz/dev): PRD §RF-02 + D6 — 'nextjs' vira matrix folder propria.
// 'react' (StackId novo) mapeia para a MESMA folder ('nextjs') porque atoms cobrem
// React conceitual + Next idioms (D6 matrix compartilhada). Vite puro consome o mesmo INDEX.
export const MATRIX_FOLDER_VALUES = [
  'nodejs-typescript',
  'nextjs',
  'rails',
  'laravel',
  'python',
] as const

export type MatrixFolder = typeof MATRIX_FOLDER_VALUES[number]

// Widened to ReadonlySet<string> so `.has(s: string)` compiles in isMatrixFolder.
// The Set is still populated from typed MATRIX_FOLDER_VALUES — no values can drift in.
const MATRIX_FOLDERS: ReadonlySet<string> = new Set<MatrixFolder>(MATRIX_FOLDER_VALUES)

/**
 * Type guard: checks whether `s` is a valid MatrixFolder literal.
 * Used in detect-multi-stack.ts (CS1) and write-stack-json.ts (S5).
 */
export function isMatrixFolder(s: unknown): s is MatrixFolder {
  return typeof s === 'string' && MATRIX_FOLDERS.has(s)
}

/**
 * Maps each StackId to its matrix folder name, or null for stacks without a matrix.
 * Single source of truth — previously lived in detect-multi-stack.ts (Wave 4 D4 consolidation).
 * 2026-05-18 (Luiz/dev): D22 — 'unknown' preservado em StackId para detect-multi-stack.ts (go.mod).
 * DetectedStack.primary usa Exclude<StackId, 'unknown'> | null — nunca 'unknown' como valor primario.
 */
export const STACK_ID_TO_MATRIX_FOLDER: Record<StackId, string | null> = {
  'node-ts': 'nodejs-typescript',
  // 2026-05-24 (Luiz/dev): PRD §RF-02 — Next.js sai do compartilhamento com Node-TS para folder propria.
  // Plano 01 fase-00 ja ajustou testes que codificavam 'nodejs-typescript' literal para Next (R1).
  'nextjs': 'nextjs',
  // 2026-05-24 (Luiz/dev): PRD §RF-03 + D6 — StackId 'react' (novo, vite-puro) compartilha matrix Next.
  // Justificativa: 15 atoms cobrem React conceitual + Next idioms; cross-stack skills filtram por consulta.
  'react': 'nextjs',
  'rails': 'rails',
  'laravel': 'laravel',
  'python': 'python',
  'unknown': null, // sentinel "do not copy" (CA-06) — go.mod via detect-multi-stack.ts
}
