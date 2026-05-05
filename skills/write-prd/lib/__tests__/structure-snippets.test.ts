import { describe, expect, test } from 'bun:test'
import { STRUCTURE_SNIPPETS, STRUCTURE_SNIPPET_V52 } from '../structure-snippets'

describe('STRUCTURE_SNIPPETS lookup', () => {
  test('has exactly 5 keys (G6)', () => {
    expect(Object.keys(STRUCTURE_SNIPPETS).length).toBe(5)
  })

  test('all 5 snippets are non-empty strings', () => {
    for (const snippet of Object.values(STRUCTURE_SNIPPETS)) {
      expect(snippet.length).toBeGreaterThan(0)
    }
  })

  test('vertical-slice snippet mentions src/features/', () => {
    expect(STRUCTURE_SNIPPETS['vertical-slice']).toMatch(/src\/features\//)
  })

  test('clean-architecture-ritual snippet mentions Domain/Application/Infrastructure/Presentation', () => {
    const snippet = STRUCTURE_SNIPPETS['clean-architecture-ritual']
    expect(snippet).toMatch(/domain/i)
    expect(snippet).toMatch(/application/i)
    expect(snippet).toMatch(/infrastructure/i)
    expect(snippet).toMatch(/presentation|controller/i)
  })

  test('mvc-flat snippet mentions controllers/services/repositories', () => {
    const snippet = STRUCTURE_SNIPPETS['mvc-flat']
    expect(snippet).toMatch(/controller/i)
    expect(snippet).toMatch(/service/i)
    expect(snippet).toMatch(/repositor/i)
  })

  test('nextjs-app-router snippet mentions app/ and route.ts', () => {
    const snippet = STRUCTURE_SNIPPETS['nextjs-app-router']
    expect(snippet).toMatch(/app\//)
    expect(snippet).toMatch(/route\.ts/)
  })

  test('unknown-mixed snippet suggests running detect-architecture', () => {
    expect(STRUCTURE_SNIPPETS['unknown-mixed']).toMatch(/detect-architecture/)
  })

  test('every snippet starts with ### Estrutura sugerida', () => {
    for (const snippet of Object.values(STRUCTURE_SNIPPETS)) {
      expect(snippet).toMatch(/^### Estrutura sugerida/)
    }
  })
})

describe('CA-04 regression: flag off uses empty snippet', () => {
  test('STRUCTURE_SNIPPET_V52 is empty string', () => {
    expect(STRUCTURE_SNIPPET_V52).toBe('')
  })

  test('empty snippet means template omits the section entirely', () => {
    // simulacao: replace de marcador com string vazia
    const template = '## Solução\n\nXXX\n\n{- structure-snippet -}\n\n---'
    const rendered = template.replace('{- structure-snippet -}', STRUCTURE_SNIPPET_V52)
    expect(rendered).not.toMatch(/structure-snippet/)
    expect(rendered).not.toMatch(/Estrutura sugerida/)
  })
})
