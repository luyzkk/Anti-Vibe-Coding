// skills/init/lib/steps/08-delivery-loop.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-01 — CA-06 attestation + contrato needsUser (PRD D3/CH-01).

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { deliveryLoopStep } from './08-delivery-loop'

describe('Step 8: delivery-loop', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-step08-'))
    // 2026-05-21 (Luiz/dev): fixture AGENTS.md com marker — simula scaffold do Step 5 real.
    await fs.writeFile(
      path.join(cwd, 'AGENTS.md'),
      '# Agents\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n',
      'utf8',
    )
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('first invocation returns needsUser with byte-identical prompt (DOUBLE SPACE preserved)', async () => {
    const ctx = { cwd, args: [], flags: {} }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.needsUser).toBeDefined()
    // 2026-05-21 (Luiz/dev): G3 do README — DOUBLE SPACE antes de '[y/N]' eh contratual.
    expect(report.needsUser?.prompt).toBe(
      'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]',
    )
    expect(report.needsUser?.options).toEqual(['y', 'N'])
  })

  test('CA-06: AGENTS.md is byte-identical AFTER first invocation (no mutation before user answers)', async () => {
    const ctx = { cwd, args: [], flags: {} }
    const before = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    await deliveryLoopStep.run(ctx)
    const after = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(after).toBe(before)
  })

  test('second invocation with answer "y" injects Delivery Loop section', async () => {
    const ctx = { cwd, args: [], flags: { __interactiveAnswer: 'y' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('injected')
    const content = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(content).toContain('Delivery Loop') // first non-empty line of snippet
  })

  test('second invocation with default "N" returns mutated=false (no injection)', async () => {
    const ctx = { cwd, args: [], flags: { __interactiveAnswer: 'N' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toBe('')
    const content = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(content).not.toContain('Delivery Loop')
  })

  test('answer is case-insensitive: "Y" also injects', async () => {
    const ctx = { cwd, args: [], flags: { __interactiveAnswer: 'Y' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(true)
  })

  test('second invocation when section already-present returns mutated=false', async () => {
    // First answer 'y' injects.
    await deliveryLoopStep.run({ cwd, args: [], flags: { __interactiveAnswer: 'y' } })
    // Second answer 'y' should be no-op (idempotent).
    const report = await deliveryLoopStep.run({ cwd, args: [], flags: { __interactiveAnswer: 'y' } })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('already-present')
  })

  // 2026-05-21 (Luiz/dev): D4 attestation — Step 08 NAO contem dry-run guard.
  // Se ctx.flags['dry-run'] === true, comportamento deve ser identico (sem early-return).
  test('D4: dry-run flag is ignored — step still answers normally (no special branch)', async () => {
    const ctx = { cwd, args: [], flags: { 'dry-run': true, __interactiveAnswer: 'y' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(true) // would be false in v6.7 with dry-run guard
  })
})
