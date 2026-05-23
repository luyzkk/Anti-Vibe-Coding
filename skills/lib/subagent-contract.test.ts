import { describe, it, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseContract, parseLooseJSON, parseAndDispatch, withRetry, type AuditContract, type SubagentContract } from './subagent-contract'

const SCHEMA_PATH = resolve(import.meta.dir, '../../agents/_contract/v1.schema.json')

describe('subagent contract schema', () => {
  it('schema file exists and is valid JSON', () => {
    const raw = readFileSync(SCHEMA_PATH, 'utf8')
    const schema = JSON.parse(raw) as unknown
    expect(schema).toBeTruthy()
  })
})

test('parseLooseJSON strips ```json code fence', () => {
  const raw = '```json\n{"a":1}\n```'
  const r = parseLooseJSON(raw)
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.value).toEqual({ a: 1 })
})

test('parseLooseJSON recovers from trailing comma', () => {
  const raw = '{"a":1,"b":2,}'
  const r = parseLooseJSON(raw)
  expect(r.ok).toBe(true)
})

test('parseLooseJSON returns ok=false for unrecoverable malformed JSON', () => {
  const r = parseLooseJSON('not json at all { broken')
  expect(r.ok).toBe(false)
})

test('rejects reasoning shorter than 20 chars with REASONING_TOO_SHORT (CA-02)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning: 'curto',
    payload: { issues: [] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(false)
  expect(r.errors.some(e => e.code === 'REASONING_TOO_SHORT')).toBe(true)
})

