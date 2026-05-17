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
})
