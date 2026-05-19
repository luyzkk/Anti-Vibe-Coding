// skills/init/lib/compound-imported-writer.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { writeCompoundImported } from './compound-imported-writer'
import type { ProgressEntry } from './progress-txt-parser'

const sampleEntries: ProgressEntry[] = [
  {
    index: 1,
    sourceLineNumber: 7,
    category: 'armadilha',
    title: 'UPSERT idempotente',
    body: '**Contexto:** sync\n**Solucao:** ON CONFLICT',
    slug: 'upsert-idempotente',
  },
  {
    index: 2,
    sourceLineNumber: 14,
    category: 'gotcha',
    title: 'Rate limit',
    body: '**Solucao:** delay 600ms',
    slug: 'rate-limit',
  },
]

describe('writeCompoundImported', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'compound-imported-'))
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('writes N entry files + INDEX.md when given N entries', async () => {
    const result = await writeCompoundImported(sampleEntries, {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    expect(result.filesWritten).toHaveLength(2)
    expect(result.filesWritten[0]).toContain('0001-upsert-idempotente.md')
    expect(result.filesWritten[1]).toContain('0002-rate-limit.md')
    const indexExists = await fs
      .stat(result.indexPath)
      .then(() => true)
      .catch(() => false)
    expect(indexExists).toBe(true)
  })

  it('preserves provenance line in frontmatter', async () => {
    const { filesWritten } = await writeCompoundImported(sampleEntries, {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const content = await fs.readFile(filesWritten[0] ?? '', 'utf-8')
    expect(content).toContain('source: .claude/progress.txt linha 7')
    expect(content).toContain('title: "UPSERT idempotente"')
    expect(content).toMatch(/^---\n/)
  })

  it('idempotent: re-run with same input overwrites same files (no duplication)', async () => {
    await writeCompoundImported(sampleEntries, {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const dir = path.join(tmp, 'docs', 'compound', '_imported')
    const before = (await fs.readdir(dir)).sort()
    await writeCompoundImported(sampleEntries, {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const after = (await fs.readdir(dir)).sort()
    expect(after).toEqual(before)
    expect(after).toHaveLength(3) // 2 entries + INDEX.md
  })

  it('empty input writes only INDEX.md with count=0', async () => {
    const result = await writeCompoundImported([], {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    expect(result.filesWritten).toHaveLength(0)
    const indexContent = await fs.readFile(result.indexPath, 'utf-8')
    expect(indexContent).toContain('count: 0')
  })

  it('INDEX.md links to all entry files', async () => {
    const { indexPath } = await writeCompoundImported(sampleEntries, {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const content = await fs.readFile(indexPath, 'utf-8')
    expect(content).toContain('[`0001-upsert-idempotente.md`](./0001-upsert-idempotente.md)')
    expect(content).toContain('[`0002-rate-limit.md`](./0002-rate-limit.md)')
    expect(content).toContain('linha 7')
    expect(content).toContain('linha 14')
  })

  // 2026-05-19 (Luiz/dev): hardening fase-01 — YAML injection + secrets redaction.
  it('quotes category with colon-space so YAML stays valid', async () => {
    const entry: ProgressEntry = {
      index: 1,
      sourceLineNumber: 1,
      category: 'process: critical',
      title: 'Edge case',
      body: 'x',
      slug: 'edge-case',
    }
    const { filesWritten } = await writeCompoundImported([entry], {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const content = await fs.readFile(filesWritten[0] ?? '', 'utf-8')
    expect(content).toContain('category: "process: critical"')
    expect(content).not.toMatch(/^category: process: critical$/m)
  })

  it('escapes commas and brackets in tag values', async () => {
    const entry: ProgressEntry = {
      index: 1,
      sourceLineNumber: 1,
      category: 'foo, bar',
      title: 'Comma in tag',
      body: 'x',
      slug: 'comma-in-tag',
    }
    const { filesWritten } = await writeCompoundImported([entry], {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const content = await fs.readFile(filesWritten[0] ?? '', 'utf-8')
    expect(content).toContain('tags: ["imported", "foo, bar"]')
  })

  it('redacts GitHub PAT tokens in entry body before writing', async () => {
    const entry: ProgressEntry = {
      index: 1,
      sourceLineNumber: 1,
      category: 'gotcha',
      title: 'leaked token',
      body: 'GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 was committed',
      slug: 'leaked-token',
    }
    const { filesWritten } = await writeCompoundImported([entry], {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const content = await fs.readFile(filesWritten[0] ?? '', 'utf-8')
    expect(content).not.toContain('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    expect(content).toContain('[REDACTED]')
  })

  it('redacts OpenAI-style sk- secrets in entry body', async () => {
    const entry: ProgressEntry = {
      index: 1,
      sourceLineNumber: 1,
      category: 'gotcha',
      title: 'api key',
      body: 'export OPENAI_KEY=sk-abc123DEF456ghi789JKL012mno345PQR678stu901VWX_ABCDEFG',
      slug: 'api-key',
    }
    const { filesWritten } = await writeCompoundImported([entry], {
      targetDir: tmp,
      sourcePath: '.claude/progress.txt',
    })
    const content = await fs.readFile(filesWritten[0] ?? '', 'utf-8')
    expect(content).not.toContain('sk-abc123DEF456ghi789JKL012mno345PQR678stu901VWX_ABCDEFG')
    expect(content).toContain('[REDACTED]')
  })
})
