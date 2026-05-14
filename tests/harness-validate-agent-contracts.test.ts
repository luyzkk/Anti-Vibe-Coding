// 2026-05-14 (Luiz/dev): RED-first — Plano 05 fase-01.
// Testa checkAgentContracts() contra fixtures minimas. Aplica G-P05-01 (regex linha-por-linha).
import { describe, it, expect } from 'bun:test'
import { checkAgentContracts } from '../scripts/harness-validate'

describe('checkAgentContracts', () => {
  it('passes when agent declares contract_version 1.0 + kind + status + reasoning + payload', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/valid-audit')
    expect(failures).toHaveLength(0)
  })

  it('fails when agent omits contract_version', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/missing-contract-version')
    expect(failures).toHaveLength(1)
    expect(failures[0]?.message).toContain('contract_version')
    expect(failures[0]?.message).toContain('missing-contract-version.md')
  })

  it('fails when agent omits kind', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/missing-kind')
    expect(failures).toHaveLength(1)
    expect(failures[0]?.message).toContain('kind')
  })

  it('fails when agent omits reasoning instruction', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/missing-reasoning')
    expect(failures).toHaveLength(1)
    expect(failures[0]?.message).toContain('reasoning')
  })
})
