// skills/_shared/legacy-manifest-schema.test.ts
// 2026-05-21 (Luiz/dev): RED-GREEN cobertura do schema Zod do legacy-manifest.json (DR-5).
import { expect, test, describe } from 'bun:test'
import { LegacyManifestSchema, parseLegacyManifest } from './legacy-manifest-schema'

describe('LegacyManifestSchema', () => {
  test('parse OK em greenfield (legacy: [])', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.legacy).toHaveLength(0)
    expect(parsed.stack.primary).toBe('node-ts')
  })

  test('parse OK com entry planning moved', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'rails', confidence: 'high' },
      legacy: [
        {
          type: 'planning',
          found: true,
          sourcePath: '.claude/planning/',
          migratedTo: 'docs/specs/',
          action: 'moved',
        },
      ],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.legacy[0]?.action).toBe('moved')
    expect(parsed.legacy[0]?.migratedTo).toBe('docs/specs/')
  })

  test('parse OK com entry claude-md preserved + lines count', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [
        {
          type: 'claude-md',
          found: true,
          sourcePath: '.claude/CLAUDE.md',
          action: 'preserved',
          lines: 533,
        },
      ],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.legacy[0]?.lines).toBe(533)
  })

  test('parse OK com stack.primary: null (fallback)', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: null, confidence: 'low' },
      legacy: [],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.stack.primary).toBeNull()
  })

  test('parse FAIL com schemaVersion errado', () => {
    const input = {
      schemaVersion: '2.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })

  test('parse FAIL sem detectedAt', () => {
    const input = {
      schemaVersion: '1.0',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })

  test('parse FAIL com lines negativo', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [
        {
          type: 'claude-md',
          found: true,
          sourcePath: '.claude/CLAUDE.md',
          action: 'preserved',
          lines: -1,
        },
      ],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })

  test('parse FAIL com type fora do enum', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [
        {
          type: 'invalid-type',
          found: true,
          sourcePath: 'foo',
          action: 'moved',
        },
      ],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })
})
