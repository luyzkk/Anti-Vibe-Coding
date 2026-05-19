// tests/snapshots/skill-init-final-message.test.ts
// 2026-05-19 (Luiz/dev): Plano 05 fase-03 — CA-11 snapshot test.
// RED: falha porque run-init.ts nao emite mensagem final com populatePlanPath ainda.
// GREEN: passa apos Passo 2 (run-init.ts) + Step 91 setarem __populatePlanPath.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import path from 'node:path'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'

const FIXTURE = path.join(import.meta.dir, '..', 'e2e', '__fixtures__', 'init-greenfield')

describe('SKILL.md final message — CA-11', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), 'final-msg-'))
    await cp(FIXTURE, tmp, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('final lines after greenfield runInit mention PLAN.md path + execute-plan command', async () => {
    const lines: string[] = []
    await runInit([], { cwd: tmp, log: (s: string) => lines.push(s) })

    const tail = lines.slice(-10).join('\n')
    expect(tail).toContain('Harness scaffold criado')
    expect(tail).toContain('/anti-vibe-coding:execute-plan')
    expect(tail).toMatch(/populate-harness/)
    expect(tail).toContain('PR')
  })

  it('does NOT invoke execute-plan or detect-architecture automatically', async () => {
    const lines: string[] = []
    await runInit([], { cwd: tmp, log: (s: string) => lines.push(s) })
    // Nenhuma linha indica execucao — apenas sugestao textual
    expect(lines.some((l) => l.startsWith('[execute-plan]'))).toBe(false)
    expect(lines.some((l) => l.startsWith('[detect-architecture]'))).toBe(false)
  })
})
