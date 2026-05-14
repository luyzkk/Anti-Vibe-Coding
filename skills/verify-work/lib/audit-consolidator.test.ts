// 2026-05-14 (Luiz/dev): TDD para audit-consolidator — fase-03 plano04
// Cobre: dedup, ordem alfabetica, incomplete, kind mismatch, parse error, CA-06 (novo auditor sem mudanca de codigo)

import { describe, test, expect } from 'bun:test'
import { consolidateAudits } from './audit-consolidator'
import type { AuditInvocation } from './audit-consolidator'

// ---------------------------------------------------------------------------
// Fixtures inline (mirrors real schema — severity lowercase inglês, sem category)
// ---------------------------------------------------------------------------

const makeAuditRaw = (overrides: {
  agent?: string
  status?: string
  reasoning?: string
  domain_status?: string
  issues?: Array<{ severity: string; file?: string; line?: number; description: string }>
}) =>
  JSON.stringify({
    contract_version: '1.0',
    agent: overrides.agent ?? 'test-auditor',
    kind: 'audit',
    status: overrides.status ?? 'complete',
    reasoning:
      overrides.reasoning ??
      'Auditoria concluida sem anomalias fora do esperado — cobertura adequada para escopo.',
    payload: {
      domain_status: overrides.domain_status ?? 'clean',
      issues: overrides.issues ?? [],
    },
  })

// ---------------------------------------------------------------------------
// 1. Dedup: mesmo file:line:description em 2 agents → manter severidade mais alta
// ---------------------------------------------------------------------------

