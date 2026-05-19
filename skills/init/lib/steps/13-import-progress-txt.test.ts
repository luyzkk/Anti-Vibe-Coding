// skills/init/lib/steps/13-import-progress-txt.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { importProgressTxtStep } from './13-import-progress-txt'

describe('importProgressTxtStep', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'step-13-'))
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('soft-fails when .claude/progress.txt is absent (greenfield)', async () => {
    const report = await importProgressTxtStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skipped')
  })

  it('imports N entries when progress.txt exists', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude', 'progress.txt'),
      `### [Armadilha] Foo\n**Contexto:** x\n\n### Bar\nbody\n`,
      'utf-8',
    )
    const report = await importProgressTxtStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('imported 2 gotchas')
    const files = await fs.readdir(path.join(cwd, 'docs', 'compound', '_imported'))
    expect(files.sort()).toEqual(['0001-foo.md', '0002-bar.md', 'INDEX.md'].sort())
  })

  it('parses 0 entries from non-empty file -> no mutation, summary marks empty parse', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude', 'progress.txt'),
      `# header only\nno headings here\n`,
      'utf-8',
    )
    const report = await importProgressTxtStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 entries')
  })
})
