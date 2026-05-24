// 2026-05-24 (Luiz/dev): testes para helpers invoke-lessons-learned — PRD D20, R9, CA-16
import { describe, it, expect } from 'bun:test'

// @ts-ignore — modulo nao existe em RED phase
import { buildLessonsLearnedInvocation, parseLessonsLearnedCompletion } from './invoke-lessons-learned'

describe('buildLessonsLearnedInvocation', () => {
  it('formata args literal compativel com lessons-learned add', () => {
    const args = buildLessonsLearnedInvocation('bug found in deploy')
    expect(args).toBe('add "bug found in deploy"')
  })

  it('escapa aspas duplas no titulo', () => {
    const args = buildLessonsLearnedInvocation('race condition "fixed"')
    expect(args).toBe('add "race condition \\"fixed\\""')
  })
})

describe('parseLessonsLearnedCompletion', () => {
  it('parseia note_created do bloco yaml de completion signal', () => {
    const output = `
Lesson captured.

\`\`\`yaml
status: complete
note_created: docs/compound/2026-05-24-race-condition.md
\`\`\`
`
    const result = parseLessonsLearnedCompletion(output)
    expect(result.invoked).toBe(true)
    expect(result.noteCreated).toBe('docs/compound/2026-05-24-race-condition.md')
  })

  it('retorna invoked:true sem noteCreated quando sem bloco yaml', () => {
    const result = parseLessonsLearnedCompletion('Lesson captured without yaml block')
    expect(result.invoked).toBe(true)
    expect(result.noteCreated).toBeUndefined()
  })
})
