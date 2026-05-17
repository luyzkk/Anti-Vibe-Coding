// 2026-05-17 (Luiz/dev): Wave 3 hardening — single source of truth for MatrixFolder literals.
// Extracted from detect-multi-stack.ts so write-stack-json.ts can share the type guard.
// Wave 4 D4: STACK_ID_TO_MATRIX_FOLDER consolidated here (moved from detect-multi-stack.ts).

import type { MatrixFolder } from './detect-multi-stack'
import type { StackId } from './detect-stack'

/**
 * All known MatrixFolder values, as a Set for O(1) membership checks.
 * Must stay in sync with the MatrixFolder union type in detect-multi-stack.ts.
 */
const MATRIX_FOLDERS: ReadonlySet<string> = new Set<MatrixFolder>([
  'nodejs-typescript',
  'rails',
  'laravel',
  'python',
])

/**
 * Type guard: checks whether `s` is a valid MatrixFolder literal.
 * Used in detect-multi-stack.ts (CS1) and write-stack-json.ts (S5).
 */
export function isMatrixFolder(s: unknown): s is MatrixFolder {
  return typeof s === 'string' && MATRIX_FOLDERS.has(s)
}

/**
 * Maps each StackId to its matrix folder name, or null for stacks without a matrix (e.g. 'unknown').
 * Single source of truth — previously lived in detect-multi-stack.ts (Wave 4 D4 consolidation).
 */
export const STACK_ID_TO_MATRIX_FOLDER: Record<StackId, string | null> = {
  'node-ts': 'nodejs-typescript',
  'nextjs': 'nodejs-typescript', // Next.js shares the Node+TS matrix in v6.3.2
  'rails': 'rails',
  'laravel': 'laravel',
  'python': 'python',
  'unknown': null, // sentinel "do not copy" (CA-06)
}
