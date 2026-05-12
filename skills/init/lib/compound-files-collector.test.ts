import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { listCompoundFiles } from './compound-files-collector'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'collector')

async function setup(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
}

async function write(rel: string, body: string): Promise<void> {
  const full = path.join(FIXTURE, rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, body, 'utf8')
}

describe('listCompoundFiles', () => {
  beforeEach(setup)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('returns empty array when docs/compound/ has no notes', async () => {
    const result = await listCompoundFiles(FIXTURE)
    expect(result).toEqual([])
  })

  it('returns empty array when docs/compound/ does not exist', async () => {
    await fs.rm(path.join(FIXTURE, 'docs'), { recursive: true, force: true })
    const result = await listCompoundFiles(FIXTURE)
    expect(result).toEqual([])
  })

  it('skips README.md and index.md', async () => {
    await write('docs/compound/README.md', '# README\n')
    await write('docs/compound/index.md', '# Index\n')
    await write('docs/compound/2026-05-12-foo.md', '# Foo\n')
    const result = await listCompoundFiles(FIXTURE)
    expect(result.length).toBe(1)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result[0]!.endsWith('2026-05-12-foo.md')).toBe(true)
  })

  it('G9: excludes _archived/ subdirectory', async () => {
    await write('docs/compound/2026-05-12-active.md', '# Active\n')
    await write('docs/compound/_archived/2026-05-01-old.md', '# Old\n')
    await write('docs/compound/_archived/nested/2026-04-01-older.md', '# Older\n')
    const result = await listCompoundFiles(FIXTURE)
    expect(result.length).toBe(1)
    expect(result[0]).toContain('2026-05-12-active.md')
    expect(result.some((p) => p.includes('_archived'))).toBe(false)
  })

  it('ignores non-markdown files', async () => {
    await write('docs/compound/note.txt', 'not markdown')
    await write('docs/compound/2026-05-12-foo.md', '# Foo\n')
    const result = await listCompoundFiles(FIXTURE)
    expect(result.length).toBe(1)
  })

  it('returns absolute paths', async () => {
    await write('docs/compound/2026-05-12-foo.md', '# Foo\n')
    const result = await listCompoundFiles(FIXTURE)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(path.isAbsolute(result[0]!)).toBe(true)
  })
})
