import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const FIXTURES_DIR = path.join(import.meta.dir)

const FIXTURE_NAMES = [
  'greenfield',
  'single-design-file',
  'scattered-adrs',
  'dense-architecture',
  'dogfood-anti-vibe-plugin',
] as const

type FixtureManifest = {
  scenario: string
  expected_mode: 'greenfield' | 'migration' | 'fresh'
  expected_plan_count: number
  doc_files: string[]
  has_dense_doc?: boolean
  notes: string
}

describe('fixtures', () => {
  for (const fixtureName of FIXTURE_NAMES) {
    it(`${fixtureName}: fixture-manifest.json exists and is valid`, async () => {
      const manifestPath = path.join(FIXTURES_DIR, fixtureName, 'fixture-manifest.json')
      const raw = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw) as FixtureManifest

      expect(manifest.scenario).toBe(fixtureName)
      expect(['greenfield', 'migration', 'fresh']).toContain(manifest.expected_mode)
      expect(typeof manifest.expected_plan_count).toBe('number')
      expect(Array.isArray(manifest.doc_files)).toBe(true)
      expect(typeof manifest.notes).toBe('string')
    })

    it(`${fixtureName}: all doc_files listed in fixture-manifest.json exist`, async () => {
      const manifestPath = path.join(FIXTURES_DIR, fixtureName, 'fixture-manifest.json')
      const raw = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw) as FixtureManifest

      for (const docFile of manifest.doc_files) {
        const absPath = path.join(FIXTURES_DIR, fixtureName, docFile)
        const stat = await fs.stat(absPath)
        expect(stat.isFile()).toBe(true)
      }
    })
  }

  it('dense-architecture: architecture-notes.md has ≥1200 lines', async () => {
    const filePath = path.join(FIXTURES_DIR, 'dense-architecture', 'docs', 'architecture-notes.md')
    const content = await fs.readFile(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeGreaterThanOrEqual(1200)
  })

  it('single-design-file: ARCHITECTURE.md has ≥400 lines', async () => {
    const filePath = path.join(FIXTURES_DIR, 'single-design-file', 'docs', 'ARCHITECTURE.md')
    const content = await fs.readFile(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeGreaterThanOrEqual(400)
  })

  it('greenfield: no doc files in fixture directory (besides fixture-manifest.json)', async () => {
    const fixtureDir = path.join(FIXTURES_DIR, 'greenfield')
    const entries = await fs.readdir(fixtureDir)
    const mdFiles = entries.filter((e) => e.endsWith('.md'))
    expect(mdFiles).toHaveLength(0)
  })
})
