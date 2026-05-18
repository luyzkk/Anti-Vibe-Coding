import { test, expect } from 'bun:test'
import { runRollback } from './rollback'

test('runRollback stub returns aborted with documented reason', async () => {
  const result = await runRollback({ cwd: '/tmp/x' })
  expect(result.kind).toBe('aborted')
  if (result.kind === 'aborted') {
    expect(result.code).toBe(1)
    expect(result.reason).toContain('Plano 05 fase-04')
  }
})

test('runRollback respects injected log sink', async () => {
  const lines: string[] = []
  await runRollback({ cwd: '/tmp/x', log: (l) => lines.push(l) })
  expect(lines.length).toBeGreaterThan(0)
  expect(lines[0]).toMatch(/rollback/)
})
