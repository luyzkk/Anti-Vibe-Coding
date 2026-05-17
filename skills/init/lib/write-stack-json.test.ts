// 2026-05-16 (Luiz/dev): RED phase — Plano 02 fase-02. Schema final multi-stack.
// Casos legados do Plano 01 migrados para nova assinatura (MultiStackResult).
// Novos casos: secondary, anchor_files, ISO 8601, atomicidade, readStackJson round-trip.
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { writeStackJson, readStackJson } from './write-stack-json'

const FIXED_NOW = new Date('2026-05-16T12:34:56.789Z')

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(tmpdir(), 'stack-json-'))
}

describe('writeStackJson — schema final', () => {
  it('writes primary, empty secondary, single anchor for monostack Node+TS (CA-02)', async () => {
    const dir = await tmpDir()
    const result = await writeStackJson(
      dir,
      { primary: 'nodejs-typescript', secondary: [], anchor_files: ['package.json'] },
      FIXED_NOW,
    )
    expect(result.written.primary).toBe('nodejs-typescript')
    expect(result.written.secondary).toEqual([])
    expect(result.written.anchor_files).toEqual(['package.json'])
    expect(result.written.detected_at).toBe('2026-05-16T12:34:56.789Z')
  })

  it('writes primary=null + empty arrays when no stack detected (CA-06)', async () => {
    const dir = await tmpDir()
    const { written } = await writeStackJson(
      dir,
      { primary: null, secondary: [], anchor_files: [] },
      FIXED_NOW,
    )
    expect(written.primary).toBeNull()
    expect(written.secondary).toEqual([])
    expect(written.anchor_files).toEqual([])
  })

  it('writes multi-stack with primary=rails, secondary=[nodejs-typescript] (CA-07)', async () => {
    const dir = await tmpDir()
    const { path: jsonPath } = await writeStackJson(
      dir,
      {
        primary: 'rails',
        secondary: ['nodejs-typescript'],
        anchor_files: ['Gemfile', 'package.json'],
      },
      FIXED_NOW,
    )
    const body = await fs.readFile(jsonPath, 'utf8')
    const parsed = JSON.parse(body)
    expect(parsed.primary).toBe('rails')
    expect(parsed.secondary).toEqual(['nodejs-typescript'])
    expect(parsed.anchor_files).toEqual(['Gemfile', 'package.json'])
  })

  it('emits ISO 8601 UTC with Z suffix for detected_at', async () => {
    const dir = await tmpDir()
    const { written } = await writeStackJson(dir, {
      primary: 'nodejs-typescript',
      secondary: [],
      anchor_files: ['package.json'],
    })
    // 2026-05-16 (Luiz/dev): regex valida formato ISO 8601 UTC (Z final, ms opcional)
    expect(written.detected_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
  })

  it('creates .claude/ directory if missing and writes atomically (no .tmp leftover)', async () => {
    const dir = await tmpDir()
    await writeStackJson(
      dir,
      { primary: 'nodejs-typescript', secondary: [], anchor_files: ['package.json'] },
      FIXED_NOW,
    )
    const claudeEntries = await fs.readdir(path.join(dir, '.claude'))
    expect(claudeEntries).toContain('stack.json')
    expect(claudeEntries).not.toContain('stack.json.tmp')
  })

  it('readStackJson returns null when file absent', async () => {
    const dir = await tmpDir()
    const result = await readStackJson(dir)
    expect(result).toBeNull()
  })

  it('readStackJson round-trips a written stack.json', async () => {
    const dir = await tmpDir()
    await writeStackJson(
      dir,
      { primary: 'rails', secondary: ['nodejs-typescript'], anchor_files: ['Gemfile', 'package.json'] },
      FIXED_NOW,
    )
    const read = await readStackJson(dir)
    expect(read?.primary).toBe('rails')
    expect(read?.secondary).toEqual(['nodejs-typescript'])
    expect(read?.detected_at).toBe('2026-05-16T12:34:56.789Z')
  })
})
