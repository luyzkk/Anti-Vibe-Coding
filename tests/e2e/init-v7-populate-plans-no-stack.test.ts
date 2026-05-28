// tests/e2e/init-v7-populate-plans-no-stack.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — DR-2 abort em projeto sem stack.
// 2026-05-28 (Luiz/dev): bug fix /init greenfield — gate DR-2 trocou de hard abort
// para contrato needsUser. Testes ajustados:
//   - askUser='a' (abort) → runInit retorna { kind: 'aborted', code: 20 }
//   - askUser='s' (skip)  → runInit completa sem aborto, zero populate-plans criados
//   - --skip-populate-plan flag → mesmo comportamento de 's' sem prompt
// ABORT_MESSAGE_NO_STACK preservado byte-identical (testes unit em 07.test.ts validam).

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'

describe('e2e: init v7 generate-populate-plans (greenfield gate — no stack)', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await copyFixtureToTmp('v7-populate-no-stack')
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('user picks "a": runInit returns aborted with code 20', async () => {
    const askUser = async () => 'a'
    const result = await runInit([], { cwd, askUser })
    expect(result.kind).toBe('aborted')
    if (result.kind === 'aborted') {
      expect(result.code).toBe(20)
      expect(result.reason).toContain('detect-architecture')
      expect(result.reason).toContain('Detected primary: null')
    }
  })

  test('user picks "s": runInit completes ok and no populate-plans written', async () => {
    const askUser = async () => 's'
    const result = await runInit([], { cwd, askUser })
    expect(result.kind).toBe('ok')

    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    let entries: string[] = []
    try {
      entries = await fs.readdir(activeDir)
    } catch { /* dir may not exist */ }
    const populateDirs = entries.filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(0)
  })

  test('--skip-populate-plan flag: same as "s" without asking', async () => {
    // askUser nao injetado — flag de CI tem prioridade e pula sem prompt
    const result = await runInit(['--skip-populate-plan'], { cwd })
    expect(result.kind).toBe('ok')

    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    let entries: string[] = []
    try {
      entries = await fs.readdir(activeDir)
    } catch { /* dir may not exist */ }
    const populateDirs = entries.filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(0)
  })
})
