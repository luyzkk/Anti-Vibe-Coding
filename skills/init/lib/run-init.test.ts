// skills/init/lib/run-init.test.ts
import { describe, test, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { runInit } from './run-init'
import { AbortError } from './steps/abort-error'
import type { Step } from './steps/types'
import { generatePopulatePlanStep } from './steps/91-generate-populate-plan'
import { finalValidationStep } from './steps/90-final-validation'

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
    // 2026-05-18 (Luiz/dev): Plano 05 fase-01 — __dryRunRecorder injected alongside user flags.
    // Use partial match; exact toEqual would break with recorder present.
    expect(captured?.['dry-run']).toBe(true)
    expect(captured?.['mode']).toBe('fast')
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

  test('CA-07 convergencia: Step 91 PLAN.md persistido mesmo com warnings em Step 90', async () => {
    // 2026-05-19 (Luiz/dev): Plano 04 fase-04 — Bug C resolvido (Plano 01 fase-01 inverteu ordem).
    // Step 91 roda ANTES de Step 90. Warning em Step 90 NAO aborta. PLAN.md existe em disco.
    // Usa registry injetado com apenas [Step91, Step90] para isolar CA-07 sem pipeline completo.
    const cwd = path.join(os.tmpdir(), `ca07-${randomUUID()}`)
    try {
      await fs.mkdir(cwd, { recursive: true })
      // doc custom fora da allowlist — provoca warning no Step 90
      await fs.mkdir(path.join(cwd, 'docs', 'custom'), { recursive: true })
      await fs.writeFile(path.join(cwd, 'docs', 'custom', 'legitimo.md'), '# doc do usuario')

      const result = await runInit([], {
        registry: [generatePopulatePlanStep, finalValidationStep],
        cwd,
        log: () => {},
      })

      // Pipeline nao abortou (Step 90 emite warning, nao AbortError)
      expect(result.kind).toBe('ok')

      // Step 91 (rodou ANTES) deve ter gerado pasta populate-harness com PLAN.md
      const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
      const activeDirExists = await fs.access(activeDir).then(() => true).catch(() => false)
      expect(activeDirExists).toBe(true)

      const subdirs = await fs.readdir(activeDir)
      const harnessDir = subdirs.find(d => d.endsWith('-populate-harness'))
      expect(harnessDir).toBeDefined()

      const planExists = await fs
        .access(path.join(activeDir, harnessDir!, 'PLAN.md'))
        .then(() => true)
        .catch(() => false)
      expect(planExists).toBe(true)
    } finally {
      await fs.rm(cwd, { recursive: true, force: true })
    }
  })
})
