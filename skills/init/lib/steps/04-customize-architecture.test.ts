// skills/init/lib/steps/04-customize-architecture.test.ts
// 2026-05-17 (Luiz/dev): DEV-1 — helper customizeArchitecture throws if ARCHITECTURE.md absent
// (fs.readFile sem try/catch). Plan assumia que helper era tolerante. G2 do plano: se helper lanca,
// eh bug do helper — step propaga, nao patch aqui. Segundo teste ajustado para expect throw.
// Marker real: <!-- INIT:STACK_BLOCK --> (nao INIT:DETECTED_STACK_SLOT como mencionado no plano).
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, cp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { customizeArchitectureStep } from './04-customize-architecture'

const FIX = path.join(import.meta.dir, '__fixtures__')
const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('customizeArchitectureStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('nextjs fixture: summary byte-identical to SKILL.md line 349 with written=true', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'customize-test-'))
    await cp(path.join(FIX, 'customize-with-architecture'), tmpDir, { recursive: true })

    const report = await customizeArchitectureStep.run(ctx(tmpDir))
    // 2026-05-17 (Luiz/dev): wording byte-identico — em-dash U+2014, written boolean literal.
    // written=true porque ARCHITECTURE.md tem marker <!-- INIT:STACK_BLOCK -->.
    expect(report.summary).toBe('ARCHITECTURE.md customized for nextjs \u2014 written: true')
    expect(report.mutated).toBe(true)
  })

  test('without ARCHITECTURE.md: step propagates throw from helper (G2 — helper nao tolerante)', async () => {
    // 2026-05-17 (Luiz/dev): customizeArchitecture chama fs.readFile sem try/catch.
    // Ausencia de ARCHITECTURE.md causa throw. G2: nao patchamos o helper — step propaga.
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'customize-empty-'))
    // tmpDir vazio — sem ARCHITECTURE.md
    await expect(customizeArchitectureStep.run(ctx(tmpDir))).rejects.toThrow()
  })
})
