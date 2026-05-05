import { describe, expect, test } from 'bun:test'
import {
  ARCHITECTURE_RECOMMENDATIONS,
  DEFAULT_RECOMMENDATION_V52,
  GREENFIELD_RECOMMENDATION,
  isGreenfield,
} from '../architecture-recommendations'

describe('ARCHITECTURE_RECOMMENDATIONS lookup', () => {
  test('has exactly 5 keys (G6 — D4 of PRD)', () => {
    expect(Object.keys(ARCHITECTURE_RECOMMENDATIONS).length).toBe(5)
  })

  test('all 5 profiles produce distinct headlines', () => {
    const headlines = Object.values(ARCHITECTURE_RECOMMENDATIONS).map((r) => r.headline)
    expect(new Set(headlines).size).toBe(5)
  })

  test('vertical-slice headline mentions isolamento por feature', () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(ARCHITECTURE_RECOMMENDATIONS['vertical-slice']!.headline).toMatch(/feature/i)
  })

  test('clean-architecture-ritual headline mentions camadas', () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(ARCHITECTURE_RECOMMENDATIONS['clean-architecture-ritual']!.headline).toMatch(/camada/i)
  })

  test('every profile has at least 1 pattern and 1 caveat', () => {
    for (const rec of Object.values(ARCHITECTURE_RECOMMENDATIONS)) {
      expect(rec.patterns.length).toBeGreaterThanOrEqual(1)
      expect(rec.caveats.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('isGreenfield (CA-06)', () => {
  test('returns true when profile is unknown-mixed AND src has < 5 files', () => {
    expect(isGreenfield('unknown-mixed', 0)).toBe(true)
    expect(isGreenfield('unknown-mixed', 4)).toBe(true)
  })

  test('returns false when src has 5+ files even with unknown-mixed', () => {
    expect(isGreenfield('unknown-mixed', 5)).toBe(false)
    expect(isGreenfield('unknown-mixed', 100)).toBe(false)
  })

  test('returns false for any non-unknown-mixed profile', () => {
    expect(isGreenfield('vertical-slice', 0)).toBe(false)
    expect(isGreenfield('clean-architecture-ritual', 0)).toBe(false)
  })

  test('returns false when profile is null (flag off)', () => {
    expect(isGreenfield(null, 0)).toBe(false)
  })
})

describe('CA-04 regression: flag off uses DEFAULT_RECOMMENDATION_V52', () => {
  test('default recommendation has v5.2 marker in rationale', () => {
    expect(DEFAULT_RECOMMENDATION_V52.rationale).toMatch(/v5\.2/i)
  })

  test('GREENFIELD differs from DEFAULT (Greenfield is opinionated)', () => {
    expect(GREENFIELD_RECOMMENDATION.headline).not.toBe(DEFAULT_RECOMMENDATION_V52.headline)
  })
})
