import { describe, test, expect } from 'bun:test'
import { runPersistStackKnowledgeStep, persistStackKnowledgeStep } from './03_1-persist-stack-and-knowledge'
import type { RunStackKnowledgeInitOpts, RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'

// 2026-05-17 (Luiz/dev): DEV-1 — stub usa RunStackKnowledgeInitResult real:
// { stackPrimary, stackJsonMessage, copyResult, previewEmitted }.
// Plano usava shape errado { stackPersisted, knowledgeCopied } — corrigido apos leitura de:
// run-stack-knowledge-init.ts + copy-knowledge.ts (CopyKnowledgeResult: { status, atomCount, message, destDir }).
// runStackKnowledgeInit emite console.log internamente (Wave 5 D2) — summary vazia e correto.

const stubResult: RunStackKnowledgeInitResult = {
  stackPrimary: 'nextjs',
  stackJsonMessage: 'stack.json written. primary = nextjs',
  copyResult: {
    status: 'copied',
    atomCount: 0,
    message: 'Knowledge copied',
    destDir: '/tmp/.claude/knowledge',
  },
  previewEmitted: false,
}

describe('persistStackKnowledgeStep', () => {
  test('passes joined args to runner', async () => {
    let seenOpts: RunStackKnowledgeInitOpts | undefined
    const stub = async (opts: RunStackKnowledgeInitOpts): Promise<RunStackKnowledgeInitResult> => {
      seenOpts = opts
      return stubResult
    }
    await runPersistStackKnowledgeStep({ cwd: '/tmp', args: ['--refresh-knowledge'] }, stub, '/plugin-root')
    expect(seenOpts?.args).toBe('--refresh-knowledge')
  })

  test('summary is empty (orchestrator emits its own logs)', async () => {
    const stub = async (_opts: RunStackKnowledgeInitOpts): Promise<RunStackKnowledgeInitResult> => stubResult
    const r = await runPersistStackKnowledgeStep({ cwd: '/tmp', args: [] }, stub, '/plugin-root')
    expect(r.summary).toBe('')
    expect(r.mutated).toBe(true)
  })

  // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 — dry-run guard no wrapper.
  // Garante que ctx.flags['dry-run'] === true skipa o orquestrador (zero escrita em disco).
  test('dry-run guard: skips orchestrator and reports mutated=false', async () => {
    const ctx = {
      cwd: '/tmp',
      args: [] as readonly string[],
      flags: { 'dry-run': true } as Readonly<Record<string, boolean | string>>,
    }
    const r = await persistStackKnowledgeStep.run(ctx)
    expect(r.mutated).toBe(false)
    expect(r.summary).toContain('dry-run')
  })
})
