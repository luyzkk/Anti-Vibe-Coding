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
    // 2026-05-20 (Luiz/dev): @ts-expect-error intencional — modulo nao existe por design,
    // tipo TS2307 e o sinal de "import deve falhar em runtime" (resolver-quick-plan).
    // @ts-expect-error intentional missing module — tests lazyImport error propagation
    await expect(lazyImport(() => import('./does-not-exist-xyz'))).rejects.toThrow()
  })

  test('relative path works (the contract we promise)', async () => {
    // 2026-05-17 (Luiz/dev): GT-04 — sempre path relativo dentro do helper. Se algum chamador
    // passar absoluto (`/abs/...` ou `C:\\abs\\...`), o quebrar eh aceitavel porque viola contrato.
    const mod = await lazyImport(() => import('./parse-flags'))
    expect(typeof mod.parseFlags).toBe('function')
  })
})
