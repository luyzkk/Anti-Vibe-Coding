// skills/init/lib/stack-aware-input-paths.test.ts
import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { stackAwareInputPaths } from './stack-aware-input-paths'

const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'stack-aware')

describe('stackAwareInputPaths', () => {
  it('returns Next.js + Supabase paths with >= 3 reais em ARCHITECTURE (CA-02)', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
    const arch = result.get('ARCHITECTURE.md') ?? []
    const real = arch.filter(p => p.exists)
    expect(real.length).toBeGreaterThanOrEqual(3)
  })

  it('flags inexistent paths with exists: false + note', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'nextjs')
    for (const entries of result.values()) {
      for (const entry of entries) {
        if (!entry.exists) {
          expect(entry.note).toBeDefined()
          expect(entry.note).toContain('candidato nao encontrado')
        }
      }
    }
  })

  it('returns Rails-specific paths when primary is rails', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'rails'), 'rails')
    const arch = result.get('ARCHITECTURE.md') ?? []
    const paths = arch.map(p => p.path)
    expect(paths).toContain('config/routes.rb')
  })

  it('returns generic paths when primary is null', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), null)
    expect(result.has('ARCHITECTURE.md')).toBe(true)
  })

  it('does NOT include Supabase paths when primary is nextjs but no supabase signal', async () => {
    // empty fixture has no supabase/ dir and no package.json with @supabase — signal fails
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'nextjs')
    const arch = result.get('ARCHITECTURE.md') ?? []
    const paths = arch.map(p => p.path)
    expect(paths).not.toContain('supabase/migrations/')
  })

  // 2026-05-20 (Luiz/dev): Plano 04 fase-01 do PRD populate-plan-andre-port (MH-4 / CA-02).
  // CA-02 ja cobria ARCHITECTURE — espelhamos para SECURITY e RELIABILITY com mesmo limite.
  it('returns Next.js + Supabase paths with >= 3 reais em SECURITY (CA-02)', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
    const sec = result.get('docs/SECURITY.md') ?? []
    const real = sec.filter(p => p.exists)
    expect(real.length).toBeGreaterThanOrEqual(3)
  })

  it('returns Next.js + Supabase paths with >= 3 reais em RELIABILITY (CA-02)', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
    const rel = result.get('docs/RELIABILITY.md') ?? []
    const real = rel.filter(p => p.exists)
    expect(real.length).toBeGreaterThanOrEqual(3)
  })

  it('cobre 8 docs canonicos novos em NEXTJS_CANDIDATES (MH-4 expansion)', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
    const docsCobertos = Array.from(result.keys())
    // 2026-05-20 (Luiz/dev): Plano 04 fase-01 — cobertura de 8 docs novos. Plano 01 ja adicionou
    // PRODUCT_SENSE e README ao CanonicalDoc; aqui validamos que entries existem no map.
    const docsEsperados = [
      'AGENTS.md',
      'CLAUDE.md',
      'docs/PRODUCT_SENSE.md',
      'docs/PLANS.md',
      'docs/QUALITY_SCORE.md',
      'docs/STATE.md',
      'docs/design-docs/core-beliefs.md',
      'README.md',
    ] as const
    for (const doc of docsEsperados) {
      expect(docsCobertos).toContain(doc)
    }
  })

  // 2026-05-20 (Luiz/dev): Plano 04 fase-02 do PRD populate-plan-andre-port (MH-4).
  // Cobertura analoga ao test de fase-01 — cada stack expoe os 8 docs novos canonicos.
  it('Rails cobre 6 docs canonicos novos em RAILS_CANDIDATES', async () => {
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'rails'), 'rails')
    const docsCobertos = Array.from(result.keys())
    const docsEsperados = [
      'AGENTS.md',
      'CLAUDE.md',
      'docs/PRODUCT_SENSE.md',
      'docs/PLANS.md',
      'docs/QUALITY_SCORE.md',
      'docs/STATE.md',
      'docs/design-docs/core-beliefs.md',
      'README.md',
    ] as const
    for (const doc of docsEsperados) {
      expect(docsCobertos).toContain(doc)
    }
  })

  it('Node-TS cobre 6 docs canonicos novos em NODE_TS_CANDIDATES', async () => {
    // 2026-05-20 (Luiz/dev): nao temos fixture node-ts dedicado — reusamos `empty` com
    // primary='node-ts'. `exists` ficara `false` em todos os paths (sem arquivos no fixture).
    // O teste valida apenas COBERTURA DE KEYS, nao existencia de arquivos.
    const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'node-ts')
    const docsCobertos = Array.from(result.keys())
    const docsEsperados = [
      'AGENTS.md',
      'CLAUDE.md',
      'docs/PRODUCT_SENSE.md',
      'docs/PLANS.md',
      'docs/QUALITY_SCORE.md',
      'docs/STATE.md',
      'docs/design-docs/core-beliefs.md',
      'README.md',
    ] as const
    for (const doc of docsEsperados) {
      expect(docsCobertos).toContain(doc)
    }
  })
})
