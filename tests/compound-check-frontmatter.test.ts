import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'compound-check-fm')
// 2026-05-24 (Luiz/dev): path atualizado após git mv — Plano 02 fase-01 (D15)
const SCRIPT_SRC = path.join(
  import.meta.dir, '..',
  'skills/compound-engineering/assets/scripts/compound-check.ts.tpl',
)

async function runScript(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/compound-check.ts')], { cwd })
    let stdout = ''; let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

async function setup(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
  await fs.mkdir(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
  await fs.copyFile(SCRIPT_SRC, path.join(FIXTURE, 'scripts', 'compound-check.ts'))
}

const VALID_NOTE = `---
title: X
category: bug
tags: [postgres]
created: 2026-05-12
---

# X

## Problem
y

## Solution
z

## Prevention
w
`

describe('compound-check (fase-02 with frontmatter + sections)', () => {
  beforeEach(setup)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('exits 0 for valid compound note', async () => {
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-x.md'), VALID_NOTE, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('1 compound notes validated')
  })

  it('CA-29: exits 1 when note is missing ## Solution', async () => {
    const body = VALID_NOTE.replace('## Solution\nz\n\n', '')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-x.md'), body, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('missing required H2 section: ## Solution')
    expect(r.stderr).toContain('2026-05-12-x.md')
  })

  it('exits 1 when frontmatter is absent', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'docs/compound/2026-05-12-no-fm.md'),
      '# Just a title\n\n## Problem\nx\n## Solution\ny\n## Prevention\nz\n',
      'utf8',
    )
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('missing frontmatter')
  })

  it('exits 1 when frontmatter is missing tags', async () => {
    const body = `---
title: X
category: bug
created: 2026-05-12
---

# X

## Problem
a
## Solution
b
## Prevention
c
`
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-x.md'), body, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('tags')
  })

  it('reports errors for multiple invalid notes', async () => {
    const bad1 = '# No frontmatter\n## Problem\nx\n## Solution\ny\n## Prevention\nz\n'
    const bad2 = VALID_NOTE.replace('## Prevention\nw\n', '')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-a.md'), bad1, 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-b.md'), bad2, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('2026-05-12-a.md')
    expect(r.stderr).toContain('2026-05-12-b.md')
  })
})
