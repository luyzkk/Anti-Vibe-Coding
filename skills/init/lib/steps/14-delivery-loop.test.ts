// skills/init/lib/steps/14-delivery-loop.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { deliveryLoopStep } from './14-delivery-loop'

describe('deliveryLoopStep', () => {
  let tmpDir: string
  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
  })

  test('primeiro invoke (sem __interactiveAnswer): retorna needsUser com prompt byte-identico', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-prompt-'))
    const r = await deliveryLoopStep.run({ cwd: tmpDir, args: [], flags: {} })
    expect(r.needsUser).toBeDefined()
    if (r.needsUser) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 372 (PRD R1, G1).
      // DOUBLE SPACE antes de '[y/N]' (preservado).
      expect(r.needsUser.prompt).toBe('Do you use Linear and want to enable the Delivery Loop convention?  [y/N]')
      expect(r.needsUser.options).toEqual(['y', 'N'])
    }
    expect(r.mutated).toBe(false)
  })

  test('segundo invoke com "N": no-op silencioso', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-N-'))
    await writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n')

    const r = await deliveryLoopStep.run({
      cwd: tmpDir,
      args: [],
      flags: { __interactiveAnswer: 'N' },
    })
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('segundo invoke com "y": injeta snippet em AGENTS.md', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-y-'))
    await writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n')

    const r = await deliveryLoopStep.run({
      cwd: tmpDir,
      args: [],
      flags: { __interactiveAnswer: 'y' },
    })

    expect(r.mutated).toBe(true)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 396 (PRD R1, G1).
    expect(r.summary).toBe('Delivery Loop injection: injected')

    const updated = await Bun.file(path.join(tmpDir, 'AGENTS.md')).text()
    expect(updated).toContain('<!-- INIT:DELIVERY_LOOP_SLOT -->')
    // 2026-05-17 (Luiz/dev): snippet foi injetado APOS o marker.
    expect(updated.length).toBeGreaterThan('# AGENTS\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n'.length)
  })

  test('segundo invoke com "y" + AGENTS.md sem marker: status marker-missing', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-nomark-'))
    await writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n\n(no marker here)\n')

    const r = await deliveryLoopStep.run({
      cwd: tmpDir,
      args: [],
      flags: { __interactiveAnswer: 'y' },
    })
    expect(r.summary).toBe('Delivery Loop injection: marker-missing')
    expect(r.mutated).toBe(false)
  })
})
