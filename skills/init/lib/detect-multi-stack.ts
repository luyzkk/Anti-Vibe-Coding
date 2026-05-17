// 2026-05-16 (Luiz/dev): nova função multi-stack — alinhada com PRD §Mecanismo (RF3) e CA-07.
// G3: NÃO modifica detect-stack.ts (state-md-init.ts continua chamando detectStack singular).
// G2 / DI-2: primary e secondary armazenam nomes de pasta do matrix (nodejs-typescript, rails, ...).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { StackId } from './detect-stack'
import { isMatrixFolder, STACK_ID_TO_MATRIX_FOLDER } from './stack-id-map'

// Wave 4 D4: STACK_ID_TO_MATRIX_FOLDER moved to stack-id-map.ts (single source of truth).

export type MatrixFolder = 'nodejs-typescript' | 'rails' | 'laravel' | 'python'

export interface MultiStackResult {
  /** Nome de pasta do matrix (`nodejs-typescript`, `rails`, ...) ou `null` se nenhum anchor (CA-06). */
  primary: MatrixFolder | null
  /** Demais pastas do matrix detectadas (dedupe). */
  secondary: MatrixFolder[]
  /** Paths relativos dos anchor files efetivamente detectados (G5: lista, não mapa). */
  anchor_files: string[]
}

// 2026-05-16 (Luiz/dev): tiebreaker por file count — alinhado com PRD §Mecanismo "Primary = stack com mais arquivos source".
// G4: walk é BOUNDED em profundidade e exclui node_modules/vendor/dist/.git para não estourar NFR <500ms.

const MAX_DEPTH = 4
const EXCLUDED_DIRS = new Set(['node_modules', 'vendor', 'dist', '.git', '.next', 'build', 'target', '.venv', '__pycache__'])

const SOURCE_EXT_BY_MATRIX: Record<MatrixFolder, ReadonlyArray<string>> = {
  'nodejs-typescript': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  'rails': ['.rb', '.erb'],
  'python': ['.py'],
  'laravel': ['.php'],
}

async function countSourceFiles(dir: string, extensions: ReadonlyArray<string>, depth = 0): Promise<number> {
  if (depth > MAX_DEPTH) return 0
  let total = 0
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      total += await countSourceFiles(path.join(dir, entry.name), extensions, depth + 1)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (extensions.includes(ext)) total += 1
    }
  }
  return total
}

// 2026-05-16 (Luiz/dev): roda todos os probes (não first-match), agrega, aplica tiebreaker — CA-07.
// Estratégia: probar anchor files diretamente aqui (lista curta) sem mexer em detect-stack.ts (G3).
const ANCHOR_CHECKS: ReadonlyArray<[string, StackId]> = [
  ['package.json', 'node-ts'],
  ['Gemfile', 'rails'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['go.mod', 'unknown'], // 2026-05-16 (Luiz/dev): go.mod listado no PRD §Mecanismo; v6.3.2 não tem matrix Go — vira anchor sem matrix folder
  ['composer.json', 'laravel'],
]

export async function detectMultiStack(targetDir: string): Promise<MultiStackResult> {
  const candidates: Array<{ id: StackId; anchor: string }> = []

  for (const [file, candidateId] of ANCHOR_CHECKS) {
    try {
      await fs.access(path.join(targetDir, file))
      candidates.push({ id: candidateId, anchor: file })
    } catch {
      // arquivo ausente, segue
    }
  }

  if (candidates.length === 0) {
    return { primary: null, secondary: [], anchor_files: [] }
  }

  // Resolver matrix folders, dedupar
  const matrixCandidates = new Map<string, string>() // matrixFolder → anchor
  const anchor_files: string[] = []
  for (const { id, anchor } of candidates) {
    anchor_files.push(anchor)
    const folder = STACK_ID_TO_MATRIX_FOLDER[id]
    if (folder && !matrixCandidates.has(folder)) {
      matrixCandidates.set(folder, anchor)
    }
  }

  if (matrixCandidates.size === 0) {
    // Caso: só anchors sem matrix folder (ex: só go.mod em v6.3.2)
    return { primary: null, secondary: [], anchor_files }
  }

  const folders = Array.from(matrixCandidates.keys()).filter(isMatrixFolder)

  // Single match: primary direto, secondary vazio
  if (folders.length === 1) {
    return { primary: folders[0], secondary: [], anchor_files }
  }

  // Multi-match: tiebreaker por file count
  const counts = await Promise.all(
    folders.map(async (folder) => ({
      folder,
      count: await countSourceFiles(targetDir, SOURCE_EXT_BY_MATRIX[folder] ?? []),
    })),
  )
  counts.sort((a, b) => b.count - a.count) // desc

  // counts.length === folders.length >= 2 here — guard makes invariant explicit
  if (counts.length < 2) throw new Error(`Expected ≥2 entries in counts, got ${counts.length}`)
  const [primaryEntry, ...rest] = counts
  return {
    primary: primaryEntry.folder,
    secondary: rest.map((r) => r.folder),
    anchor_files,
  }
}
