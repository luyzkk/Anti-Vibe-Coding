// tests/e2e/init-v7-populate-plans-no-stack.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — DR-2 abort em projeto sem stack.
//
// NOTA DE IMPLEMENTACAO (DI-Plano04-fase05-no-throw):
// runInit() captura AbortError internamente e retorna { kind: 'aborted', code, reason }.
// NAO lanca AbortError para o caller — o spec original usava try/catch com toBeInstanceOf,
// mas o contrato de run-init.ts e retornar StepResult. Ajustado para verificar o retorno.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'
import { ABORT_MESSAGE_NO_STACK } from '../../skills/init/lib/steps/07-generate-populate-plans'

describe('e2e: init v7 generate-populate-plans (DR-2 — no stack)', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await copyFixtureToTmp('v7-populate-no-stack')
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('DR-2: runInit returns aborted with code 20 when no stack detected', async () => {
    const result = await runInit([], { cwd })
    expect(result.kind).toBe('aborted')
    if (result.kind === 'aborted') {
      expect(result.code).toBe(20)
      expect(result.reason).toContain('detect-architecture')
      expect(result.reason).toContain('Detected primary: null')
    }
  })

  test('DR-2: zero PLAN.md files written before abort', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    let entries: string[] = []
    try {
      entries = await fs.readdir(activeDir)
    } catch {
      // dir may not exist — that is also a valid "no plans" state
    }
    const populateDirs = entries.filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(0)
  })
})
