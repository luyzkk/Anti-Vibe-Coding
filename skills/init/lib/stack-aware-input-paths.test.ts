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
})
