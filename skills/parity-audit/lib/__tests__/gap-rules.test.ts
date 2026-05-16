import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { GAP_RULES, crossCapabilitiesWithUsage } from '../gap-rules'
import type { Capability } from '../../../lib/capabilities-writer'

describe('GAP_RULES', () => {
  it('contains exactly 4 rules in severity-ordered sequence', () => {
    expect(GAP_RULES.length).toBe(4)
    expect(GAP_RULES[0]?.gap_id).toBe('stripe-mcp')
    expect(GAP_RULES[1]?.gap_id).toBe('playwright-mcp')
    expect(GAP_RULES[2]?.gap_id).toBe('email-mcp')
    expect(GAP_RULES[3]?.gap_id).toBe('github-mcp')
  })

  it('stripe-mcp detects absence of stripe in mcp names', () => {
    const rule = GAP_RULES[0]
    if (!rule) throw new Error('rule missing')
    const noStripe = { mcps: [], builtin_tools: [], subagents: [], generated_at: '', source: 'manifest' as const }
    const withStripe = { ...noStripe, mcps: [{ name: 'mcp-stripe', tools: [] }] }
    expect(rule.detect(noStripe)).toBe(true)
    expect(rule.detect(withStripe)).toBe(false)
  })
})

// 2026-05-16 (Luiz/dev): RED — CA-08 PRD v6.3.1. crossCapabilitiesWithUsage nao existe ainda em gap-rules.ts.
describe('crossCapabilitiesWithUsage', () => {
  const fixtureRoot = path.join(__dirname, '../../../../tests/fixtures/use-crossing-fixture')

  it('returns no gap when handler is imported elsewhere', async () => {
    const used: Capability = {
      kind: 'route', method: 'GET', path: '/api/used-route',
      handler: 'app/api/used-route/route.ts:5',
      owner_path: 'app/api/used-route/',
      confidence: 1.0, source: 'ast',
    }
    const gaps = await crossCapabilitiesWithUsage([used], fixtureRoot)
    expect(gaps).toEqual([])
  })

  it('returns severity:nice gap when handler has zero references', async () => {
    const orphan: Capability = {
      kind: 'route', method: 'POST', path: '/api/orphan-route',
      handler: 'app/api/orphan-route/route.ts:8',
      owner_path: 'app/api/orphan-route/',
      confidence: 1.0, source: 'ast',
    }
    const gaps = await crossCapabilitiesWithUsage([orphan], fixtureRoot)
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({
      severity: 'nice',
      suggestion: 'declared but not referenced — remove or wire-up',
      gap_id: 'declared-not-used:app/api/orphan-route/route.ts',
    })
  })
})
