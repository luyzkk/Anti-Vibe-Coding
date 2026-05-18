import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { applyMergeDestructiveStep } from './10-apply-merge-destructive'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-apply-merge-'))
}

// Create a CLAUDE.md with 300 lines to test line-reduction
async function writeHeavyClaude(dir: string): Promise<void> {
  const lines: string[] = [
    '# CLAUDE.md',
    '',
    '## Code Style',
    '',
    'Write clean code.',
    '',
    '## Tests',
    '',
    'Write tests for all logic.',
    '',
    '## Dependencies',
    '',
    'Use stable dependencies.',
    '',
    '## Comments',
    '',
    'Use descriptive comments.',
    '',
    '## Logging',
    '',
    'Log errors with context.',
    '',
  ]
  // Pad to 300 lines
  while (lines.length < 300) {
    lines.push(`// padding line ${lines.length}`)
  }
  await fs.writeFile(path.join(dir, 'CLAUDE.md'), lines.join('\n'), 'utf8')
}

describe('applyMergeDestructiveStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('writes backup before transforming CLAUDE.md', async () => {
    await writeHeavyClaude(tmp)
    const report = await applyMergeDestructiveStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('init-apply-merge')
    const backupRoot = path.join(tmp, '.anti-vibe', 'backup')
    expect(existsSync(backupRoot)).toBe(true)
  })

  test('produces CLAUDE.md with 40 or fewer lines after transformation', async () => {
    await writeHeavyClaude(tmp)
    await applyMergeDestructiveStep.run({ cwd: tmp, args: [], flags: {} })
    const content = await fs.readFile(path.join(tmp, 'CLAUDE.md'), 'utf8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(40)
  })

  test('generates docs/DESIGN.md with 5 Akita sections resolved (no include markers remain)', async () => {
    await writeHeavyClaude(tmp)
    await applyMergeDestructiveStep.run({ cwd: tmp, args: [], flags: {} })
    const designPath = path.join(tmp, 'docs', 'DESIGN.md')
    expect(existsSync(designPath)).toBe(true)
    const content = await fs.readFile(designPath, 'utf8')
    expect(content).not.toContain('{{include:')
    // Verify the 5 Akita section headers are present
    expect(content).toContain('## 1. Code Style')
    expect(content).toContain('## 2. Comments')
    expect(content).toContain('## 3. Tests')
    expect(content).toContain('## 4. Dependencies')
    expect(content).toContain('## 5. Logging & Observability')
  })

  test('early-skips in --additive-merge without modifying CLAUDE.md', async () => {
    await writeHeavyClaude(tmp)
    const originalContent = await fs.readFile(path.join(tmp, 'CLAUDE.md'), 'utf8')
    const report = await applyMergeDestructiveStep.run({
      cwd: tmp,
      args: ['--additive-merge'],
      flags: { 'additive-merge': true },
    })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('init-apply-merge')
    const afterContent = await fs.readFile(path.join(tmp, 'CLAUDE.md'), 'utf8')
    expect(afterContent).toBe(originalContent)
  })

  test('returns mutated:false when there is no CLAUDE.md (greenfield)', async () => {
    // No CLAUDE.md created — greenfield scenario
    const report = await applyMergeDestructiveStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('init-apply-merge')
  })
})