test('warns when reasoning is 20-49 chars (REASONING_LIKELY_WEAK)', () => {
  const reasoning = 'a'.repeat(30) // 30 chars — passes error threshold, triggers warning
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning,
    payload: { issues: [] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(true)
  expect(r.warnings.some(w => w.code === 'REASONING_LIKELY_WEAK')).toBe(true)
})

test('rejects domain enum in top-level status with INVALID_LIFECYCLE_STATUS (CA-03)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'VULNERABILITIES_FOUND',
    reasoning: 'texto suficientemente longo aqui para passar o threshold ok',
    payload: { issues: [] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(false)
  const err = r.errors.find(e => e.code === 'INVALID_LIFECYCLE_STATUS')
  expect(err).toBeDefined()
  expect(err?.hint).toContain('payload.domain_status')
})

test('detects API_KEY pattern in payload (SECRET_PATTERN_DETECTED)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning: 'texto suficientemente longo aqui para passar o threshold ok',
    payload: { issues: [{ severity: 'high', description: 'API_KEY=abc123def456ghi789 found' }] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(false)
  expect(r.errors.some(e => e.code === 'SECRET_PATTERN_DETECTED')).toBe(true)
})

test('accepts valid audit contract with reasoning >=50 chars (no warnings)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning: 'Encontrei MD5 em src/auth.ts:42 e SQL concatenado em src/api.ts:15. Nada fora do schema.',
    payload: { issues: [{ severity: 'critical', description: 'MD5 used' }] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(true)
  expect(r.errors).toEqual([])
  expect(r.warnings).toEqual([])
})

test('mechanical retry signal: INVALID_JSON has hint to re-invoke', () => {
  const r = parseContract('not json at all')
  expect(r.valid).toBe(false)
  const err = r.errors.find(e => e.code === 'INVALID_JSON')
  expect(err?.hint).toContain('Retry mecanico')
})

test('E2E tracer bullet: security-auditor fixture → parseAndDispatch → consumer reads payload.issues', async () => {
  // 1. Carrega fixture (simula output real do security-auditor)
  const fixturePath = resolve(__dirname, '../../agents/__fixtures__/security-auditor/expected-output.json')
  const rawOutput = readFileSync(fixturePath, 'utf8')

  // 2. Consumer stub captura o que recebeu (sem regex, sem parsing custom)
  let captured: AuditContract | null = null
  const handlers = {
    audit: (contract: AuditContract) => {
      captured = contract
    },
  }

  // 3. parseAndDispatch valida + roteia
  const result = await parseAndDispatch(rawOutput, handlers)

  // 4. Asserts
  expect(result.validation.valid).toBe(true)
  expect(result.validation.errors).toEqual([])
  expect(result.dispatched).toBe(true)
  expect(result.handlerKind).toBe('audit')
  expect(captured).not.toBeNull()
  expect(captured!.agent).toBe('security-auditor')
  expect(captured!.kind).toBe('audit')
  expect(captured!.status).toBe('complete')
  expect(captured!.reasoning.length).toBeGreaterThanOrEqual(50)
  const issues = captured!.payload.issues
  expect(issues).toHaveLength(2)
  const issue0 = issues[0]
  const issue1 = issues[1]
  expect(issue0?.severity).toBe('critical')
  expect(issue0?.file).toBe('src/auth.ts')
  expect(issue1?.severity).toBe('high')
})

test('parseAndDispatch reports dispatched=false when no handler matches kind', async () => {
  const rawOutput = readFileSync(
    resolve(__dirname, '../../agents/__fixtures__/security-auditor/expected-output.json'),
    'utf8'
  )
  const result = await parseAndDispatch(rawOutput, {})  // sem handler
  expect(result.validation.valid).toBe(true)
  expect(result.dispatched).toBe(false)
  expect(result.handlerKind).toBe('audit')
})

// 2026-05-14 (Luiz/dev): regression suite 13 fixtures — Plano 03 fase-05 CA-07
// Parameterized loop: each fixture must pass parseContract with valid=true, 0 errors, 0 warnings.
// Decision (DI-01): 2 existing tests below are kept (domain-specific assertions). Loop adds baseline
// envelope validation for all 13. Total ~27 tests.
const FIXTURE_NAMES = [
  'security-auditor',
  'plan-verifier',
  'design-explorer',
  'react-auditor',
  'solid-auditor',
  'code-smell-detector',
  'tdd-verifier',
  'api-auditor',
  'database-analyzer',
  'infrastructure-auditor',
  'lesson-evaluator',
  'plan-executor',
  'documentation-writer',
] as const

for (const fixtureName of FIXTURE_NAMES) {
  test(`fixture ${fixtureName}: parseContract valid=true, 0 errors, 0 warnings`, () => {
    const fixturePath = resolve(
      import.meta.dir,
      `../../agents/__fixtures__/${fixtureName}/expected-output.json`
    )
    const rawOutput = readFileSync(fixturePath, 'utf8')
    const result = parseContract(rawOutput)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })
}

// 2026-05-23 (Luiz/dev): fixtures prove-it — Plano 02 fase-03 CA-03/CA-04
const PROVE_IT_STATES = ['red-confirmed', 'already-green', 'inconclusive'] as const
for (const state of PROVE_IT_STATES) {
  test(`fixture tdd-verifier/prove-it/${state}: parseContract valida envelope v1`, () => {
    const fixturePath = resolve(
      import.meta.dir,
      `../../agents/__fixtures__/tdd-verifier/prove-it/${state}/expected-output.json`
    )
    const rawOutput = readFileSync(fixturePath, 'utf8')
    const result = parseContract(rawOutput)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
}

// 2026-05-14 (Luiz/dev): fixture plan-verifier — Plano 02 fase-03 CA-07
test('plan-verifier fixture valida envelope v1 com domain_status warn', async () => {
  const fixturePath = resolve(__dirname, '../../agents/__fixtures__/plan-verifier/expected-output.json')
  const rawOutput = readFileSync(fixturePath, 'utf8')
  const result = parseContract(rawOutput)
  expect(result.valid).toBe(true)
  expect(result.errors).toEqual([])
  expect(result.warnings).toEqual([])
  expect(result.contract?.kind).toBe('verification')
  const contract = result.contract
  if (contract?.kind === 'verification') {
    expect(contract.payload.domain_status).toBe('warn')
  }
})

// 2026-05-14 (Luiz/dev): fixture design-explorer — Plano 02 fase-03 CA-07
test('design-explorer fixture valida envelope v1 kind=proposal', async () => {
  const fixturePath = resolve(__dirname, '../../agents/__fixtures__/design-explorer/expected-output.json')
  const rawOutput = readFileSync(fixturePath, 'utf8')
  const result = parseContract(rawOutput)
  expect(result.valid).toBe(true)
  expect(result.errors).toEqual([])
  expect(result.warnings).toEqual([])
  expect(result.contract?.kind).toBe('proposal')
  const contract = result.contract
  if (contract?.kind === 'proposal') {
    const alts = contract.payload.proposal.alternatives
    expect(alts.length).toBeGreaterThanOrEqual(1)
  }
})

// 2026-05-14 (Luiz/dev): withRetry testes — PRD §Decisoes #9 (D9) — Plano 04 fase-01
// RED: withRetry ausente → import error. GREEN: adicionar export em subagent-contract.ts.

// Helper to build minimal valid SubagentContract-like objects without going through schema validation
function makeContract(status: SubagentContract['status']): SubagentContract {
  return {
    contract_version: '1.0',
    agent: 'test-agent',
    kind: 'verification',
    status,
    reasoning: 'reasoning longa o suficiente para passar threshold de 50 chars ok aqui',
    payload: {
      checks: [{ name: 'test', status: 'pass' }],
    },
  } as SubagentContract
}

test('withRetry retorna resultado direto quando status nao e needs_retry', async () => {
  const contract = makeContract('complete')
  const result = await withRetry(() => Promise.resolve(contract))
  expect(result.status).toBe('complete')
})

test('withRetry escala needs_retry para needs_human apos max (default max=1)', async () => {
  let callCount = 0
  const invoke = () => {
    callCount += 1
    return Promise.resolve(makeContract('needs_retry'))
  }
  const result = await withRetry(invoke)
  // Chamou 1 vez inicial + 1 retry = 2 total
  expect(callCount).toBe(2)
  // Segundo needs_retry escala para needs_human (D9)
  expect(result.status).toBe('needs_human')
  expect(result.reasoning).toContain('withRetry')
})

test('withRetry faz exatamente 1 retry e nao entra em loop', async () => {
  let callCount = 0
  const invoke = () => {
    callCount += 1
    return Promise.resolve(makeContract('needs_retry'))
  }
  await withRetry(invoke, { max: 1 })
  // Cap absoluto: 1 inicial + 1 retry = 2, nunca 3+
  expect(callCount).toBe(2)
})

test('withRetry com retry bem-sucedido retorna complete na segunda tentativa', async () => {
  let callCount = 0
  const invoke = () => {
    callCount += 1
    if (callCount === 1) return Promise.resolve(makeContract('needs_retry'))
    return Promise.resolve(makeContract('complete'))
  }
  const result = await withRetry(invoke, { max: 1 })
  expect(callCount).toBe(2)
  expect(result.status).toBe('complete')
})