describe('consolidateAudits — dedup', () => {
  test('manter severidade mais alta quando file:line:description duplicado', () => {
    const invocations: AuditInvocation[] = [
      {
        agent: 'agent-alpha',
        rawOutput: makeAuditRaw({
          agent: 'agent-alpha',
          issues: [
            {
              severity: 'medium',
              file: 'parser.ts',
              line: 42,
              description: 'Performance issue em loop',
            },
          ],
        }),
      },
      {
        agent: 'agent-beta',
        rawOutput: makeAuditRaw({
          agent: 'agent-beta',
          issues: [
            {
              severity: 'critical',
              file: 'parser.ts',
              line: 42,
              description: 'Performance issue em loop',
            },
          ],
        }),
      },
    ]

    const result = consolidateAudits(invocations)

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.severity).toBe('critical')
  })

  test('nao deduplicar issues com descriptions diferentes na mesma linha', () => {
    const invocations: AuditInvocation[] = [
      {
        agent: 'agent-alpha',
        rawOutput: makeAuditRaw({
          agent: 'agent-alpha',
          issues: [
            { severity: 'medium', file: 'foo.ts', line: 1, description: 'Issue A' },
            { severity: 'high', file: 'foo.ts', line: 1, description: 'Issue B' },
          ],
        }),
      },
    ]

    const result = consolidateAudits(invocations)
    expect(result.findings).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 2. Ordem alfabetica de agentes — snapshot determinístico
// ---------------------------------------------------------------------------

describe('consolidateAudits — ordem alfabetica', () => {
  test('reasoningByAgent preserva ordem apos shuffle dos inputs', () => {
    const agents = ['zebra-auditor', 'alpha-auditor', 'mango-auditor']
    const invocations: AuditInvocation[] = agents.map((agent) => ({
      agent,
      rawOutput: makeAuditRaw({ agent }),
    }))

    const result = consolidateAudits(invocations)
    const keys = Object.keys(result.reasoningByAgent)
    expect(keys).toEqual([...keys].sort())
  })

  test('findings ordenados por severidade descrescente (critical antes de low)', () => {
    const invocations: AuditInvocation[] = [
      {
        agent: 'solo-auditor',
        rawOutput: makeAuditRaw({
          agent: 'solo-auditor',
          issues: [
            { severity: 'low', file: 'a.ts', line: 1, description: 'Low issue' },
            { severity: 'critical', file: 'b.ts', line: 2, description: 'Critical issue' },
            { severity: 'medium', file: 'c.ts', line: 3, description: 'Medium issue' },
          ],
        }),
      },
    ]

    const result = consolidateAudits(invocations)
    expect(result.findings[0]?.severity).toBe('critical')
    expect(result.findings[1]?.severity).toBe('medium')
    expect(result.findings[2]?.severity).toBe('low')
  })
})

// ---------------------------------------------------------------------------
// 3. Agent blocked vai para incomplete[], nao derruba os outros
// ---------------------------------------------------------------------------

describe('consolidateAudits — degradacao graciosa', () => {
  test('agent com status=blocked vai para incomplete[] e nao derruba outros agents', () => {
    const invocations: AuditInvocation[] = [
      {
        agent: 'blocked-auditor',
        rawOutput: makeAuditRaw({
          agent: 'blocked-auditor',
          status: 'blocked',
          reasoning: 'Nao foi possivel acessar o arquivo de entrada — dependencia faltando.',
        }),
      },
      {
        agent: 'healthy-auditor',
        rawOutput: makeAuditRaw({
          agent: 'healthy-auditor',
          issues: [{ severity: 'high', file: 'main.ts', line: 10, description: 'Problema real' }],
        }),
      },
    ]

    const result = consolidateAudits(invocations)

    expect(result.incomplete).toHaveLength(1)
    expect(result.incomplete[0]?.agent).toBe('blocked-auditor')
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.description).toBe('Problema real')
  })

  test('agent com needs_human vai para incomplete[]', () => {
    const invocations: AuditInvocation[] = [
      {
        agent: 'uncertain-auditor',
        rawOutput: makeAuditRaw({
          agent: 'uncertain-auditor',
          status: 'needs_human',
          reasoning: 'Ambiguidade no codigo exige revisao humana antes de prosseguir auditoria.',
        }),
      },
    ]

    const result = consolidateAudits(invocations)

    expect(result.incomplete).toHaveLength(1)
    expect(result.incomplete[0]?.reason).toContain('needs_human')
    expect(result.findings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Kind mismatch — agent emitiu kind != audit → incomplete[]
// ---------------------------------------------------------------------------

describe('consolidateAudits — kind mismatch', () => {
  test('output com kind=verification vai para incomplete[] nao para findings', () => {
    const wrongKind = JSON.stringify({
      contract_version: '1.0',
      agent: 'wrong-auditor',
      kind: 'verification',
      status: 'complete',
      reasoning: 'Verificacao concluida com checks passando sem anomalias relevantes.',
      payload: {
        domain_status: 'done',
        checks: [{ name: 'check-1', status: 'pass', detail: 'ok' }],
      },
    })

    const invocations: AuditInvocation[] = [{ agent: 'wrong-auditor', rawOutput: wrongKind }]

    const result = consolidateAudits(invocations)

    expect(result.incomplete).toHaveLength(1)
    expect(result.incomplete[0]?.reason).toContain('kind')
    expect(result.findings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Parse error — JSON malformado → incomplete[], nao derruba outros
// ---------------------------------------------------------------------------

describe('consolidateAudits — parse error', () => {
  test('rawOutput com JSON invalido vai para incomplete[] sem derrubar outros', () => {
    const invocations: AuditInvocation[] = [
      {
        agent: 'broken-auditor',
        rawOutput: '{ malformed JSON !!!',
      },
      {
        agent: 'ok-auditor',
        rawOutput: makeAuditRaw({
          agent: 'ok-auditor',
          issues: [{ severity: 'low', file: 'y.ts', line: 5, description: 'Minor smell' }],
        }),
      },
    ]

    const result = consolidateAudits(invocations)

    expect(result.incomplete.some((i) => i.agent === 'broken-auditor')).toBe(true)
    expect(result.findings).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 6. CA-06 — novo auditor foo-auditor com kind: audit é consumido sem mudar codigo
// ---------------------------------------------------------------------------

describe('consolidateAudits — CA-06 extensibilidade', () => {
  test('foo-auditor com kind=audit e consumido sem mudar audit-consolidator.ts', () => {
    const fooAuditorOutput = JSON.stringify({
      contract_version: '1.0',
      agent: 'foo-auditor',
      kind: 'audit',
      status: 'complete',
      reasoning:
        'Foo auditor encontrou um problema especifico de foo — detalhe de dominio isolado sem impacto cross-cutting.',
      payload: {
        domain_status: 'issues_found',
        issues: [
          {
            severity: 'medium',
            file: 'src/foo.ts',
            line: 99,
            description: 'Foo pattern detectado — refatorar para bar pattern',
          },
        ],
      },
    })

    const invocations: AuditInvocation[] = [{ agent: 'foo-auditor', rawOutput: fooAuditorOutput }]

    const result = consolidateAudits(invocations)

    // Deve consolidar sem problema — nenhuma mudanca em audit-consolidator.ts necessaria
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.description).toBe('Foo pattern detectado — refatorar para bar pattern')
    expect(result.reasoningByAgent['foo-auditor']).toBeDefined()
    expect(result.domainStatuses['foo-auditor']).toBe('issues_found')
  })
})

// ---------------------------------------------------------------------------
// 7. domainStatuses captura corretamente por agent
// ---------------------------------------------------------------------------

describe('consolidateAudits — domainStatuses', () => {
  test('domainStatuses registra status por agent corretamente', () => {
    const invocations: AuditInvocation[] = [
      {
        agent: 'clean-auditor',
        rawOutput: makeAuditRaw({ agent: 'clean-auditor', domain_status: 'clean' }),
      },
      {
        agent: 'issues-auditor',
        rawOutput: makeAuditRaw({ agent: 'issues-auditor', domain_status: 'issues_found' }),
      },
    ]

    const result = consolidateAudits(invocations)

    expect(result.domainStatuses['clean-auditor']).toBe('clean')
    expect(result.domainStatuses['issues-auditor']).toBe('issues_found')
  })
})
