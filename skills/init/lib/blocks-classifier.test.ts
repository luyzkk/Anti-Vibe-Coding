import { expect, test, describe } from 'bun:test'
import { classifyDocs } from './blocks-classifier'

function makeDoc(relativePath: string) {
  return {
    absolutePath: `/fake/${relativePath}`,
    relativePath,
    bytes: 0,
    extension: '.md' as const,
  }
}

describe('classifyDocs', () => {
  test('high confidence: 3+ matches numa unica categoria, sem conflito', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('docs/AUTH.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['docs/AUTH.md', 'auth flow with oauth and jwt; csrf protection; secret rotation.'],
      ]),
    })
    expect(out.mappings).toHaveLength(1)
    expect(out.mappings[0]?.target).toBe('docs/SECURITY.md')
    expect(out.mappings[0]?.confidence).toBe('high')
    expect(out.mappings[0]?.pendingLlmRefinement).toBe(false)
  })

  test('medium confidence: empate proximo entre 2 categorias', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('docs/MIXED.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['docs/MIXED.md', 'auth and oauth; react component patterns; CSS tailwind.'],
      ]),
    })
    expect(out.mappings).toHaveLength(1)
    expect(out.mappings[0]?.confidence).toBe('medium')
    expect(out.mappings[0]?.pendingLlmRefinement).toBe(true)
  })

  test('orphan: arquivo sem matches em nenhuma categoria vai para docs/references/', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('LICENSE-NOTES.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['LICENSE-NOTES.md', '# Termos da licenca proprietaria. Nada mais.'],
      ]),
    })
    expect(out.mappings).toHaveLength(0)
    expect(out.orphans).toHaveLength(1)
    expect(out.orphans[0]?.target).toBe('docs/references/LICENSE-NOTES.md')
  })

  test('exclusao de filosoficos: nunca mapeia para COMPOUND_ENGINEERING ou PRODUCT_SENSE', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('docs/COMPOUND.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['docs/COMPOUND.md', 'compound engineering product sense filosofia camadas auth oauth jwt'],
      ]),
    })
    const target = out.mappings[0]?.target ?? out.orphans[0]?.target
    expect(target).not.toBe('docs/COMPOUND_ENGINEERING.md')
    expect(target).not.toBe('docs/PRODUCT_SENSE.md')
  })

  test('sharedGlossary: termos com >=3 ocorrencias entre docs aparecem', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('a.md'), makeDoc('b.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['a.md', 'harness-validator harness-validator design'],
        ['b.md', 'harness-validator workflow workflow workflow'],
      ]),
    })
    const harness = out.sharedGlossary.find((g) => g.term === 'harness-validator')
    expect(harness?.occurrences).toBe(3)
    expect([...(harness?.sources ?? [])].sort()).toEqual(['a.md', 'b.md'])
    const workflow = out.sharedGlossary.find((g) => g.term === 'workflow')
    expect(workflow?.occurrences).toBe(3)
  })

  test('stopwords sao filtradas do glossary', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('a.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['a.md', 'this this this that that that should should should'],
      ]),
    })
    expect(out.sharedGlossary).toHaveLength(0)
  })

  test('low confidence (1 match unico) → medium com pendingLlmRefinement', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('thin.md')],
      cwd: '/fake',
      contentsBySource: new Map([['thin.md', 'apenas auth uma vez aqui.']]),
    })
    expect(out.mappings[0]?.confidence).toBe('medium')
    expect(out.mappings[0]?.pendingLlmRefinement).toBe(true)
  })
})
