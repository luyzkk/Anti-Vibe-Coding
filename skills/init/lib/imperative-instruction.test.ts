// 2026-05-19 (Luiz/dev): Plano 03 fase-01 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Cobre helpers `formatImperativeInstruction` e `isImperativeInstruction` em isolamento.
import { describe, expect, test } from 'bun:test'
import {
  formatImperativeInstruction,
  isImperativeInstruction,
  type ImperativeInstruction,
} from './populate-plan-generator'

const VALID: ImperativeInstruction = {
  fontes: ['ARCHITECTURE.md', 'src/index.ts'],
  secoes: ['Convencao docs/ vs Runtime Assets', 'Modulos compartilhados'],
  honestidade: 'Cada afirmacao rastreia um arquivo lido. Honestidade > marketing.',
}

describe('formatImperativeInstruction', () => {
  test('renders markdown with 3 sections (Fontes, Secoes, honestidade)', () => {
    const out = formatImperativeInstruction(VALID)
    expect(out).toContain('**Fontes:**')
    expect(out).toContain('- ARCHITECTURE.md')
    expect(out).toContain('- src/index.ts')
    expect(out).toContain('**Secoes obrigatorias do output:**')
    expect(out).toContain('- Convencao docs/ vs Runtime Assets')
    expect(out).toContain('- Modulos compartilhados')
    expect(out).toContain('Honestidade > marketing.')
    // 2026-05-19 (Luiz/dev): heading `### Instrucao LLM` NAO sai daqui — G1.
    expect(out).not.toContain('### Instrucao LLM')
  })
})

describe('isImperativeInstruction', () => {
  test('returns true for a valid input with all 3 elements populated', () => {
    expect(isImperativeInstruction(VALID)).toBe(true)
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'apenas uma string'],
    ['missing fontes', { secoes: ['x'], honestidade: 'h' }],
    ['empty fontes', { fontes: [], secoes: ['x'], honestidade: 'h' }],
    ['fontes not strings', { fontes: [1, 2], secoes: ['x'], honestidade: 'h' }],
    ['missing secoes', { fontes: ['x'], honestidade: 'h' }],
    ['empty secoes', { fontes: ['x'], secoes: [], honestidade: 'h' }],
    ['empty honestidade', { fontes: ['x'], secoes: ['x'], honestidade: '' }],
    ['honestidade not string', { fontes: ['x'], secoes: ['x'], honestidade: 123 }],
  ])('returns false when %s', (_label, input) => {
    expect(isImperativeInstruction(input)).toBe(false)
  })
})
