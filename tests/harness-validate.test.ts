import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'validator')

async function runValidator(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/harness-validate.ts')], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += String(d) })
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

describe('harness-validate (minimal)', () => {
  beforeEach(async () => {
    await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
    // copiar validator real
    await fs.copyFile(
      path.join(import.meta.dir, '..', 'skills/init/assets/templates/scripts/harness-validate.ts.tpl'),
      path.join(FIXTURE, 'scripts/harness-validate.ts')
    )
  })

  afterEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
  })

  it('exits 1 when AGENTS.md has 50 lines (CA-27)', async () => {
    const lines = Array.from({ length: 50 }, (_, i) => `# Line ${i}`).join('\n')
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), lines, 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'ARCHITECTURE.md'), '# Architecture\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), lines, 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('40 lines or fewer')
  })

  it('exits 0 when AGENTS.md is small and required files exist', async () => {
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), '# Agent\n\nShort content.\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'ARCHITECTURE.md'), '# Architecture\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), '# Agent\n\nShort content.\n', 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Harness validation passed')
  })

  it('exits 1 when ARCHITECTURE.md is missing', async () => {
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), '# Agent\n', 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'CLAUDE.md'), '# Agent\n', 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('Missing required file: ARCHITECTURE.md')
  })
})
