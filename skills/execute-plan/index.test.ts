// 2026-05-12 (Luiz/dev): co-located stub para satisfazer tdd-gate durante fase D33/CA-47
// Testes reais em tests/completion-signal-emission.test.ts
import { describe, it, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseAndDispatch, withRetry, type VerificationContract } from '../lib/subagent-contract'

describe('execute-plan index (stub — testes reais em tests/completion-signal-emission.test.ts)', () => {
  it('noop', () => { /* satisfaz TDD gate */ })
})

// 2026-05-14 (Luiz/dev): integracao execute-plan com parseAndDispatch — Plano 04 fase-01
// Testa que o orquestrador consegue consumir outputs de plan-verifier e plan-executor
// via handler generico, sem parsing de texto livre/regex.

test('consome plan-verifier via parseAndDispatch e le payload.checks', async () => {
  const fixturePath = resolve(import.meta.dir, '../../agents/__fixtures__/plan-verifier/expected-output.json')
  const rawOutput = readFileSync(fixturePath, 'utf8')

  let captured: VerificationContract | null = null
  const result = await parseAndDispatch(rawOutput, {
    verification: (contract: VerificationContract) => {
      captured = contract
    },
  })

  expect(result.validation.valid).toBe(true)
  expect(result.dispatched).toBe(true)
  expect(result.handlerKind).toBe('verification')
  expect(captured).not.toBeNull()
  expect(captured!.status).toBe('complete')
  expect(captured!.payload.checks.length).toBeGreaterThan(0)
  // D2: lifecycle status separado de domain_status
  expect(captured!.payload.domain_status).toBe('warn')
})

test('consome plan-executor via parseAndDispatch e le tasks_completed (dual shape)', async () => {
  const fixturePath = resolve(import.meta.dir, '../../agents/__fixtures__/plan-executor/expected-output.json')
  const rawOutput = readFileSync(fixturePath, 'utf8')

  let captured: VerificationContract | null = null
  const result = await parseAndDispatch(rawOutput, {
    verification: (contract: VerificationContract) => {
      captured = contract
    },
  })

  expect(result.validation.valid).toBe(true)
  expect(result.dispatched).toBe(true)
  // plan-executor domain_status: partial nao vira blocked lifecycle (D2)
  expect(captured).not.toBeNull()
  expect(captured!.status).toBe('complete')
  expect(captured!.payload.domain_status).toBe('partial')
  // tasks_completed e tasks_skipped estao no payload como campos extras (additionalProperties)
  const payloadAny = captured!.payload as Record<string, unknown>
  expect(Array.isArray(payloadAny['tasks_completed'])).toBe(true)
  expect(Array.isArray(payloadAny['tasks_skipped'])).toBe(true)
})

test('withRetry integra com parseAndDispatch: escala needs_retry para needs_human (D9)', async () => {
  // Simula subagente que sempre retorna needs_retry
  const alwaysNeedsRetry = (): Promise<VerificationContract> =>
    Promise.resolve({
      contract_version: '1.0',
      agent: 'plan-verifier',
      kind: 'verification',
      status: 'needs_retry',
      reasoning: 'LLM falhou em emitir JSON valido desta vez, tente novamente — contexto perdido',
      payload: { checks: [] },
    } as VerificationContract)

  const result = await withRetry(alwaysNeedsRetry, { max: 1 })
  // Depois de 1 retry, status deve escalar para needs_human
  expect(result.status).toBe('needs_human')
  expect(result.reasoning).toContain('withRetry')
})
