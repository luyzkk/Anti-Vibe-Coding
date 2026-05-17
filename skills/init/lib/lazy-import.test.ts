// skills/init/lib/lazy-import.test.ts
import { describe, test, expect } from 'bun:test'
import { lazyImport } from './lazy-import'

describe('lazyImport', () => {
  test('returns the module exports', async () => {
    // Importa o proprio modulo de tipos — sabidamente carregavel.
    const mod = await lazyImport(() => import('./steps/types'))
    expect(mod).toBeDefined()
  })

  test('propagates import errors', async () => {
    // 2026-05-17 (Luiz/dev): forca erro com path inexistente — sem barras invertidas para
    // nao confundir o resolver; o objetivo eh comportamento do helper, nao do FS.
    await expect(lazyImport(() => import('./does-not-exist-xyz'))).rejects.toThrow()
  })

  test('relative path works (the contract we promise)', async () => {
    // 2026-05-17 (Luiz/dev): GT-04 — sempre path relativo dentro do helper. Se algum chamador
    // passar absoluto (`/abs/...` ou `C:\\abs\\...`), o quebrar eh aceitavel porque viola contrato.
    const mod = await lazyImport(() => import('./parse-flags'))
    expect(typeof mod.parseFlags).toBe('function')
  })
})
