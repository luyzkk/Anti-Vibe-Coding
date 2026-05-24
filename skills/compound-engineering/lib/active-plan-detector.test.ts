// 2026-05-24 (Luiz/dev): testes RED para detectActivePlan — PRD CA-18/19
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// @ts-ignore — modulo nao existe em RED phase
import { detectActivePlan } from './active-plan-detector'

describe('detectActivePlan', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'active-plan-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('status none: sem diretorio active retorna none (CA-18)', async () => {
    // tmpDir sem docs/exec-plans/active/
    const result = await detectActivePlan(tmpDir)
    expect(result.status).toBe('none')
  })

  it('status none: active/ existe mas vazio retorna none (CA-18)', async () => {
    const activeDir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
    await fs.mkdir(activeDir, { recursive: true })

    const result = await detectActivePlan(tmpDir)
    expect(result.status).toBe('none')
  })

  it('status single: exatamente 1 subdir com PLAN.md retorna single com planPath (CA-07)', async () => {
    const activeDir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
    const planDir = path.join(activeDir, '2026-05-24-my-feature')
    await fs.mkdir(planDir, { recursive: true })
    await fs.writeFile(path.join(planDir, 'PLAN.md'), '# My Feature Plan\n\n## Lessons Captured\n')

    const result = await detectActivePlan(tmpDir)
    expect(result.status).toBe('single')
    if (result.status === 'single') {
      expect(result.slug).toBe('2026-05-24-my-feature')
      expect(result.planPath).toContain('PLAN.md')
    }
  })

  it('status multiple: 2+ subdirs com PLAN.md retorna multiple (CA-19)', async () => {
    const activeDir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
    const planDir1 = path.join(activeDir, '2026-05-24-feature-a')
    const planDir2 = path.join(activeDir, '2026-05-24-feature-b')
    await fs.mkdir(planDir1, { recursive: true })
    await fs.mkdir(planDir2, { recursive: true })
    await fs.writeFile(path.join(planDir1, 'PLAN.md'), '# Feature A\n')
    await fs.writeFile(path.join(planDir2, 'PLAN.md'), '# Feature B\n')

    const result = await detectActivePlan(tmpDir)
    expect(result.status).toBe('multiple')
    if (result.status === 'multiple') {
      expect(result.candidates.length).toBe(2)
    }
  })
})
