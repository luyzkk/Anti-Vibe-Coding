// 2026-05-24 (Luiz/dev): testes TDD RED para runMigrate — PRD CA-13/14 + RNF-04
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { runMigrate } from './migrate'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(import.meta.dir, 'tmp-migrate-'))
  await fs.mkdir(path.join(tmpDir, 'docs', 'compound'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

// Helper: caminho padrao para README e report
const readmePath = (root: string) => path.join(root, 'docs', 'compound', 'README.md')
const reportPath = (root: string) => path.join(root, 'docs', 'compound', 'migration-report.md')

describe('runMigrate', () => {
  it('CA-13: rewrites README when legacy schema detected, preserving prose', async () => {
    const legacyReadme = `# Compound Notes

Some intro prose that must be preserved.

## Frontmatter Schema

\`\`\`yaml
date: 2024-01-01
author: luiz
decision: some decision text
tags: [a, b]
\`\`\`

More prose after block that must also be preserved.
`
    await fs.writeFile(readmePath(tmpDir), legacyReadme)

    const result = await runMigrate(tmpDir)

    expect(result.readmeMigrated).toBe(true)

    const newReadme = await fs.readFile(readmePath(tmpDir), 'utf-8')
    // Prose preserved
    expect(newReadme).toContain('Some intro prose that must be preserved.')
    expect(newReadme).toContain('More prose after block that must also be preserved.')
    // Legacy fields removed from yaml block
    expect(newReadme).not.toContain('date: 2024-01-01')
    expect(newReadme).not.toContain('author: luiz')
    expect(newReadme).not.toContain('decision:')
    // Canonical schema present
    expect(newReadme).toContain('title: Short imperative summary')
    expect(newReadme).toContain('category: debugging')
  })

  it('CA-14: generates migration-report.md without rewriting notes (RNF-04)', async () => {
    // Criar 5 notas brownfield com inconsistencias
    const badNotes = [
      { name: '2024-01-01-a.md', content: `# No frontmatter\nJust text.\n` },
      { name: '2024-01-02-b.md', content: `---\ncategory: debugging\ntags: [x]\ncreated: 2024-01-02\n---\nNo title.\n` },
      { name: '2024-01-03-c.md', content: `---\ntitle: A note\ntags: [x]\ncreated: 2024-01-03\n---\nNo category.\n` },
      { name: '2024-01-04-d.md', content: `---\ntitle: A note\ncategory: debugging\ncreated: 2024-01-04\n---\nNo tags.\n` },
      { name: '2024-01-05-e.md', content: `---\ntitle: A note\ncategory: debugging\ntags: [x]\n---\nNo created.\n` },
    ]

    const originalContents: Record<string, string> = {}
    for (const note of badNotes) {
      const p = path.join(tmpDir, 'docs', 'compound', note.name)
      await fs.writeFile(p, note.content)
      originalContents[note.name] = note.content
    }

    const result = await runMigrate(tmpDir)

    // Report deve existir
    const reportExists = await fs.access(reportPath(tmpDir)).then(() => true).catch(() => false)
    expect(reportExists).toBe(true)

    // Report deve conter cabecalho e informacoes das notas
    const reportContent = await fs.readFile(reportPath(tmpDir), 'utf-8')
    expect(reportContent).toContain('# Migration Report')
    expect(reportContent).toContain('Notes are NOT modified.')

    // RNF-04: notas NAO modificadas
    for (const note of badNotes) {
      const p = path.join(tmpDir, 'docs', 'compound', note.name)
      const current = await fs.readFile(p, 'utf-8')
      expect(current).toBe(originalContents[note.name])
    }

    expect(result.notesWithIssues).toBeGreaterThan(0)
  })

  it('idempotencia: segunda invocacao em projeto ja migrado nao reescreve README', async () => {
    const canonicalReadme = `# Compound Notes

\`\`\`yaml
title: Short imperative summary
category: debugging
tags: [tag-one, tag-two]
created: 2026-05-23
\`\`\`
`
    await fs.writeFile(readmePath(tmpDir), canonicalReadme)

    const result = await runMigrate(tmpDir)

    expect(result.readmeMigrated).toBe(false)

    // README deve estar inalterado
    const afterReadme = await fs.readFile(readmePath(tmpDir), 'utf-8')
    expect(afterReadme).toBe(canonicalReadme)
  })
})
