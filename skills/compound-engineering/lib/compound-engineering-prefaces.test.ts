// 2026-05-24 (Luiz/dev): testes do stub de prefaces — CA-03 fase-01.
// Verifica que os exports existem e tem os tipos corretos (tabela de dados, sem logica).

import { describe, test, expect } from 'bun:test'
import {
  COMPOUND_ENGINEERING_PREFACE_BY_PROFILE,
  DEFAULT_COMPOUND_ENGINEERING_PREFACE,
} from './compound-engineering-prefaces'

describe('compound-engineering-prefaces', () => {
  test('COMPOUND_ENGINEERING_PREFACE_BY_PROFILE e um objeto', () => {
    expect(typeof COMPOUND_ENGINEERING_PREFACE_BY_PROFILE).toBe('object')
    expect(COMPOUND_ENGINEERING_PREFACE_BY_PROFILE).not.toBeNull()
  })

  test('DEFAULT_COMPOUND_ENGINEERING_PREFACE e string vazia (comportamento v6.2 CA-02)', () => {
    expect(DEFAULT_COMPOUND_ENGINEERING_PREFACE).toBe('')
  })
})
