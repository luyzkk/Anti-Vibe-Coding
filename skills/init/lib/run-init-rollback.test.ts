import { test, expect } from 'bun:test'
import { runInit } from './run-init'
import type { Step } from './steps/types'

test('runInit with --rollback flag invokes rollback stub and does not iterate registry', async () => {
  let registryWasIterated = false
  const fakeStep: Step = {
    id: 'fake-step',
    async run() {
      registryWasIterated = true
      return { mutated: false, summary: 'should not run' }
    },
  }
  const result = await runInit(['--rollback'], { registry: [fakeStep] })
  expect(registryWasIterated).toBe(false)
  expect(result.kind).toBe('aborted')
})

test('runInit without --rollback flag iterates registry normally', async () => {
  let registryWasIterated = false
  const fakeStep: Step = {
    id: 'fake-step',
    async run() {
      registryWasIterated = true
      return { mutated: false, summary: 'ran' }
    },
  }
  const result = await runInit([], { registry: [fakeStep] })
  expect(registryWasIterated).toBe(true)
  expect(result.kind).toBe('ok')
})

// 2026-05-18 (Luiz/dev): Plano 05 fase-04 — stub replaced by real impl. Now returns "no backup found"
// (no .anti-vibe/backup/ in the default cwd during tests).
test('runInit with --rollback propagates reason from executeRollback', async () => {
  const result = await runInit(['--rollback'], { registry: [], cwd: '/tmp' })
  expect(result.kind).toBe('aborted')
  if (result.kind === 'aborted') {
    expect(result.reason).toContain('no backup found')
  }
})
