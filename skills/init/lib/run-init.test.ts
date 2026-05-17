// skills/init/lib/run-init.test.ts
import { describe, test, expect } from 'bun:test'
import { runInit } from './run-init'
import { AbortError } from './steps/abort-error'
import type { Step } from './steps/types'

describe('runInit dispatcher', () => {
  test('executes all steps in order when none abort', async () => {
    const calls: string[] = []
    const stepA: Step = {
      id: 'a',
      async run() { calls.push('a'); return { mutated: false, summary: 'ok' } },
    }
    const stepB: Step = {
      id: 'b',
      async run() { calls.push('b'); return { mutated: false, summary: 'ok' } },
    }
    const result = await runInit([], { registry: [stepA, stepB], cwd: '/tmp', log: () => {} })
    expect(calls).toEqual(['a', 'b'])
    expect(result.kind).toBe('ok')
  })

  test('halts on AbortError and returns code + reason', async () => {
    const logs: string[] = []
    const stepA: Step = {
      id: 'a',
      async run() { throw new AbortError({ code: 7, reason: 'stop here' }) },
    }
    const stepB: Step = {
      id: 'b',
      async run() { throw new Error('should never run') },
    }
    const result = await runInit([], {
      registry: [stepA, stepB],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result).toEqual({ kind: 'aborted', code: 7, reason: 'stop here' })
    expect(logs).toContain('stop here')
  })

  test('parses flags into ctx', async () => {
    let captured: Readonly<Record<string, boolean | string>> | undefined
    const probe: Step = {
      id: 'probe',
      async run(ctx) { captured = ctx.flags; return { mutated: false, summary: '' } },
    }
    await runInit(['--dry-run', '--mode=fast'], { registry: [probe], cwd: '/tmp', log: () => {} })
    expect(captured).toEqual({ 'dry-run': true, mode: 'fast' })
  })

  test('re-throws non-AbortError (bug visibility)', async () => {
    const buggy: Step = { id: 'bug', async run() { throw new Error('boom') } }
    await expect(runInit([], { registry: [buggy], cwd: '/tmp', log: () => {} })).rejects.toThrow('boom')
  })

  test('accepts Windows-style cwd verbatim (no path mangling)', async () => {
    let seenCwd: string | undefined
    const probe: Step = {
      id: 'probe-cwd',
      async run(ctx) { seenCwd = ctx.cwd; return { mutated: false, summary: '' } },
    }
    // 2026-05-17 (Luiz/dev): cwd nao eh tocado pelo dispatcher — repassado ao step inalterado.
    // Isso garante que portar para Windows nao requer mudanca no dispatcher (DI-06 e sobre IMPORT,
    // nao sobre cwd, mas a confianca ajuda).
    await runInit([], { registry: [probe], cwd: 'C:\\Users\\luiz\\projeto', log: () => {} })
    expect(seenCwd).toBe('C:\\Users\\luiz\\projeto')
  })
})
