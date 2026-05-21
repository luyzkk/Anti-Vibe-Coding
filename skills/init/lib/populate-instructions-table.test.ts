// skills/init/lib/populate-instructions-table.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-02 — tabela 16 docs + buildWavesForDoc stack-aware.
// DI-Plano04-fase02-stackid-node-ts: spec usava 'nodejs-typescript' como StackId, mas o tipo
// real em detect-stack.ts e 'node-ts'. Testes corrigidos para usar 'node-ts'.

import { test, expect, describe } from 'bun:test'
import {
  POPULATE_INSTRUCTIONS_BY_DOC,
  buildWavesForDoc,
  docToSlug,
} from './populate-instructions-table'
import { TEMPLATE_MANIFEST } from './template-manifest'

describe('POPULATE_INSTRUCTIONS_BY_DOC', () => {
  test('contains exactly 16 entries (D18)', () => {
    expect(POPULATE_INSTRUCTIONS_BY_DOC.size).toBe(16)
  })

  test('every key maps to a valid TEMPLATE_MANIFEST.dst', () => {
    const validDsts = new Set(TEMPLATE_MANIFEST.map(e => e.dst))
    for (const key of POPULATE_INSTRUCTIONS_BY_DOC.keys()) {
      expect(validDsts.has(key)).toBe(true)
    }
  })

  test('every entry has all required DocInstruction fields populated (no empty arrays)', () => {
    for (const [, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      expect(instr.goal.length).toBeGreaterThan(20)
      expect(instr.scopeIn.length).toBeGreaterThan(0)
      expect(instr.scopeOut.length).toBeGreaterThan(0)
      expect(instr.sectionsToWrite.length).toBeGreaterThan(0)
      expect(instr.exitCriteria.length).toBeGreaterThan(0)
    }
  })

  test('contains the 4 AVC extras (D18)', () => {
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('docs/MERGE_GATES.md')).toBe(true)
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('docs/CODE_STYLE.md')).toBe(true)
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('docs/STATE.md')).toBe(true)
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('.claude/CLAUDE.md')).toBe(true)
  })

  test('contains all 12 baseline Andre docs (D18)', () => {
    const expected = [
      'AGENTS.md',
      'ARCHITECTURE.md',
      'README.md',
      'docs/QUALITY_SCORE.md',
      'docs/PLANS.md',
      'docs/DESIGN.md',
      'docs/FRONTEND.md',
      'docs/PRODUCT_SENSE.md',
      'docs/RELIABILITY.md',
      'docs/SECURITY.md',
      'docs/design-docs/core-beliefs.md',
      'docs/generated/db-schema.md',
    ]
    for (const doc of expected) {
      expect(POPULATE_INSTRUCTIONS_BY_DOC.has(doc)).toBe(true)
    }
  })
})

describe('buildWavesForDoc', () => {
  // DI-Plano04-fase02-stackid-node-ts: 'node-ts' e o StackId correto (nao 'nodejs-typescript')
  test('Rails FRONTEND.md Wave 1 contains app/views and app/assets (CA-04)', () => {
    const waves = buildWavesForDoc('docs/FRONTEND.md', 'rails')
    const wave1 = waves[0]!
    expect(wave1).toBeDefined()
    expect(wave1.items.some(i => i.includes('app/views'))).toBe(true)
    expect(wave1.items.some(i => i.includes('app/assets'))).toBe(true)
    expect(wave1.items.some(i => i.includes('src/'))).toBe(false)
  })

  test('Node-TS FRONTEND.md Wave 1 contains src/components and tailwind.config', () => {
    const waves = buildWavesForDoc('docs/FRONTEND.md', 'node-ts')
    const wave1 = waves[0]!
    expect(wave1).toBeDefined()
    expect(wave1.items.some(i => i.includes('src/components'))).toBe(true)
    expect(wave1.items.some(i => i.includes('tailwind.config'))).toBe(true)
    expect(wave1.items.some(i => i.includes('app/views'))).toBe(false)
  })

  test('always returns at least 2 Waves', () => {
    const waves = buildWavesForDoc('docs/SECURITY.md', 'node-ts')
    expect(waves.length).toBeGreaterThanOrEqual(2)
  })

  test('unknown doc returns generic Wave 1 mentioning codebase', () => {
    const waves = buildWavesForDoc('docs/UNKNOWN.md', 'node-ts')
    expect(waves.length).toBe(2)
    expect(waves[0]!.items[0]!.toLowerCase()).toContain('codebase')
  })

  test('null stack returns generic Wave 1', () => {
    const waves = buildWavesForDoc('docs/FRONTEND.md', null)
    expect(waves.length).toBe(2)
    expect(waves[0]!.items.length).toBeGreaterThan(0)
  })

  test('nextjs FRONTEND.md Wave 1 uses src/ paths (nextjs shares node-ts matrix)', () => {
    const waves = buildWavesForDoc('docs/FRONTEND.md', 'nextjs')
    const wave1 = waves[0]!
    expect(wave1.items.some(i => i.includes('src/'))).toBe(true)
  })
})

describe('docToSlug', () => {
  test.each([
    ['AGENTS.md', 'agents-md'],
    ['docs/SECURITY.md', 'docs-security-md'],
    ['docs/design-docs/core-beliefs.md', 'docs-design-docs-core-beliefs-md'],
    ['.claude/CLAUDE.md', 'claude-claude-md'],
    ['docs/generated/db-schema.md', 'docs-generated-db-schema-md'],
    ['README.md', 'readme-md'],
    ['ARCHITECTURE.md', 'architecture-md'],
    ['docs/STATE.md', 'docs-state-md'],
  ])('docToSlug(%s) === %s', (input, expected) => {
    expect(docToSlug(input)).toBe(expected)
  })
})
