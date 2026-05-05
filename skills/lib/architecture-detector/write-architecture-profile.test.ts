import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeArchitectureProfile } from './write-architecture-profile'
import type { DetectionResult } from './types'

let tmp: string

beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'arch-detector-')) })
afterEach(() => { rmSync(tmp, { recursive: true, force: true }) })

const sampleResult: DetectionResult = {
  profile: 'vertical-slice',
  confidence: 92,
  detectedAt: '2026-05-04T10:00:00.000Z',
  signals: {
    folderSignals: [{ pattern: 'features/<nome>', matched: true, weight: 50 }],
    importSignals: [{ filePath: 'src/features/billing/api.ts', pattern: 'imports de shared/', matchedProfile: 'vertical-slice' }],
  },
  alternativeProfiles: [{ profile: 'unknown-mixed', score: 30 }],
}

describe('writeArchitectureProfile', () => {
  test('creates .claude/.anti-vibe-manifest.json with architectureProfile field', () => {
    writeArchitectureProfile(sampleResult, tmp)
    const manifest = JSON.parse(readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.architectureProfile.profile).toBe('vertical-slice')
    expect(manifest.architectureProfile.confidence).toBe(92)
    expect(manifest.architectureProfile.schemaVersion).toBe(1)
  })

  test('creates .claude/architecture-profile.md', () => {
    writeArchitectureProfile(sampleResult, tmp)
    const md = readFileSync(join(tmp, '.claude/architecture-profile.md'), 'utf-8')
    expect(md).toContain('vertical-slice')
    expect(md).toContain('92')
  })

  test('preserves other fields when manifest already exists (merge, not overwrite)', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true })
    writeFileSync(
      join(tmp, '.claude/.anti-vibe-manifest.json'),
      JSON.stringify({ pluginVersion: '5.3.0', architectureDetectorEnabled: true }, null, 2),
    )
    writeArchitectureProfile(sampleResult, tmp)
    const manifest = JSON.parse(readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.pluginVersion).toBe('5.3.0')
    expect(manifest.architectureDetectorEnabled).toBe(true)
    expect(manifest.architectureProfile).toBeDefined()
  })

  test('is idempotent — running twice with same result produces identical output (modulo detectedAt) (G4)', () => {
    writeArchitectureProfile(sampleResult, tmp)
    const first = readFileSync(join(tmp, '.claude/architecture-profile.md'), 'utf-8')
    writeArchitectureProfile(sampleResult, tmp)
    const second = readFileSync(join(tmp, '.claude/architecture-profile.md'), 'utf-8')
    expect(first).toBe(second)
  })

  test('creates .claude/ if missing', () => {
    writeArchitectureProfile(sampleResult, tmp)
    expect(() => readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'))).not.toThrow()
  })

  test('survives malformed pre-existing manifest (CA-10 from Plano 01)', () => {
    mkdirSync(join(tmp, '.claude'), { recursive: true })
    writeFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), '{ invalid json')
    expect(() => writeArchitectureProfile(sampleResult, tmp)).not.toThrow()
    const manifest = JSON.parse(readFileSync(join(tmp, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.architectureProfile.profile).toBe('vertical-slice')
  })
})
