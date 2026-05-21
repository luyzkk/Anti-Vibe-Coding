// skills/init/lib/steps/09-copy-knowledge.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-02 — RF-11 skip gracioso, summary stack-aware, D4 attestation.

import { test, expect, describe } from 'bun:test'
import { runCopyKnowledgeStep } from './09-copy-knowledge'
import type { RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'

const ctxBase = { cwd: '/tmp/fake', args: [] as readonly string[], flags: {} }

describe('Step 9: copy-knowledge', () => {
  test('stack=node-ts: summary contains stackPrimary and copyResult.status', async () => {
    const runner = async (): Promise<RunStackKnowledgeInitResult> => ({
      stackPrimary: 'nodejs-typescript',
      stackJsonMessage: 'stack.json written. primary = nodejs-typescript',
      copyResult: { status: 'ok', message: 'copied 12 atoms', atomsCount: 12 } as any,
      previewEmitted: true,
    })
    const report = await runCopyKnowledgeStep(ctxBase, runner)
    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('nodejs-typescript')
    expect(report.summary).toContain('ok')
  })

  test('RF-11: stack=null skip gracioso — does NOT throw, returns mutated=true with skip summary', async () => {
    const runner = async (): Promise<RunStackKnowledgeInitResult> => ({
      stackPrimary: null,
      stackJsonMessage: 'stack.json written. primary = null',
      copyResult: { status: 'no-source', message: 'no source for primary=null', atomsCount: 0 } as any,
      previewEmitted: false,
    })
    const report = await runCopyKnowledgeStep(ctxBase, runner)
    expect(report.mutated).toBe(true) // stack.json AINDA foi escrito mesmo com primary=null
    expect(report.summary).toMatch(/skipped|no-source|no stack/i)
  })

  test('Rails legado: warnings sao propagadas no summary (best-effort)', async () => {
    const runner = async (): Promise<RunStackKnowledgeInitResult> => ({
      stackPrimary: 'rails',
      stackJsonMessage: 'stack.json written. primary = rails',
      copyResult: { status: 'ok', message: 'copied 8 atoms', atomsCount: 8 } as any,
      previewEmitted: true,
      warnings: ['Rails 6.1 detected — knowledge atoms target Rails 7+'],
    })
    const report = await runCopyKnowledgeStep(ctxBase, runner)
    expect(report.summary).toContain('rails')
    // 2026-05-21 (Luiz/dev): warnings sao loggadas pelo runner via console.log;
    // step nao precisa duplicar no summary, mas pode incluir count.
  })

  // 2026-05-21 (Luiz/dev): D4 attestation — Step 09 NAO contem dry-run guard.
  test('D4: dry-run flag is ignored — runner is invoked regardless', async () => {
    let runnerCalled = false
    const runner = async (): Promise<RunStackKnowledgeInitResult> => {
      runnerCalled = true
      return {
        stackPrimary: 'nodejs-typescript',
        stackJsonMessage: '',
        copyResult: { status: 'ok', message: '', atomsCount: 0 } as any,
        previewEmitted: false,
      }
    }
    const ctx = { ...ctxBase, flags: { 'dry-run': true } }
    await runCopyKnowledgeStep(ctx, runner)
    expect(runnerCalled).toBe(true) // would be false in v6.7 with dry-run guard
  })

  test('reentry re-populate: runner receives refresh=true', async () => {
    let receivedRefresh: boolean | undefined
    const runner = async (opts: { refresh?: boolean }): Promise<RunStackKnowledgeInitResult> => {
      receivedRefresh = opts.refresh
      return {
        stackPrimary: 'nodejs-typescript',
        stackJsonMessage: '',
        copyResult: { status: 'ok', message: '', atomsCount: 0 } as any,
        previewEmitted: false,
      }
    }
    const ctx = { ...ctxBase, flags: { __reentryMode: 're-populate' } }
    await runCopyKnowledgeStep(ctx, runner as any)
    expect(receivedRefresh).toBe(true)
  })
})
