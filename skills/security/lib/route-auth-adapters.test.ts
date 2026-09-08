// 2026-09-06 (Luiz/dev): registro por StackId — Plano 04 fase-04 (DP-8/DP-12).
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { ADAPTERS, SKIP_REASONS, selectAdapters } from './route-auth-adapters'
import type { DetectedStack } from '../../init/lib/detect-stack'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')
const detected = (primary: DetectedStack['primary'], secondary: DetectedStack['secondary'] = []): DetectedStack => ({ primary, secondary, signalSource: 'test', anchorFiles: [] })

describe('ADAPTERS (DP-8 — registro por StackId)', () => {
  it('registers nextjs, rails, node-ts and python, and nothing for react or laravel', () => {
    expect(Object.keys(ADAPTERS).sort()).toEqual(['nextjs', 'node-ts', 'python', 'rails'])
    expect(ADAPTERS.react).toBeUndefined()
    expect(ADAPTERS.laravel).toBeUndefined()
  })
  it('keeps the invariant that every entry adapter reports the stack it is registered under', () => {
    for (const [stack, entry] of Object.entries(ADAPTERS)) expect(stack).toBe(entry.adapter.stack)
  })
})

describe('selectAdapters (primary first, then secondary; skipped always carries a reason)', () => {
  it('orders primary before secondary and dedupes', () => {
    const { selected } = selectAdapters(detected('nextjs', ['rails', 'nextjs']), join(FIXTURES, 'monorepo-next-rails'))
    expect(selected.map((s) => s.stack)).toEqual(['nextjs', 'rails'])
  })
  // 2026-09-06 (Luiz/dev): DP-12 / G8 — todo Next traz node-ts; sem express, pular COM razao.
  it('skips node-ts without express with a reason, and selects it when express is a dependency', () => {
    const without = selectAdapters(detected('nextjs', ['node-ts']), join(FIXTURES, 'nextjs-minimal'))
    expect(without.selected.map((s) => s.stack)).toEqual(['nextjs'])
    expect(without.skipped).toEqual([{ stack: 'node-ts', reason: SKIP_REASONS['node-ts'] ?? 'MISSING' }])
    const withExpress = selectAdapters(detected('node-ts'), join(FIXTURES, 'express-minimal'))
    expect(withExpress.selected.map((s) => s.stack)).toEqual(['node-ts'])
  })
  it('skips react and laravel with their reasons instead of silently dropping them', () => {
    const { selected, skipped } = selectAdapters(detected('react', ['laravel']), FIXTURES)
    expect(selected).toEqual([])
    expect(skipped.map((s) => s.reason)).toEqual(['react: SPA sem rotas de servidor nesta versao', 'laravel: sem adaptador nesta versao'])
  })
  it('reports "nenhuma stack detectada" when primary is null', () => {
    expect(selectAdapters(detected(null), FIXTURES).skipped).toEqual([{ stack: 'none', reason: 'nenhuma stack detectada — sem manifest reconhecido na raiz (DP-13: monorepo por subdiretorio fora desta versao)' }])
  })
})
