// 2026-05-24 (Luiz/dev): contrato de tipo para PatchResult — modulo neutro sem dependencias cruzadas

import { describe, it, expect } from 'bun:test'
import type { PatchResult } from './patch-types'

describe('PatchResult contract', () => {
  it('aceita status patched e message string', () => {
    const r: PatchResult = { status: 'patched', message: 'ok' }
    expect(r.status).toBe('patched')
    expect(typeof r.message).toBe('string')
  })

  it('aceita todos os status validos sem erro de tipo', () => {
    const statuses: PatchResult['status'][] = ['patched', 'already-present', 'created', 'appended']
    expect(statuses).toHaveLength(4)
    for (const s of statuses) {
      const r: PatchResult = { status: s, message: `msg-${s}` }
      expect(r.status).toBe(s)
    }
  })
})
