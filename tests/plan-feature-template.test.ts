// 2026-05-12 (Luiz/dev): E2E TDD — writeExecPlan cria arquivo no path v6 correto com 10 secoes (CA-18)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { writeExecPlan } from '../skills/lib/exec-plan-template'
import { EXEC_PLAN_SECTIONS_FULL } from '../skills/lib/exec-plan-sections'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-plan-feature-'))
  // 2026-05-12 (Luiz/dev): criar estrutura v6 para que resolvePaths detecte layout correto
  await fs.mkdir(path.join(tmpDir, 'docs', 'compound'), { recursive: true })
  await fs.mkdir(path.join(tmpDir, 'docs', 'exec-plans'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('writeExecPlan', () => {
  it('creates file at docs/exec-plans/active/YYYY-MM-DD-{slug}.md', async () => {
    // 2026-05-12 (Luiz/dev): CA-18 — path v6, slug gerado do titulo, data ISO atual
    const { filePath } = await writeExecPlan(tmpDir, {
      mode: 'full',
      title: 'Sample Feature',
    })

    const today = new Date().toISOString().slice(0, 10)
    const expectedPath = path.join(
      tmpDir,
      'docs',
      'exec-plans',
      'active',
      `${today}-sample-feature.md`,
    )
    expect(filePath).toBe(expectedPath)

    const exists = await fs.stat(filePath).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('created file has exactly 10 H2 sections in canonical order', async () => {
    // 2026-05-12 (Luiz/dev): key assertion — grep -c '^## ' retorna 10 (CA-18 acceptance criteria)
    const { filePath } = await writeExecPlan(tmpDir, {
      mode: 'full',
      title: 'My Plan',
      goal: 'Ship the thing',
    })

    const content = await fs.readFile(filePath, 'utf-8')
    const h2Matches = Array.from(content.matchAll(/^## (.+)$/gm)).map((m) => m[1])

    expect(h2Matches).toHaveLength(10)
    expect(h2Matches).toEqual([...EXEC_PLAN_SECTIONS_FULL])
  })

  it('created file has valid frontmatter (title, mode, status:active, created)', async () => {
    // 2026-05-12 (Luiz/dev): 03-G2 — status:active no frontmatter; execute-plan (fase-05) muda para completed
    const { filePath } = await writeExecPlan(tmpDir, {
      mode: 'full',
      title: 'Frontmatter Check',
    })

    const content = await fs.readFile(filePath, 'utf-8')
    expect(content).toMatch(/^---\n/)
    expect(content).toContain('title: "Frontmatter Check"')
    expect(content).toContain('mode: full')
    expect(content).toContain('status: active')
    expect(content).toMatch(/created: \d{4}-\d{2}-\d{2}/)
  })

  it('creates docs/exec-plans/active/ directory if it does not exist', async () => {
    // 2026-05-12 (Luiz/dev): mkdir recursive — active/ pode nao existir no projeto recem-iniciado
    const activeDir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
    const exists = await fs.stat(activeDir).then(() => true).catch(() => false)
    expect(exists).toBe(false) // confirm it does NOT exist pre-call

    await writeExecPlan(tmpDir, { mode: 'full', title: 'Dir Test' })

    const existsAfter = await fs.stat(activeDir).then(() => true).catch(() => false)
    expect(existsAfter).toBe(true)
  })

  it('returns filePath pointing inside docs/exec-plans/active/', async () => {
    const { filePath } = await writeExecPlan(tmpDir, {
      mode: 'full',
      title: 'Path Validation',
    })

    expect(filePath).toContain(path.join('docs', 'exec-plans', 'active'))
  })

  it('slugifies title correctly in filename', async () => {
    const { filePath } = await writeExecPlan(tmpDir, {
      mode: 'full',
      title: 'User Authentication via JWT',
    })

    const basename = path.basename(filePath)
    const today = new Date().toISOString().slice(0, 10)
    expect(basename).toBe(`${today}-user-authentication-via-jwt.md`)
  })
})
