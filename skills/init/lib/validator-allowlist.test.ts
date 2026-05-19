// skills/init/lib/validator-allowlist.test.ts
// 2026-05-19 (Luiz/dev): RED — helper nao existe ainda. Plano 04 fase-03.
import { describe, it, expect } from 'bun:test'
import { TEMPLATE_MANIFEST } from './template-manifest'
import { buildAllowlistFromTemplateManifest, isAllowed, groupWarnings } from './validator-allowlist'

describe('buildAllowlistFromTemplateManifest', () => {
  const allowlist = buildAllowlistFromTemplateManifest()

  it('includes every TEMPLATE_MANIFEST dst', () => {
    for (const entry of TEMPLATE_MANIFEST) {
      expect(allowlist.exactPaths.has(entry.dst)).toBe(true)
    }
  })

  it('allows runtime paths under docs/exec-plans/active/', () => {
    expect(isAllowed('docs/exec-plans/active/2026-05-19-foo/PLAN.md', allowlist)).toBe(true)
    expect(isAllowed('docs/exec-plans/active/2026-05-19-foo/plano-populate-harness/fase-01.md', allowlist)).toBe(true)
  })

  it('allows compound imported lessons', () => {
    expect(isAllowed('docs/compound/_imported/2025-foo.md', allowlist)).toBe(true)
  })

  it('rejects unrelated docs/ files', () => {
    expect(isAllowed('docs/RANDOM.md', allowlist)).toBe(false)
  })
})

describe('groupWarnings', () => {
  it('groups by first two segments', () => {
    const out = groupWarnings([
      'docs/custom/a.md',
      'docs/custom/b.md',
      'docs/another/c.md',
    ])
    expect(out.length).toBe(2)
    const customGroup = out.find((g) => g.group === 'docs/custom')
    expect(customGroup?.paths.length).toBe(2)
  })
})
