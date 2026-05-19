// skills/init/lib/steps/90-final-validation.test.ts
// 2026-05-19 (Luiz/dev): RED — allowlist-mode. Plano 04 fase-03.
// fase-04: +2 testes — never throws + CA-07 no AbortError instance.
// Substitui testes antigos (harness-validate spawn + AbortError).
import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { finalValidationStep } from './90-final-validation'

async function makeFixture(extras: readonly string[]): Promise<string> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'val-allowlist-'))
  await fs.mkdir(path.join(cwd, 'docs/design-docs'), { recursive: true })
  await fs.writeFile(path.join(cwd, 'docs/STATE.md'), '# state')
  await fs.writeFile(path.join(cwd, 'docs/design-docs/index.md'), '# index')
  for (const rel of extras) {
    const abs = path.join(cwd, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, '# extra')
  }
  return cwd
}

describe('finalValidationStep (allowlist mode)', () => {
  let cwd: string

  afterEach(async () => {
    if (cwd) await fs.rm(cwd, { recursive: true, force: true })
  })

  it('reports 0 warnings when only canonical docs exist', async () => {
    cwd = await makeFixture([])
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.summary).toContain('0 warnings')
  })

  it('CA-06 Bug A: groups ~179 spurious paths into <= 5 warning groups', async () => {
    const extras: string[] = []
    for (let i = 0; i < 179; i++) {
      extras.push(`docs/custom/file-${i}.md`)
    }
    cwd = await makeFixture(extras)
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    const match = /(\d+) warnings/.exec(report.summary)
    expect(match).not.toBeNull()
    const warnings = Number(match![1])
    expect(warnings).toBeLessThanOrEqual(5)
  })

  it('does not warn on runtime paths under docs/exec-plans/active/', async () => {
    cwd = await makeFixture(['docs/exec-plans/active/2026-05-19-foo/PLAN.md'])
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.summary).toContain('0 warnings')
  })

  it('ignores docs/_legacy (backup pre-6.5.0)', async () => {
    cwd = await makeFixture(['docs/_legacy/pre-6.5.0/anything.md'])
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.summary).toContain('0 warnings')
  })

  it('never throws — even when docs/ is missing entirely', async () => {
    // 2026-05-19 (Luiz/dev): Plano 04 fase-04 — try/catch defensivo no Step 90.
    // walkDocs degrade gracefully em IO error; step nunca propaga excecao (CA-07 convergencia).
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'val-nodocs-'))
    // docs/ nao existe — walkDocs retorna [] sem throw. Mas se buildAllowlistFromTemplateManifest
    // lancasse, o step precisa do outer try/catch para continuar.
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(typeof report.summary).toBe('string')
    // summary deve ser uma string nao vazia (pode ser '0 warnings' ou 'skipped due to IO error')
    expect(report.summary.length).toBeGreaterThan(0)
  })

  it('CA-07: warning emitted but report is not an AbortError instance', async () => {
    // 2026-05-19 (Luiz/dev): Plano 04 fase-04 — garante que warnings nao lancam AbortError.
    // Step 90 NUNCA aborta init (PRD MH-08, CA-07 Bug C).
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'val-warn-noabort-'))
    await fs.mkdir(path.join(cwd, 'docs'), { recursive: true })
    await fs.writeFile(path.join(cwd, 'docs/CUSTOM.md'), '# custom')
    let thrown = false
    let thrownError: unknown
    try {
      await finalValidationStep.run({ cwd, args: [], flags: {} })
    } catch (e) {
      thrown = true
      thrownError = e
    }
    expect(thrown).toBe(false)
    // Verificacao redundante mas explicita: se por algum motivo chegou aqui, nao eh AbortError
    if (thrown) {
      const { AbortError } = await import('./abort-error')
      expect(thrownError instanceof AbortError).toBe(false)
    }
  })
})
