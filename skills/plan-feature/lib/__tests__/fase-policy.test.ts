import { describe, expect, test } from 'bun:test'
import * as path from 'path'
import {
  FASE_POLICY_BY_PROFILE,
  FASE_POLICY_V52,
  renderFasePolicyBlock,
  type FasePolicy,
} from '../fase-policy'
import type { ArchitectureProfileName } from '../../../lib/manifest-types'
import { readArchitectureProfile, getRecommendationForProfile } from '../../../lib/read-architecture-profile'

const FIXTURES_DIR = path.join(
  import.meta.dir,
  '../../../lib/__fixtures__/manifests',
)

/** Retrieve a policy by name, throwing if absent (test helper). */
function getPolicy(name: ArchitectureProfileName): FasePolicy {
  const p = FASE_POLICY_BY_PROFILE[name]
  if (p === undefined) throw new Error(`Missing policy for profile: ${name}`)
  return p
}

describe('FASE_POLICY_BY_PROFILE lookup', () => {
  test('has exactly 5 keys (G6)', () => {
    expect(Object.keys(FASE_POLICY_BY_PROFILE).length).toBe(5)
  })

  test('CA-05: vertical-slice granularidade mentions feature vertical', () => {
    expect(getPolicy('vertical-slice').granularidade).toMatch(/feature vertical/i)
  })

  test('CA-05: clean-architecture-ritual granularidade mentions camada', () => {
    expect(getPolicy('clean-architecture-ritual').granularidade).toMatch(/camada/i)
  })

  test('mvc-flat granularidade mentions controller/service/repository', () => {
    expect(getPolicy('mvc-flat').granularidade).toMatch(/controller|service|repository/i)
  })

  test('nextjs-app-router granularidade mentions rota', () => {
    expect(getPolicy('nextjs-app-router').granularidade).toMatch(/rota/i)
  })

  test('unknown-mixed falls back to v5.2 criterio', () => {
    expect(getPolicy('unknown-mixed').granularidade).toMatch(/v5\.2/i)
  })

  test('every policy has at least 1 item in evitar[]', () => {
    for (const policy of Object.values(FASE_POLICY_BY_PROFILE)) {
      expect(policy.evitar.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('CA-04 regression: flag off uses FASE_POLICY_V52', () => {
  test('FASE_POLICY_V52 is structurally identical to unknown-mixed entry', () => {
    expect(FASE_POLICY_V52.granularidade).toBe(getPolicy('unknown-mixed').granularidade)
  })
})

describe('renderFasePolicyBlock', () => {
  test('renders markdown with all 4 sections', () => {
    const block = renderFasePolicyBlock(getPolicy('vertical-slice'))
    expect(block).toMatch(/^### Política de fases/)
    expect(block).toMatch(/Granularidade:/)
    expect(block).toMatch(/Critério de fase atômica:/)
    expect(block).toMatch(/Exemplo de nome de fase:/)
    expect(block).toMatch(/Evitar:/)
  })

  test('renders evitar list with bullets', () => {
    const block = renderFasePolicyBlock(getPolicy('vertical-slice'))
    expect(block).toMatch(/^- /m)
  })
})

describe('CA-05 E2E', () => {
  test('vertical-slice profile produces fase policy mentioning feature vertical', () => {
    const manifestPath = path.join(FIXTURES_DIR, 'vertical-slice.json')
    const profile = readArchitectureProfile(manifestPath)
    const policy = getRecommendationForProfile(
      profile?.profile ?? null,
      FASE_POLICY_BY_PROFILE,
      FASE_POLICY_V52,
    )
    const block = renderFasePolicyBlock(policy)
    expect(block).toMatch(/1 fase = 1 feature vertical/)
  })

  test('flag-disabled manifest returns FASE_POLICY_V52 fallback (CA-04)', () => {
    const manifestPath = path.join(FIXTURES_DIR, 'flag-disabled.json')
    const profile = readArchitectureProfile(manifestPath)
    // flag disabled → readArchitectureProfile returns null → getRecommendationForProfile uses fallback
    const policy = getRecommendationForProfile(
      profile?.profile ?? null,
      FASE_POLICY_BY_PROFILE,
      FASE_POLICY_V52,
    )
    expect(policy.granularidade).toBe(FASE_POLICY_V52.granularidade)
  })
})
