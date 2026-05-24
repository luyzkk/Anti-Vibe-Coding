// 2026-05-24 (Luiz/dev): consolida CA-18/19/20 edge cases — PRD MH-06, fase-06
// Usa fixtures isoladas em tests/fixtures/compound-edge-*/
import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import { runGate } from '../../skills/compound-engineering/lib/gate'
import type { GateAnswers } from '../../skills/compound-engineering/lib/gate'
import { installCompound } from '../../skills/compound-engineering/lib/installer'

const FIXTURES_DIR = path.resolve(import.meta.dir, '../fixtures')

describe('compound-engineering edge cases', () => {
  test('CA-18: gate em projeto sem planos ativos retorna no-plan', async () => {
    const root = path.join(FIXTURES_DIR, 'compound-edge-no-plans')
    const answers: GateAnswers = {
      bug: { answer: 'no' },
      review: { answer: 'no' },
      production: { answer: 'no' },
    }
    const mockInvokeSkill = async (_skill: string, _args: string): Promise<string> => ''

    const result = await runGate(root, answers, mockInvokeSkill)

    expect(result.status).toBe('no-plan')
    expect(result.message).toContain('No active plan found')
  })

  test('CA-19: gate em projeto com 2+ planos pede selecao (retorna multiple-plans)', async () => {
    const root = path.join(FIXTURES_DIR, 'compound-edge-multiple-plans')
    const answers: GateAnswers = {
      bug: { answer: 'yes', details: 'some bug' },
      review: { answer: 'no' },
      production: { answer: 'no' },
      // selectedPlanPath ausente — deve retornar multiple-plans sem invocar skill
    }
    const mockInvokeSkill = async (_skill: string, _args: string): Promise<string> => ''

    const result = await runGate(root, answers, mockInvokeSkill)

    expect(result.status).toBe('multiple-plans')
  })

  test('CA-20: install em projeto sem package.json adiciona nota standalone', async () => {
    const root = path.join(FIXTURES_DIR, 'compound-edge-no-pkgjson')
    const result = await installCompound(root, { force: false })

    expect(result.notes.some((n) => n.includes('No package.json detected'))).toBe(true)
  })
})
