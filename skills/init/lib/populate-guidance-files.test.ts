// skills/init/lib/populate-guidance-files.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-03 — valida que cada guidanceFile aponta para .md real.

import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { POPULATE_INSTRUCTIONS_BY_DOC } from './populate-instructions-table'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')

describe('populate-guidance .md files', () => {
  test('every guidanceFile in POPULATE_INSTRUCTIONS_BY_DOC exists on disk', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const abs = path.join(REPO_ROOT, instr.guidanceFile)
      const stat = await fs.stat(abs).catch(() => null)
      expect(stat, `${doc}: guidanceFile not found at ${instr.guidanceFile}`).not.toBeNull()
      expect(stat!.isFile(), `${doc}: guidanceFile is not a file`).toBe(true)
    }
  })

  test('each guidance .md is non-trivial (>= 500 chars)', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const abs = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(abs, 'utf-8')
      expect(content.length, `${doc}: guidance .md is too short (${content.length} chars)`).toBeGreaterThanOrEqual(500)
    }
  })

  test('each guidance .md starts with `# Guidance: {docPath}`', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const abs = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(abs, 'utf-8')
      const expectedHeading = `# Guidance: ${doc}`
      expect(content.startsWith(expectedHeading), `${doc}: first line should be "${expectedHeading}"`).toBe(true)
    }
  })
})
