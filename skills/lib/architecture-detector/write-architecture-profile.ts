import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectionResult } from './types'
import type { ArchitectureProfile } from '../manifest-types'
import { renderArchitectureProfileMarkdown } from '../profile-md-generator'

const SCHEMA_VERSION = 1

/**
 * Persists a DetectionResult to two outputs:
 *   1. `.claude/.anti-vibe-manifest.json` — updates `architectureProfile` field (merge, preserves other fields)
 *   2. `.claude/architecture-profile.md`   — human-readable markdown
 *
 * Idempotent: calling twice with the same DetectionResult produces identical files
 * (detectedAt comes from the result, not generated internally — G4).
 *
 * DEV-01: Does not use atomic write (tmp + rename). If the process crashes mid-write,
 * the manifest could be truncated. Acceptable for Onda 1; revisit if write frequency
 * increases or if manifest grows large.
 */
export function writeArchitectureProfile(result: DetectionResult, cwd: string): void {
  const claudeDir = join(cwd, '.claude')
  const manifestPath = join(claudeDir, '.anti-vibe-manifest.json')
  const mdPath = join(claudeDir, 'architecture-profile.md')

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true })
  }

  // 1. Update manifest (merge — never clobber other fields)
  const manifest = readLooseManifest(manifestPath)
  manifest['architectureProfile'] = toArchitectureProfile(result)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

  // 2. Generate markdown (delegates to Plano 01 fase-04 helper)
  const archProfile = toArchitectureProfile(result)
  const md = renderArchitectureProfileMarkdown(archProfile)
  writeFileSync(mdPath, md, 'utf-8')
}

/**
 * Reads an existing manifest as a loose Record, ignoring schema validation.
 * Returns {} if the file is absent or malformed (CA-10: pre-v5.3 or corrupt).
 */
function readLooseManifest(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {}
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf-8'))
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      return raw as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

/**
 * Converts a DetectionResult into the ArchitectureProfile shape expected by
 * the manifest schema and the markdown generator.
 *
 * Signal serialization:
 *   - FolderSignal (matched=true)  → "folder:<pattern>"
 *   - ImportSignal (matchedProfile) → "import:<pattern>"
 * Unmatched folder signals and null-match import signals are omitted — they
 * contributed no positive evidence and would clutter the manifest.
 */
function toArchitectureProfile(result: DetectionResult): ArchitectureProfile {
  const signals: string[] = [
    ...result.signals.folderSignals
      .filter(s => s.matched)
      .map(s => `folder:${s.pattern}`),
    ...result.signals.importSignals
      .filter(s => s.matchedProfile !== null)
      .map(s => `import:${s.pattern}`),
  ]

  return {
    profile: result.profile,
    confidence: result.confidence,
    detectedAt: result.detectedAt,
    signals,
    schemaVersion: SCHEMA_VERSION,
  }
}
