// 2026-05-24 (Luiz/dev): unit tests CA-03 — funcao pura, deve passar < 50ms.

import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import fs from 'node:fs'
import { getCompoundManifest } from './manifest'

describe('getCompoundManifest', () => {
  const manifest = getCompoundManifest()

  test('retorna 10 entradas compound (PRD MH-04)', () => {
    expect(manifest).toHaveLength(10)
  })

  test('cada src e absoluto', () => {
    for (const entry of manifest) {
      expect(path.isAbsolute(entry.src)).toBe(true)
    }
  })

  test('cada src aponta para arquivo existente em skills/init/assets/templates', () => {
    for (const entry of manifest) {
      expect(fs.existsSync(entry.src)).toBe(true)
    }
  })

  test('cada dst e relativo (nao comeca com / nem drive letter)', () => {
    for (const entry of manifest) {
      expect(path.isAbsolute(entry.dst)).toBe(false)
    }
  })

  test('ordem deterministica entre chamadas', () => {
    const m2 = getCompoundManifest()
    expect(manifest.map(e => e.dst)).toEqual(m2.map(e => e.dst))
  })

  test('inclui os 10 dst esperados (D7 contract)', () => {
    const dsts = manifest.map(e => e.dst).sort()
    expect(dsts).toEqual([
      'docs/COMPOUND_ENGINEERING.md',
      'docs/compound/README.md',
      'docs/review-checklists/README.md',
      'docs/review-checklists/agent-api.md',
      'docs/review-checklists/frontend-ui.md',
      'docs/review-checklists/production-readiness.md',
      'docs/review-checklists/reliability.md',
      'docs/review-checklists/security.md',
      'docs/smoke-flows/README.md',
      'scripts/compound-check.ts',
    ].sort())
  })
})
