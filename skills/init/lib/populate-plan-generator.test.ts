// skills/init/lib/populate-plan-generator.test.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — teste integrado da hierarquia.
// RED: falha contra output antigo (16 pastas soltas, sem folderPath, sem fase-NN-*.md).
// GREEN: passa apos reescrita de generatePopulatePlans para emitir hierarquia.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import { generatePopulatePlans } from './populate-plan-generator'
import type { DetectedStack } from './detect-stack'

const FIXED_CLOCK = () => new Date('2026-05-21T12:00:00Z')

const NODE_STACK: DetectedStack = {
  primary: 'node-ts',
  secondary: [],
  signalSource: 'package.json',
  anchorFiles: ['package.json'],
}
const RAILS_STACK: DetectedStack = {
  primary: 'rails',
  secondary: [],
  signalSource: 'Gemfile',
  anchorFiles: ['Gemfile'],
}
const NEXTJS_STACK: DetectedStack = {
  primary: 'nextjs',
  secondary: [],
  signalSource: 'package.json',
  anchorFiles: ['package.json'],
}

describe('generatePopulatePlans — hierarchy output (ADR-0022)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'populate-harness-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('creates ONE folder named {date}-populate-harness (not 16)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: FIXED_CLOCK,
    })

    expect(result.folderPath).toBe('docs/exec-plans/active/2026-05-21-populate-harness')
    const folderStat = await fs.stat(path.join(tmpDir, result.folderPath))
    expect(folderStat.isDirectory()).toBe(true)
  })

  test('folder contains PRD.md, CONTEXT.md, PLAN.md, and 16 fase-NN-*.md', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: FIXED_CLOCK,
    })

    const folderAbs = path.join(tmpDir, result.folderPath)
    const entries = await fs.readdir(folderAbs)

    expect(entries).toContain('PRD.md')
    expect(entries).toContain('CONTEXT.md')
    expect(entries).toContain('PLAN.md')

    const faseFiles = entries.filter(e => /^fase-\d{2}-.+\.md$/.test(e))
    expect(faseFiles.length).toBe(16)
  })

  test('each fase-NN-*.md uses FasePlanInput v1 (renders Final Report Contract)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: RAILS_STACK,
      clock: FIXED_CLOCK,
    })

    for (const fp of result.fasePlans) {
      const content = await fs.readFile(path.join(tmpDir, fp.relPath), 'utf-8')
      expect(content).toContain('## Final Report Contract')
      expect(content).toContain('## Goal')
      expect(content).toContain('## Execution Steps')
      expect(content).toContain('**Guidance file:**')
    }
  })

  test('regenerates idempotently (D10 NFR — sobrescreve)', async () => {
    await generatePopulatePlans({ cwd: tmpDir, stack: NEXTJS_STACK, clock: FIXED_CLOCK })
    const second = await generatePopulatePlans({ cwd: tmpDir, stack: NEXTJS_STACK, clock: FIXED_CLOCK })

    expect(second.fasePlans.length).toBe(16)
    // arquivos foram sobrescritos sem erro
  })

  test('completes in under 2s (NFR Performance)', async () => {
    const t0 = Date.now()
    await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: FIXED_CLOCK,
    })
    const dt = Date.now() - t0
    expect(dt).toBeLessThan(2000)
  })
})
