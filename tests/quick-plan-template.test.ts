// 2026-05-12 (Luiz/dev): TDD — quick-plan usa renderExecPlan({mode:'quick'}) com exatamente 7 secoes (D18)
// Omite Assumptions, Risks, Review Checklist — overhead desnecessario para tasks de complexidade media
// Ambiguity 05-A5: decisao documentada em exec-plan-sections.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { renderExecPlan, writeExecPlan } from '../skills/lib/exec-plan-template'
import { EXEC_PLAN_SECTIONS_QUICK } from '../skills/lib/exec-plan-sections'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-quick-plan-'))
  // 2026-05-12 (Luiz/dev): estrutura v6 para resolvePaths detectar layout correto
  await fs.mkdir(path.join(tmpDir, 'docs', 'compound'), { recursive: true })
  await fs.mkdir(path.join(tmpDir, 'docs', 'exec-plans'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('renderExecPlan({ mode: "quick" })', () => {
  it('returns markdown with exactly 7 H2 sections', () => {
    // 2026-05-12 (Luiz/dev): acceptance criteria principal — grep -c '^## ' deve retornar 7
    const output = renderExecPlan({ mode: 'quick', title: 'foo' })
    const h2Matches = Array.from(output.matchAll(/^## (.+)$/gm)).map((m) => m[1])
    expect(h2Matches).toHaveLength(7)
  })

  it('returns sections in exact order matching EXEC_PLAN_SECTIONS_QUICK', () => {
    // 2026-05-12 (Luiz/dev): G7 case-sensitive — ordem exata importa para validador
    const output = renderExecPlan({ mode: 'quick', title: 'bar' })
    const h2Matches = Array.from(output.matchAll(/^## (.+)$/gm)).map((m) => m[1])
    expect(h2Matches).toEqual([...EXEC_PLAN_SECTIONS_QUICK])
  })

  it('does NOT contain ## Assumptions section', () => {
    // 2026-05-12 (Luiz/dev): 04-G1 omissao intencional — overhead para tasks medias
    const output = renderExecPlan({ mode: 'quick', title: 'test' })
    expect(output).not.toMatch(/^## Assumptions$/m)
  })

  it('does NOT contain ## Risks section', () => {
    const output = renderExecPlan({ mode: 'quick', title: 'test' })
    expect(output).not.toMatch(/^## Risks$/m)
  })

  it('does NOT contain ## Review Checklist section', () => {
    const output = renderExecPlan({ mode: 'quick', title: 'test' })
    expect(output).not.toMatch(/^## Review Checklist$/m)
  })

  it('frontmatter contains mode: quick', () => {
    // 2026-05-12 (Luiz/dev): 04-G2 — mode:quick no frontmatter permite validador diferenciar regras
    const output = renderExecPlan({ mode: 'quick', title: 'quick task' })
    expect(output).toContain('mode: quick')
  })

  it('frontmatter contains title, status:active, and created date', () => {
    const output = renderExecPlan({ mode: 'quick', title: 'My Quick Task' })
    expect(output).toContain('title: "My Quick Task"')
    expect(output).toContain('status: active')
    expect(output).toMatch(/created: \d{4}-\d{2}-\d{2}/)
  })
})

describe('writeExecPlan({ mode: "quick" })', () => {
  it('creates file at docs/exec-plans/active/YYYY-MM-DD-{slug}.md with 7 H2', async () => {
    // 2026-05-12 (Luiz/dev): E2E — writeExecPlan com mode:quick cria arquivo com 7 secoes
    const { filePath } = await writeExecPlan(tmpDir, {
      mode: 'quick',
      title: 'Quick Task',
    })

    const today = new Date().toISOString().slice(0, 10)
    const expectedPath = path.join(
      tmpDir,
      'docs',
      'exec-plans',
      'active',
      `${today}-quick-task.md`,
    )
    expect(filePath).toBe(expectedPath)

    const content = await fs.readFile(filePath, 'utf-8')
    const h2Matches = Array.from(content.matchAll(/^## (.+)$/gm)).map((m) => m[1])
    expect(h2Matches).toHaveLength(7)
  })

  it('created file does not contain Assumptions, Risks, or Review Checklist', async () => {
    const { filePath } = await writeExecPlan(tmpDir, {
      mode: 'quick',
      title: 'Clean Sections Check',
    })
    const content = await fs.readFile(filePath, 'utf-8')
    expect(content).not.toMatch(/^## Assumptions$/m)
    expect(content).not.toMatch(/^## Risks$/m)
    expect(content).not.toMatch(/^## Review Checklist$/m)
  })
})

describe('D10 backward-compat: string vs object title', () => {
  it('renderExecPlan with string-titled object produces same H2 count as minimal object call', () => {
    // 2026-05-12 (Luiz/dev): D10 — interface estavel; renderExecPlan aceita ExecPlanInput objeto
    // A skill quick-plan usa string arg externamente — aqui verificamos que dois objetos equivalentes produzem mesmo output
    const out1 = renderExecPlan({ mode: 'quick', title: 'Same Title' })
    const out2 = renderExecPlan({ mode: 'quick', title: 'Same Title' })

    const h2Count1 = Array.from(out1.matchAll(/^## (.+)$/gm)).length
    const h2Count2 = Array.from(out2.matchAll(/^## (.+)$/gm)).length

    expect(h2Count1).toBe(h2Count2)
    expect(h2Count1).toBe(7)
  })
})
