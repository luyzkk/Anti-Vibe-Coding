// 2026-05-14 (Luiz/dev): TDD para consolidateProposals — PRD §Decisoes #4 (kind: proposal)
// Fixtures derivadas de agents/__fixtures__/design-explorer/expected-output.json (shape canonico)

import { describe, expect, it } from 'bun:test'
import { consolidateProposals } from './index'
import type { DesignTwiceInvocation } from './index'

// ---------------------------------------------------------------------------
// Fixture: JSON valido conforme contrato v1 com kind: proposal
// ---------------------------------------------------------------------------

function makeProposalFixture(letter: string, title: string): string {
  return JSON.stringify({
    contract_version: '1.0',
    agent: 'design-explorer',
    kind: 'proposal',
    status: 'complete',
    reasoning: `Proposta ${letter}: analise completa com tradeoffs identificados e constraints verificadas.`,
    payload: {
      proposal: {
        title,
        summary: `Resumo da proposta ${letter} para o problema dado.`,
        constraints: ['Constraint 1', 'Constraint 2'],
        tradeoffs: [{ axis: 'complexidade x simplicidade', choice: `Proposta ${letter} favorece simplicidade` }],
        recommendation: `Usar abordagem ${letter} porque atende todos os constraints.`,
        alternatives: [
          { id: 'X', title: 'Alternativa X', rejected_because: 'Nao atende constraint 1.' },
        ],
      },
    },
    human_readable: `## Proposta ${letter}\nDetalhamento completo da proposta ${letter}.`,
    metadata: { run_id: `fixture-${letter}-001`, duration_ms: 1000, model: 'sonnet' },
  })
}

function makeAuditFixture(): string {
  return JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning: 'Auditoria concluida com issues identificados no modulo de auth e dependencias.',
    payload: {
      issues: [{ severity: 'high', description: 'SQL injection potencial' }],
    },
  })
}

function makeNeedsHumanFixture(letter: string): string {
  return JSON.stringify({
    contract_version: '1.0',
    agent: 'design-explorer',
    kind: 'proposal',
    status: 'needs_human',
    reasoning: `Proposta ${letter} bloqueada: constraints contraditórias identificadas, humano deve resolver antes de prosseguir.`,
    payload: {
      proposal: {
        title: `Proposta ${letter} — bloqueada`,
        summary: 'Nao foi possivel completar por constraints contraditorias.',
        constraints: ['Constraint impossivel'],
        tradeoffs: [],
        recommendation: 'Humano deve resolver conflito de constraints.',
        alternatives: [],
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('consolidateProposals', () => {
  it('ordena A/B/C apos shuffle de input [C, A, B]', () => {
    const invocations: DesignTwiceInvocation[] = [
      { letter: 'C', philosophy: 'Performance-first', rawOutput: makeProposalFixture('C', 'Proposta Performance') },
      { letter: 'A', philosophy: 'KISS radical', rawOutput: makeProposalFixture('A', 'Proposta Simples') },
      { letter: 'B', philosophy: 'Open-Closed', rawOutput: makeProposalFixture('B', 'Proposta Flexivel') },
    ]

    const result = consolidateProposals(invocations)

    expect(result).toHaveLength(3)
    expect(result[0]?.letter).toBe('A')
    expect(result[1]?.letter).toBe('B')
    expect(result[2]?.letter).toBe('C')
  })

  it('retorna letter A em result[0] para determinismo (criterio de aceite maquina)', () => {
    const invocations: DesignTwiceInvocation[] = [
      { letter: 'B', philosophy: 'Open-Closed', rawOutput: makeProposalFixture('B', 'Proposta B') },
      { letter: 'A', philosophy: 'KISS radical', rawOutput: makeProposalFixture('A', 'Proposta A') },
      { letter: 'C', philosophy: 'Performance-first', rawOutput: makeProposalFixture('C', 'Proposta C') },
    ]

    const result = consolidateProposals(invocations)

    expect(result[0]?.letter).toBe('A')
  })

  it('lanca quando kind != proposal (kind: audit recebido)', () => {
    const invocations: DesignTwiceInvocation[] = [
      { letter: 'A', philosophy: 'KISS radical', rawOutput: makeAuditFixture() },
    ]

    expect(() => consolidateProposals(invocations)).toThrow(/kind.*proposal|proposal.*kind/i)
  })

  it('retorna proposal null e preserva os outros quando status = needs_human', () => {
    // G-P02-04: needs_human nao derruba os outros — Promise.allSettled garante isso na camada de invoke
    // consolidateProposals() recebe rawOutput ja resolvido; testa que nao joga exception e marca null
    const invocations: DesignTwiceInvocation[] = [
      { letter: 'A', philosophy: 'KISS radical', rawOutput: makeProposalFixture('A', 'Proposta A') },
      { letter: 'B', philosophy: 'Open-Closed', rawOutput: makeNeedsHumanFixture('B') },
      { letter: 'C', philosophy: 'Performance-first', rawOutput: makeProposalFixture('C', 'Proposta C') },
    ]

    const result = consolidateProposals(invocations)

    expect(result).toHaveLength(3)
    expect(result[0]?.status).toBe('complete')
    expect(result[0]?.proposal).not.toBeNull()
    expect(result[1]?.status).toBe('needs_human')
    expect(result[1]?.proposal).toBeNull()
    expect(result[2]?.status).toBe('complete')
    expect(result[2]?.proposal).not.toBeNull()
  })

  it('expoe titulo e summary do payload.proposal quando status = complete', () => {
    const invocations: DesignTwiceInvocation[] = [
      { letter: 'A', philosophy: 'KISS radical', rawOutput: makeProposalFixture('A', 'Cache Redis TTL adaptativo') },
    ]

    const result = consolidateProposals(invocations)

    expect(result[0]?.proposal?.title).toBe('Cache Redis TTL adaptativo')
    expect(result[0]?.proposal?.summary).toContain('Resumo da proposta A')
  })

  it('preserva human_readable de cada proposta', () => {
    const invocations: DesignTwiceInvocation[] = [
      { letter: 'A', philosophy: 'KISS radical', rawOutput: makeProposalFixture('A', 'Proposta A') },
    ]

    const result = consolidateProposals(invocations)

    expect(result[0]?.humanReadable).toContain('Proposta A')
  })

  it('lanca quando JSON invalido (rawOutput corrompido)', () => {
    const invocations: DesignTwiceInvocation[] = [
      { letter: 'A', philosophy: 'KISS radical', rawOutput: 'not-valid-json{{{' },
    ]

    expect(() => consolidateProposals(invocations)).toThrow()
  })
})
