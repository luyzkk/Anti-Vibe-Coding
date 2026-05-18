// skills/init/lib/steps/00-detect-legacy.test.ts
// 2026-05-17 (Luiz/dev): golden tests — byte-identical wording check (PRD R1, G1 do plano).
import { describe, test, expect } from 'bun:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { detectLegacyStep } from './00-detect-legacy'
import { AbortError } from './abort-error'

const FIX = path.join(import.meta.dir, '__fixtures__')
const GOLDEN = path.join(import.meta.dir, '__golden__')

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('detectLegacyStep', () => {
  test('greenfield: returns summary, no abort', async () => {
    const report = await detectLegacyStep.run(ctx(path.join(FIX, 'greenfield')))
    expect(report).toEqual({
      mutated: false,
      summary: 'Greenfield project — proceeding with scaffold.',
    })
    const golden = (await readFile(path.join(GOLDEN, 'detect-legacy-greenfield.txt'), 'utf8')).trimEnd()
    expect(report.summary).toBe(golden)
  })

  test('legacy: throws AbortError code 1 with byte-identical reason', async () => {
    try {
      await detectLegacyStep.run(ctx(path.join(FIX, 'legacy')))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      if (e instanceof AbortError) {
        expect(e.code).toBe(1)
        const golden = (await readFile(path.join(GOLDEN, 'detect-legacy-legacy.txt'), 'utf8')).trimEnd()
        expect(e.reason).toBe(golden)
      }
    }
  })

  test('partial migration: throws AbortError code 2 with byte-identical reason', async () => {
    try {
      await detectLegacyStep.run(ctx(path.join(FIX, 'partial')))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      if (e instanceof AbortError) {
        expect(e.code).toBe(2)
        const golden = (await readFile(path.join(GOLDEN, 'detect-legacy-partial.txt'), 'utf8')).trimEnd()
        expect(e.reason).toBe(golden)
      }
    }
  })

  // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — bug 1 (cross-upgrade misreported as Greenfield).
  // Fixture v6-manifest tem .claude/.anti-vibe-manifest.json com pluginVersion 6.3.2 e nao tem
  // artefatos v5 nem docs/exec-plans/. Antes do fix: retornava "Greenfield" enganoso. Apos: sinaliza cross-upgrade.
  test('v6.x manifest present without v5 artifacts: returns cross-upgrade summary, no abort', async () => {
    const report = await detectLegacyStep.run(ctx(path.join(FIX, 'v6-manifest')))
    expect(report.mutated).toBe(false)
    expect(report.summary).not.toContain('Greenfield')
    expect(report.summary).toContain('cross-upgrade')
    expect(report.summary).toContain('6.3.2')
  })
})
