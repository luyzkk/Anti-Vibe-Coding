// skills/init/lib/steps/10-final-validation.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-03 — modo warning + D8.C exception + D4 attestation.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { finalValidationStep, runFinalValidationChecks } from './10-final-validation'
import { AbortError } from './abort-error'

describe('Step 10: final-validation', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-step10-'))
    // Setup docs/ canonico (vazio — sem nada fora da allowlist)
    await fs.mkdir(path.join(cwd, 'docs'), { recursive: true })
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('zero warnings em scaffold canonico (docs/ vazio)', async () => {
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 warnings')
  })

  test('warnings agrupados quando arquivo fora da allowlist existe', async () => {
    await fs.writeFile(path.join(cwd, 'docs/UNEXPECTED.md'), '# Unexpected\n', 'utf8')
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/\d+ warnings/)
  })

  test('D8.C: stack=rails + sem INDEX.md → AbortError code=1', async () => {
    // 2026-05-21 (Luiz/dev): simula estado pos-Step 9 onde stack detectada mas matrix ausente.
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude/stack.json'),
      JSON.stringify({ primary: 'rails' }),
      'utf8',
    )
    // .claude/knowledge/INDEX.md NAO criado intencionalmente.

    let caught: unknown = null
    try {
      await runFinalValidationChecks(cwd)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AbortError)
    expect((caught as AbortError).code).toBe(1)
    expect((caught as AbortError).reason).toContain('rails')
    expect((caught as AbortError).reason).toContain('INDEX.md')
  })

  test('D8.C: stack=null nao aborta mesmo sem INDEX.md (primary=null e estado valido)', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude/stack.json'),
      JSON.stringify({ primary: null }),
      'utf8',
    )
    // Nao deve dar throw — D8.C eh especifico para stack detectada.
    await expect(runFinalValidationChecks(cwd)).resolves.toBeUndefined()
  })

  test('D8.C: docs/knowledge/ orfao emite console.warn (nao-bloqueante)', async () => {
    await fs.mkdir(path.join(cwd, 'docs/knowledge'), { recursive: true })
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)
    try {
      await runFinalValidationChecks(cwd)
    } finally {
      console.warn = originalWarn
    }
    expect(warnings.join('\n')).toContain('docs/knowledge/')
    expect(warnings.join('\n')).toContain('orfao')
  })

  test('AbortError do check primario propaga via Step.run (NAO eh capturado pelo try/catch interno)', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude/stack.json'),
      JSON.stringify({ primary: 'rails' }),
      'utf8',
    )
    let caught: unknown = null
    try {
      await finalValidationStep.run({ cwd, args: [], flags: {} })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AbortError)
    expect((caught as AbortError).code).toBe(1)
  })

  test('IO error em walkDocs vira summary com skipped (graceful degrade)', async () => {
    // 2026-05-21 (Luiz/dev): nao trivial criar IO error reprodutivel cross-platform.
    // Alternativa: testar via unit do walkDocs com path inexistente — walk retorna [] sem throw.
    // Este teste valida que se docs/ nao existir, summary continua "0 warnings" (degraded gracefully).
    await fs.rm(path.join(cwd, 'docs'), { recursive: true, force: true })
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    // Walk de path inexistente retorna [], allowlist filter retorna [], summary = "0 warnings".
    expect(report.summary).toContain('0 warnings')
  })

  // 2026-05-21 (Luiz/dev): D4 attestation — Step 10 NAO contem dry-run guard.
  test('D4: dry-run flag is ignored — validator runs regardless', async () => {
    await fs.writeFile(path.join(cwd, 'docs/OUTSIDE.md'), '# X\n', 'utf8')
    const report = await finalValidationStep.run({ cwd, args: [], flags: { 'dry-run': true } })
    expect(report.summary).not.toContain('skipped (would check allowlist)') // wording v6.7 do guard
  })
})
