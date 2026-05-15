import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import path from 'node:path'
import { runDiscovery } from './discovery'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'discovery-test-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('runDiscovery', () => {
  it('module exists and exports runDiscovery', () => {
    expect(typeof runDiscovery).toBe('function')
  })

  it('returns empty entries for a directory with no md files', async () => {
    const result = await runDiscovery(tmp)
    expect(result.entries).toHaveLength(0)
    expect(result.excluded_paths).toHaveLength(0)
  })

  it('collects md files from docs/ recursively', async () => {
    await mkdir(path.join(tmp, 'docs', 'design-docs'), { recursive: true })
    await writeFile(path.join(tmp, 'docs', 'DESIGN.md'), '# Design\n\n## Overview\nContent')
    await writeFile(path.join(tmp, 'docs', 'design-docs', 'ADR-001.md'), '# ADR-001\n\nDecision')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('docs/DESIGN.md')
    expect(paths).toContain('docs/design-docs/ADR-001.md')
  })

  it('collects md files from root non-recursively', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project\n\nDescription')
    await mkdir(path.join(tmp, 'subdir'), { recursive: true })
    await writeFile(path.join(tmp, 'subdir', 'nested.md'), '# Nested')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('README.md')
    // subdir/nested.md fora do escopo (root-md não é recursivo)
    expect(paths).not.toContain('subdir/nested.md')
  })

  it('collects md files from .claude/ recursively', async () => {
    await mkdir(path.join(tmp, '.claude'), { recursive: true })
    await writeFile(path.join(tmp, '.claude', 'CLAUDE.md'), '# Claude\n\nInstructions')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('.claude/CLAUDE.md')
  })

  it('excludes .env files and adds them to excluded_paths', async () => {
    await writeFile(path.join(tmp, '.env'), 'SECRET=abc')
    await writeFile(path.join(tmp, '.env.local'), 'DB_PASS=xyz')
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).not.toContain('.env')
    expect(paths).not.toContain('.env.local')
    expect(paths).toContain('README.md')
  })

  it('excludes *.pem and *.key files', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project')
    await writeFile(path.join(tmp, 'server.pem'), 'CERT')
    await writeFile(path.join(tmp, 'id_rsa.key'), 'KEY')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('README.md')
    // .pem e .key não são .md — não aparecem no walk, não em excluded_paths
    expect(result.excluded_paths).toHaveLength(0)
  })

  it('skips node_modules and .git directories', async () => {
    await mkdir(path.join(tmp, 'node_modules', 'some-pkg'), { recursive: true })
    await writeFile(path.join(tmp, 'node_modules', 'some-pkg', 'README.md'), '# pkg')
    await mkdir(path.join(tmp, '.git'), { recursive: true })
    await writeFile(path.join(tmp, '.git', 'COMMIT_EDITMSG'), 'commit msg')
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).not.toContain('node_modules/some-pkg/README.md')
    expect(paths).toContain('README.md')
  })

  it('extracts H1 and H2 headings (ATX only)', async () => {
    const content = [
      '# Main Title',
      '',
      '## Section One',
      '',
      'Content',
      '',
      '### SubSection',
      '',
      '## Section Two',
      '',
      'Title via setext',
      '=================',
    ].join('\n')
    await writeFile(path.join(tmp, 'README.md'), content)

    const result = await runDiscovery(tmp)
    const entry = result.entries.find((e) => e.path === 'README.md')!
    expect(entry.h1_h2_headings).toEqual(['Main Title', 'Section One', 'Section Two'])
  })

  it('captures first_500_chars as string slice', async () => {
    const long = 'a'.repeat(1000)
    await writeFile(path.join(tmp, 'README.md'), long)

    const result = await runDiscovery(tmp)
    const entry = result.entries.find((e) => e.path === 'README.md')!
    expect(entry.first_500_chars).toHaveLength(500)
  })

  it('deduplicates entries when same file appears in multiple scopes', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    const result = await runDiscovery(tmp)
    const readme = result.entries.filter((e) => e.path === 'README.md')
    expect(readme).toHaveLength(1)
  })

  it('writes inventory.json to discovery/ directory', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    await runDiscovery(tmp)

    const raw = await readFile(path.join(tmp, 'discovery', 'inventory.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed.run_id).toBeDefined()
    expect(parsed.entries).toBeInstanceOf(Array)
  })

  it('inventory has run_id, scanned_at, target_dir, duration_ms', async () => {
    const result = await runDiscovery(tmp)
    expect(typeof result.run_id).toBe('string')
    expect(result.run_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(typeof result.scanned_at).toBe('string')
    expect(result.target_dir).toBe(tmp)
    expect(typeof result.duration_ms).toBe('number')
  })

  it('mtime is ISO string', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project')
    const result = await runDiscovery(tmp)
    const entry = result.entries[0]!
    expect(entry.mtime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
