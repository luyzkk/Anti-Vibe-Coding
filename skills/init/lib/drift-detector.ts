// 2026-05-18 (Luiz/dev): D7 + SH-05 + CA-05 — drift detection incremental em re-runs

import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export type DriftStatus = 'PLACEHOLDER' | 'POPULATED' | 'DRIFT'

export type DriftReport = {
  readonly generatedAt: string
  readonly summary: {
    readonly placeholder: number
    readonly populated: number
    readonly drift: number
  }
  readonly byFile: Readonly<Record<string, DriftStatus>>
}

export const DRIFT_REPORT_FILENAME = 'drift-report'

export type DetectDriftOptions = {
  readonly manifestPath: string
  readonly cwd: string
}

const TEMPLATE_LINE_LIMIT = 10
const SIGNIFICANT_TOKENS = /\b(class|function|interface|export|import|const|let|describe|it)\b/i

async function computeSha256(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function isTemplateContent(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length <= TEMPLATE_LINE_LIMIT && !SIGNIFICANT_TOKENS.test(content)) {
      return true
    }
    return false
  } catch {
    return true
  }
}

type ManifestEntry = { path: string; sha256: string }
type Manifest = { files: ReadonlyArray<ManifestEntry> }

export async function detectDrift(opts: DetectDriftOptions): Promise<DriftReport> {
  let manifest: Manifest
  try {
    const raw = await fs.readFile(opts.manifestPath, 'utf8')
    manifest = JSON.parse(raw) as Manifest
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      summary: { placeholder: 0, populated: 0, drift: 0 },
      byFile: {},
    }
  }

  const byFile: Record<string, DriftStatus> = {}
  let placeholder = 0, populated = 0, drift = 0

  for (const entry of manifest.files) {
    const absPath = path.join(opts.cwd, entry.path)
    let currentSha: string
    try {
      currentSha = await computeSha256(absPath)
    } catch {
      byFile[entry.path] = 'DRIFT'
      drift += 1
      continue
    }

    if (currentSha === entry.sha256) {
      if (await isTemplateContent(absPath)) {
        byFile[entry.path] = 'PLACEHOLDER'
        placeholder += 1
      } else {
        byFile[entry.path] = 'POPULATED'
        populated += 1
      }
    } else {
      if (await isTemplateContent(absPath)) {
        byFile[entry.path] = 'DRIFT'
        drift += 1
      } else {
        byFile[entry.path] = 'POPULATED'
        populated += 1
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: { placeholder, populated, drift },
    byFile,
  }
}
