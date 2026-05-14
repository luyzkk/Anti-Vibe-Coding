// 2026-05-14 (Luiz/dev): detecta modo de init — greenfield / migration / already-initiated / v5-legacy.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectV5Legacy } from './detect-v5-legacy'

export type InitMode =
  | 'greenfield'        // repo sem docs institucionais e sem anti-vibe
  | 'migration'         // repo com docs humanos existentes, sem anti-vibe (3rd state)
  | 'already-initiated' // .claude/.anti-vibe-manifest.json presente (modo update)
  | 'v5-legacy'         // .planning/ com conteudo ou artifacts v5

export type InitModeSignalType =
  | 'manifest-present'   // .anti-vibe-manifest.json detectado
  | 'v5-artifacts'       // .planning/ ou lessons-learned.md etc
  | 'populated-docs'     // docs/ tem N arquivos .md não-harness
  | 'root-md-files'      // arquivos .md na raiz (README, CONTRIBUTING, etc)

export type InitModeSignal = {
  type: InitModeSignalType
  description: string
  count?: number
  paths?: string[]
}

export type InitModeResult = {
  mode: InitMode
  signals: InitModeSignal[]
}

const HARNESS_MARKER_PATHS = new Set([
  'docs/exec-plans/active/README.md',
  'docs/exec-plans/completed/README.md',
  'docs/compound/README.md',
  'docs/review-checklists/README.md',
  'docs/smoke-flows/README.md',
  'docs/references/README.md',
])

const MIN_POPULATED_DOCS = 5

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function collectNonHarnessDocsMd(targetDir: string): Promise<string[]> {
  const docsDir = path.join(targetDir, 'docs')
  if (!(await exists(docsDir))) return []

  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    let entries: string[]
    try {
      entries = await fs.readdir(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry)
      const rel = path.relative(targetDir, full).replace(/\\/g, '/')
      try {
        const stat = await fs.stat(full)
        if (stat.isDirectory()) {
          await walk(full)
        } else if (entry.endsWith('.md') && !HARNESS_MARKER_PATHS.has(rel)) {
          results.push(rel)
        }
      } catch {
        // skip inacessível
      }
    }
  }

  await walk(docsDir)
  return results
}

export async function detectInitMode(targetDir: string): Promise<InitModeResult> {
  const signals: InitModeSignal[] = []

  // 1. Checar manifest (modo update — já iniciado)
  const manifestPath = path.join(targetDir, '.claude', '.anti-vibe-manifest.json')
  if (await exists(manifestPath)) {
    signals.push({
      type: 'manifest-present',
      description: '.claude/.anti-vibe-manifest.json found — project already initiated',
    })
    return { mode: 'already-initiated', signals }
  }

  // 2. Checar v5 legacy
  const legacyState = await detectV5Legacy(targetDir)
  if (legacyState.isLegacy) {
    signals.push({
      type: 'v5-artifacts',
      description: `v5.x artifacts found: ${legacyState.artifacts.join(', ')}`,
      count: legacyState.artifacts.length,
      paths: Object.values(legacyState.paths).filter(Boolean) as string[],
    })
    return { mode: 'v5-legacy', signals }
  }

  // 3. Checar docs populados (3rd state: migration)
  const nonHarnessDocs = await collectNonHarnessDocsMd(targetDir)
  if (nonHarnessDocs.length >= MIN_POPULATED_DOCS) {
    signals.push({
      type: 'populated-docs',
      description: `${nonHarnessDocs.length} non-harness .md files found in docs/`,
      count: nonHarnessDocs.length,
      paths: nonHarnessDocs.slice(0, 5),
    })
    return { mode: 'migration', signals }
  }

  // 4. Greenfield
  return { mode: 'greenfield', signals }
}
