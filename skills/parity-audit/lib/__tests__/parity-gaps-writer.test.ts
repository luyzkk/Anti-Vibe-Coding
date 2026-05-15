import { describe, it, expect } from 'bun:test'
import { computeParityGaps } from '../parity-gaps-writer'
import type { ToolRegistrySnapshot } from '../../../lib/tool-registry-inspector'

const emptySnapshot: ToolRegistrySnapshot = {
  mcps: [],
  builtin_tools: [],
  subagents: [],
  generated_at: '2026-05-14T00:00:00.000Z',
  source: 'manifest',
}

const stripeSnapshot: ToolRegistrySnapshot = {
  ...emptySnapshot,
  mcps: [{ name: 'mcp-stripe', tools: ['create_payment_intent'] }],
}

describe('computeParityGaps', () => {
  it('returns all rules as gaps when registry is empty', () => {
    const output = computeParityGaps(emptySnapshot, null)

    expect(output.gaps.length).toBe(4)
    expect(output.gaps[0]?.severity).toBe('critical')
    expect(output.gaps[output.gaps.length - 1]?.severity).toBe('nice')
    expect(output.schema_version).toBe('1.0')
    expect(isNaN(Date.parse(output.generated_at))).toBe(false)
  })

  it('returns zero gaps when Stripe MCP is installed and task_type is payment-debug', () => {
    const output = computeParityGaps(stripeSnapshot, 'payment-debug')

    expect(output.gaps.length).toBe(0)
    expect(output.tool_registry_snapshot.mcps[0]?.name).toBe('mcp-stripe')
  })

  it('sorts gaps by severity rank: critical first, then important, then nice', () => {
    const partial: ToolRegistrySnapshot = {
      ...emptySnapshot,
      mcps: [{ name: 'mcp-stripe', tools: [] }],
    }

    const output = computeParityGaps(partial, null)

    expect(output.gaps.length).toBe(3)
    expect(output.gaps[0]?.severity).toBe('critical')
    expect(output.gaps[1]?.severity).toBe('important')
    expect(output.gaps[2]?.severity).toBe('nice')
  })
})
