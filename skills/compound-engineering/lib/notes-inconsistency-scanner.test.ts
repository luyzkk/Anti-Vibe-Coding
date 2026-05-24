// 2026-05-24 (Luiz/dev): testes TDD RED para scanNotesInconsistencies — PRD CA-14 + RNF-04
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scanNotesInconsistencies } from './notes-inconsistency-scanner'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(import.meta.dir, 'tmp-scanner-'))
  await fs.mkdir(path.join(tmpDir, 'docs', 'compound'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('scanNotesInconsistencies', () => {
  it('returns empty array when docs/compound/ has no notes', async () => {
    const issues = await scanNotesInconsistencies(tmpDir)
    expect(issues).toEqual([])
  })

  it('detects missing-title when note lacks title in frontmatter', async () => {
    const note = `---
category: debugging
tags: [bug]
created: 2024-01-01
---

## Problem
A problem.

## Solution
A solution.

## Prevention
Prevention.
`
    await fs.writeFile(path.join(tmpDir, 'docs', 'compound', '2024-01-01-note.md'), note)
    const issues = await scanNotesInconsistencies(tmpDir)
    const titles = issues.filter((i) => i.type === 'missing-title')
    expect(titles.length).toBe(1)
  })

  it('detects invalid-frontmatter when note has no frontmatter', async () => {
    const note = `# Just a heading\n\nNo frontmatter here.\n`
    await fs.writeFile(path.join(tmpDir, 'docs', 'compound', '2024-01-01-bad.md'), note)
    const issues = await scanNotesInconsistencies(tmpDir)
    const invalid = issues.filter((i) => i.type === 'invalid-frontmatter')
    expect(invalid.length).toBe(1)
  })

  it('detects legacy-field-date when note frontmatter has a date field', async () => {
    const note = `---
title: A note
category: debugging
tags: [bug]
created: 2024-01-01
date: 2024-01-01
---

## Problem
P.
## Solution
S.
## Prevention
V.
`
    await fs.writeFile(path.join(tmpDir, 'docs', 'compound', '2024-01-01-legacy.md'), note)
    const issues = await scanNotesInconsistencies(tmpDir)
    const legacyDate = issues.filter((i) => i.type === 'legacy-field-date')
    expect(legacyDate.length).toBe(1)
  })

  it('does NOT modify notes — RNF-04 non-destructive', async () => {
    const noteContent = `---
category: debugging
tags: [bug]
created: 2024-01-01
---

No title here.
`
    const notePath = path.join(tmpDir, 'docs', 'compound', '2024-01-01-rw.md')
    await fs.writeFile(notePath, noteContent)
    const before = await fs.readFile(notePath, 'utf-8')

    await scanNotesInconsistencies(tmpDir)

    const after = await fs.readFile(notePath, 'utf-8')
    expect(after).toBe(before)
  })
})
