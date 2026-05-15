import { describe, it, expect } from 'bun:test'
import { GAP_RULES } from '../gap-rules'

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
