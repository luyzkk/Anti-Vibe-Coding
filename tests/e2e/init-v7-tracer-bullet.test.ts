// tests/e2e/init-v7-tracer-bullet.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-06 — tracer bullet do init v7.
// Prova que o pipeline novo (registry com 10 entries — D12 revisada por DV-1+DV-3)
// executa ponta-a-ponta em greenfield. Steps 1-2 reais; outros 8 stubs.
// RED pulado (fase-04 ja commitada): executamos direto no GREEN. Decisao: DI-Plano01-fase06-red-pulado.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { cpSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runInit } from '../../skills/init/lib/run-init'

describe('init v7 tracer bullet (Plano 01 fase-06)', () => {
  let cwd: string
  const logs: string[] = []

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'init-v7-tracer-'))
    cpSync(
      path.join(import.meta.dir, '__fixtures__', 'init-v7-greenfield'),
      cwd,
      { recursive: true },
    )
    logs.length = 0
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  test('greenfield: 10 steps executam em ordem D12 revisada, exit 0', async () => {
    const result = await runInit([], {
      cwd,
      log: (line: string) => logs.push(line),
    })

    // 1. Exit ok (gate nao dispara em greenfield)
    expect(result.kind).toBe('ok')

    // 2. Ordem dos 10 steps no log (cada step emite `[<id>] <summary>`)
    const stepLogPattern = /^\[([^\]]+)\]/
    const stepIds = logs
      .map(l => l.match(stepLogPattern)?.[1])
      .filter((id): id is string => id !== undefined)
      .filter((id, i, arr) => arr[i - 1] !== id || i === 0)

    expect(stepIds).toEqual([
      'reentry-gate',
      'detect-legacy-and-stack',
      'secrets-scan',
      'migrate-planning-and-manifest',
      'scaffold-and-link',
      'install-gh-files',
      'generate-populate-plans',
      'delivery-loop',
      'copy-knowledge',
      'final-validation',
    ])

    // 3. Step 1 (gate) passou silencioso em greenfield
    const gateLog = logs.find(l => l.startsWith('[reentry-gate]'))
    expect(gateLog).toContain('no prior manifest')

    // 4. Step 2 (detect) detectou stack node-ts
    const detectLog = logs.find(l => l.startsWith('[detect-legacy-and-stack]'))
    expect(detectLog).toContain('stack=node-ts')
    expect(detectLog).toContain('no legacy artifacts')
  })

  test('legacy-manifest.json minimo eh escrito quando Step 4 (migrate) estiver real (Plano 02). Por ora: TODO', () => {
    // 2026-05-21 (Luiz/dev): este sub-teste e o gancho para Plano 02 endurecer.
    // Aqui apenas documenta a intencao. Plano 02 fase-final substitui pela assercao real:
    //   expect(existsSync(path.join(cwd, '.claude', 'legacy-manifest.json'))).toBe(true)
    //   const manifest = JSON.parse(readFileSync(path.join(cwd, '.claude', 'legacy-manifest.json'), 'utf-8'))
    //   expect(manifest.legacy).toEqual([])
    expect(true).toBe(true) // placeholder ate Plano 02 implementar Step 4
  })

  test('re-run em projeto ja inicializado: aborta com code=10 (DR-1, DV-3)', async () => {
    // simular manifest pre-existente — Step 1 (gate) deve abortar antes do Step 2
    const fs = await import('node:fs/promises')
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude', 'legacy-manifest.json'),
      JSON.stringify({ schemaVersion: '1.0', legacy: [] }),
    )

    const result = await runInit([], {
      cwd,
      log: (line: string) => logs.push(line),
    })

    expect(result.kind).toBe('aborted')
    if (result.kind === 'aborted') {
      expect(result.code).toBe(10)
      expect(result.reason).toContain('already initialized')
    }

    // Gate aborta ANTES de qualquer outro step rodar — log do detect NAO existe
    const detectLog = logs.find(l => l.startsWith('[detect-legacy-and-stack]'))
    expect(detectLog).toBeUndefined()
  })
})
