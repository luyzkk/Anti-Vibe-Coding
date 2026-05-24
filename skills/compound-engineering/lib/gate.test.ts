// 2026-05-24 (Luiz/dev): testes RED para runGate — PRD CA-07/08/18/19, MH-06/RF-06
// 2026-05-24 (Luiz/dev): SH-07 completion signal assertion adicionado — fase-06
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// @ts-ignore — modulo nao existe em RED phase
import { runGate } from './gate'
import type { GateAnswers } from './gate'

describe('runGate', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gate-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  async function setupActivePlan(slug: string): Promise<string> {
    const planDir = path.join(tmpDir, 'docs', 'exec-plans', 'active', slug)
    await fs.mkdir(planDir, { recursive: true })
    const planPath = path.join(planDir, 'PLAN.md')
    await fs.writeFile(planPath, '# Test Plan\n\n## Lessons Captured\n\n_(none yet)_\n\n## Exit Criteria\n\n- done\n')
    return planPath
  }

  it('CA-07: plano unico + resposta yes invoca Skill tool e atualiza PLAN.md com link (captured)', async () => {
    await setupActivePlan('2026-05-24-my-feature')

    const answers: GateAnswers = {
      bug: { answer: 'yes', details: 'race condition in session refresh' },
      review: { answer: 'no' },
      production: { answer: 'no' },
    }

    // Mock de invokeSkill: simula output com completion signal YAML
    const mockInvokeSkill = async (_skill: string, _args: string): Promise<string> => {
      return `Lesson captured.\n\n\`\`\`yaml\nstatus: complete\nnote_created: docs/compound/2026-05-24-race-condition.md\n\`\`\``
    }

    const result = await runGate(tmpDir, answers, mockInvokeSkill)

    expect(result.status).toBe('captured')
    expect(result.planPath).toBeDefined()
    expect(result.notePath).toContain('race-condition')

    // PLAN.md deve ter o link na secao Lessons Captured
    const planPath = path.join(tmpDir, 'docs', 'exec-plans', 'active', '2026-05-24-my-feature', 'PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf-8')
    expect(planContent).toContain('Lesson captured')
  })

  it('CA-08: plano unico + 3 respostas no + razao → no-capture com log no PLAN.md', async () => {
    await setupActivePlan('2026-05-24-my-feature')

    const answers: GateAnswers = {
      bug: { answer: 'no' },
      review: { answer: 'no' },
      production: { answer: 'no' },
      noCaptureReason: 'trivial cosmetic fix, no patterns',
    }

    const mockInvokeSkill = async (_skill: string, _args: string): Promise<string> => ''

    const result = await runGate(tmpDir, answers, mockInvokeSkill)

    expect(result.status).toBe('no-capture')
    expect(result.planPath).toBeDefined()
    expect(result.message).toContain('no compound capture needed')

    // PLAN.md deve ter a razao
    const planPath = path.join(tmpDir, 'docs', 'exec-plans', 'active', '2026-05-24-my-feature', 'PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf-8')
    expect(planContent).toContain('no compound capture needed because')
    expect(planContent).toContain('trivial cosmetic fix')
  })

  it('CA-18: target sem docs/exec-plans/active retorna no-plan com mensagem literal', async () => {
    // tmpDir sem estrutura de plano

    const answers: GateAnswers = {
      bug: { answer: 'no' },
      review: { answer: 'no' },
      production: { answer: 'no' },
    }

    const mockInvokeSkill = async (_skill: string, _args: string): Promise<string> => ''

    const result = await runGate(tmpDir, answers, mockInvokeSkill)

    expect(result.status).toBe('no-plan')
    expect(result.message).toContain('No active plan found')
  })

  it('CA-19: target com 2+ planos e sem selectedPlanPath retorna multiple-plans', async () => {
    await setupActivePlan('2026-05-24-feature-a')
    await setupActivePlan('2026-05-24-feature-b')

    const answers: GateAnswers = {
      bug: { answer: 'yes', details: 'some bug' },
      review: { answer: 'no' },
      production: { answer: 'no' },
      // selectedPlanPath ausente — deve retornar multiple-plans
    }

    const mockInvokeSkill = async (_skill: string, _args: string): Promise<string> => ''

    const result = await runGate(tmpDir, answers, mockInvokeSkill)

    expect(result.status).toBe('multiple-plans')
    expect(result.message).toContain('Multiple active plans')
  })

  // 2026-05-24 (Luiz/dev): SH-07 — completion signal YAML machine-readable no output do gate — fase-06
  it('SH-07: completion signal — message de captured contem bloco yaml com skill e status', async () => {
    await setupActivePlan('2026-05-24-signal-test')

    const answers: GateAnswers = {
      bug: { answer: 'yes', details: 'completion signal test' },
      review: { answer: 'no' },
      production: { answer: 'no' },
    }

    const mockInvokeSkill = async (_skill: string, _args: string): Promise<string> => {
      return `Lesson captured.\n\n\`\`\`yaml\nstatus: complete\nnote_created: docs/compound/2026-05-24-signal.md\n\`\`\``
    }

    const result = await runGate(tmpDir, answers, mockInvokeSkill)

    expect(result.status).toBe('captured')
    // SH-07: bloco yaml com campos skill e status obrigatorios
    expect(result.message).toMatch(/```yaml[\s\S]*status:/)
    expect(result.message).toContain('anti-vibe-coding:compound-engineering')
  })
})
