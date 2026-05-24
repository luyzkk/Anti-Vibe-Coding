// 2026-05-24 (Luiz/dev): testes TDD RED para detectLegacySchema — PRD RF-07
import { describe, it, expect } from 'bun:test'
import { detectLegacySchema } from './readme-schema-detector'

describe('detectLegacySchema', () => {
  it('returns true when README has yaml block with date + author + decision fields', () => {
    const readme = `# Compound Notes

## Frontmatter Schema

\`\`\`yaml
date: 2024-01-01
author: luiz
decision: some decision text
\`\`\`

Some prose after the block.
`
    expect(detectLegacySchema(readme)).toBe(true)
  })

  it('returns false when README has canonical schema without legacy fields', () => {
    const readme = `# Compound Notes

## Frontmatter Schema

\`\`\`yaml
title: Short imperative summary
category: debugging
tags: [tag-one, tag-two]
created: 2026-05-23
\`\`\`

Some prose.
`
    expect(detectLegacySchema(readme)).toBe(false)
  })

  it('returns false for empty content', () => {
    expect(detectLegacySchema('')).toBe(false)
  })

  it('returns true when at least 2 of the 3 legacy fields are present (co-occurrence)', () => {
    const readme = `\`\`\`yaml
date: 2024-01-01
author: someone
\`\`\``
    expect(detectLegacySchema(readme)).toBe(true)
  })

  it('returns false when only 1 legacy field is present', () => {
    const readme = `\`\`\`yaml
date: 2024-01-01
title: something
\`\`\``
    expect(detectLegacySchema(readme)).toBe(false)
  })
})
