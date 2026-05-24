import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'compound-check-skeleton')
// 2026-05-24 (Luiz/dev): path atualizado após git mv — Plano 02 fase-01 (D15)
const SCRIPT_SRC = path.join(
  import.meta.dir,
  '..',
  'skills/compound-engineering/assets/scripts/compound-check.ts.tpl',
)

async function runScript(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/compound-check.ts')], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

async function setupFixture(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
  await fs.mkdir(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
  await fs.copyFile(SCRIPT_SRC, path.join(FIXTURE, 'scripts', 'compound-check.ts'))
}

describe('compound-check (skeleton)', () => {
  beforeEach(setupFixture)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('exits 0 when docs/compound/ is empty', async () => {
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Compound check passed (0 compound notes')
  })

  it('exits 0 when docs/compound/ has only README.md', async () => {
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/README.md'), '# README\n', 'utf8')
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('0 compound notes')
  })

  it('exits 0 and reports count when 2 valid compound notes exist', async () => {
    // Updated in fase-02: notes now require valid frontmatter + required sections.
    const note = (title: string) => `---\ntitle: ${title}\ncategory: bug\ntags: [x]\ncreated: 2026-05-12\n---\n\n# ${title}\n\n## Problem\np\n## Solution\ns\n## Prevention\nv\n`
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-a.md'), note('A'), 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-b.md'), note('B'), 'utf8')
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('2 compound notes')
  })

  it('G9: ignores files in _archived/ when counting', async () => {
    const note = (title: string) => `---\ntitle: ${title}\ncategory: bug\ntags: [x]\ncreated: 2026-05-12\n---\n\n# ${title}\n\n## Problem\np\n## Solution\ns\n## Prevention\nv\n`
    await fs.mkdir(path.join(FIXTURE, 'docs/compound/_archived'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/_archived/old.md'), note('Old'), 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-active.md'), note('Active'), 'utf8')
    const result = await runScript(FIXTURE)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('1 compound notes')
  })
})
