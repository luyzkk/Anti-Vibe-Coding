// 2026-05-18 (Luiz/dev): Plano 02 fase-02 RED — 6 testes para populate-plan-generator.
// Clock injetado para determinismo. Sem Date.now() direto (CLAUDE.md global).

import { describe, test, expect } from 'bun:test'
import {
  generatePopulatePlan,
  type PopulatePlanInput,
} from './populate-plan-generator'
import { TEMPLATE_MANIFEST } from './template-manifest'

const FIXED_CLOCK = () => new Date('2026-05-18T14:30:00.000Z')

/** Conta o numero de tasks renderizadas (### Task: Populate `...) no markdown gerado. */
function countPopulateTasks(markdown: string): number {
  return (markdown.match(/### Task: Populate `/g) ?? []).length
}

/** Conta arquivos populaveis no TEMPLATE_MANIFEST usando as mesmas regras do gerador. */
function countPopulatableEntries(): number {
  const excluded = new Set(['docs/COMPOUND_ENGINEERING.md', 'docs/PRODUCT_SENSE.md', 'README.md'])
  const excludedPatterns = [/^\.github\//, /^scripts\//]
  return TEMPLATE_MANIFEST.filter(entry => {
    if (!entry.dst.endsWith('.md')) return false
    if (excluded.has(entry.dst)) return false
    if (excludedPatterns.some(rx => rx.test(entry.dst))) return false
    return true
  }).length
}

describe('generatePopulatePlan', () => {
  test('renders one task per populatable manifest entry', async () => {
    const input: PopulatePlanInput = {
      cwd: '/tmp/test-project',
      projectName: 'test-project',
      clock: FIXED_CLOCK,
    }

    const output = await generatePopulatePlan(input)
    const expectedCount = countPopulatableEntries()

    expect(countPopulateTasks(output.planMarkdown)).toBe(expectedCount)
    expect(output.tasks.filter(t => t.wave === 1)).toHaveLength(expectedCount)
  })

  test('excludes COMPOUND_ENGINEERING and PRODUCT_SENSE from tasks', async () => {
    const input: PopulatePlanInput = {
      cwd: '/tmp/test-project',
      projectName: 'test-project',
      clock: FIXED_CLOCK,
    }

    const output = await generatePopulatePlan(input)

    expect(output.planMarkdown).not.toContain('### Task: Populate `docs/COMPOUND_ENGINEERING.md`')
    expect(output.planMarkdown).not.toContain('### Task: Populate `docs/PRODUCT_SENSE.md`')
  })

  test('excludes README.md and .github/* and scripts/* from tasks', async () => {
    const input: PopulatePlanInput = {
      cwd: '/tmp/test-project',
      projectName: 'test-project',
      clock: FIXED_CLOCK,
    }

    const output = await generatePopulatePlan(input)

    expect(output.planMarkdown).not.toContain('Populate `README.md`')
    expect(output.planMarkdown).not.toContain('Populate `.github/')
    expect(output.planMarkdown).not.toContain('Populate `scripts/')
  })

  test('validate task is always last with literal command string', async () => {
    const input: PopulatePlanInput = {
      cwd: '/tmp/test-project',
      projectName: 'test-project',
      clock: FIXED_CLOCK,
    }

    const output = await generatePopulatePlan(input)

    const lastTaskIdx = output.planMarkdown.lastIndexOf('### Task:')
    const lastTaskSlice = output.planMarkdown.slice(lastTaskIdx)

    expect(lastTaskSlice).toContain('### Task: Validate Harness')
    expect(output.planMarkdown).toContain(
      'bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts',
    )
  })

  test('sharedGlossary undefined omits section; defined includes body', async () => {
    const baseInput: PopulatePlanInput = {
      cwd: '/tmp/test-project',
      projectName: 'test-project',
      clock: FIXED_CLOCK,
    }

    // (a) sem sharedGlossary — secao nao aparece
    const withoutGlossary = await generatePopulatePlan(baseInput)
    expect(withoutGlossary.planMarkdown).not.toContain('## Glossario Compartilhado')

    // (b) com sharedGlossary — secao aparece com corpo e aviso de wave
    const withGlossary = await generatePopulatePlan({
      ...baseInput,
      sharedGlossary: 'foo bar',
    })
    expect(withGlossary.planMarkdown).toContain('## Glossario Compartilhado')
    expect(withGlossary.planMarkdown).toContain('foo bar')
    expect(withGlossary.planMarkdown).toContain('Subagentes da wave 1 devem usar')
  })

  test('deterministic output — same clock and glossary produce byte-identical markdown', async () => {
    const input: PopulatePlanInput = {
      cwd: '/tmp/test-project',
      projectName: 'test-project',
      clock: FIXED_CLOCK,
      sharedGlossary: 'determinism-check',
    }

    const first = await generatePopulatePlan(input)
    const second = await generatePopulatePlan(input)

    expect(first.planMarkdown).toBe(second.planMarkdown)
    expect(first.relativePath).toBe(second.relativePath)
  })
})
