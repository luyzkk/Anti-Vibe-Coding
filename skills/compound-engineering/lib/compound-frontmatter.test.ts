import { describe, it, expect } from 'bun:test'
import { parseFrontmatter, findMissingRequiredSections } from './compound-frontmatter'

const VALID_FM = `---
title: Race condition no webhook retry
category: bug
tags:
  - webhook
  - race
  - postgres
created: 2026-05-12
---

# Race condition no webhook retry

## Problem
The webhook handler updates state without locking.

## Solution
Wrap update in SELECT FOR UPDATE.

## Prevention
Add idempotency_key check at the entry point.
`

describe('parseFrontmatter', () => {
  it('parses valid frontmatter with YAML list', () => {
    const r = parseFrontmatter(VALID_FM)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.title).toBe('Race condition no webhook retry')
    expect(r.data.category).toBe('bug')
    expect(r.data.tags).toEqual(['webhook', 'race', 'postgres'])
    expect(r.data.created).toBe('2026-05-12')
  })

  it('parses inline list tags: [a, b, c]', () => {
    const body = `---
title: X
category: y
tags: [a, b, c]
created: 2026-05-12
---

# X
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.tags).toEqual(['a', 'b', 'c'])
  })

  it('rejects body with no frontmatter at all', () => {
    const r = parseFrontmatter('# Just a title\n\n## Problem\n')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors[0]).toContain('missing frontmatter')
  })

  it('G4: rejects unclosed frontmatter delimiter', () => {
    const body = '---\ntitle: X\ncategory: y\n\n# never closed\n'
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors[0]).toContain('never closed')
  })

  it('rejects missing title', () => {
    const body = `---
category: bug
tags: [x]
created: 2026-05-12
---

# X
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.some((e) => e.includes('title'))).toBe(true)
  })

  it('rejects empty title string', () => {
    const body = `---
title: ""
category: bug
tags: [x]
created: 2026-05-12
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
  })

  it('Ambiguity 04-A2: rejects empty tags array', () => {
    const body = `---
title: X
category: y
tags: []
created: 2026-05-12
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.some((e) => e.includes('at least 1 element'))).toBe(true)
  })

  it('rejects created field in wrong format', () => {
    const body = `---
title: X
category: y
tags: [a]
created: 12/05/2026
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.some((e) => e.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('accepts extra fields (forward-compat)', () => {
    const body = `---
title: X
category: y
tags: [a]
created: 2026-05-12
status: active
applies-to: rails@8
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(true)
  })

  it('strips quotes from string values', () => {
    const body = `---
title: "Quoted title"
category: 'bug'
tags: ["a", 'b']
created: 2026-05-12
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.title).toBe('Quoted title')
    expect(r.data.category).toBe('bug')
    expect(r.data.tags).toEqual(['a', 'b'])
  })

  it('accumulates all errors (does not stop on first)', () => {
    const body = `---
title: ""
category: ""
tags: []
created: bogus
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.length).toBeGreaterThanOrEqual(4)
  })
})

describe('findMissingRequiredSections', () => {
  it('returns empty array when all 3 sections present', () => {
    const body = '## Problem\nx\n## Solution\ny\n## Prevention\nz\n'
    expect(findMissingRequiredSections(body)).toEqual([])
  })

  it('CA-29: returns ["## Solution"] when Solution missing', () => {
    const body = '## Problem\nx\n## Prevention\nz\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })

  it('returns all 3 when all missing', () => {
    expect(findMissingRequiredSections('# Just a title\n')).toEqual(['## Problem', '## Solution', '## Prevention'])
  })

  it('Ambiguity 04-A1: rejects "## solution" (lowercase) — strict match', () => {
    const body = '## Problem\n## solution\n## Prevention\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })

  it('Ambiguity 04-A1: rejects "### Solution" (H3) — strict H2 match', () => {
    const body = '## Problem\n### Solution\n## Prevention\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })

  it('Ambiguity 04-A1: rejects "## Solution found" (trailing content)', () => {
    const body = '## Problem\n## Solution found\n## Prevention\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })
})
