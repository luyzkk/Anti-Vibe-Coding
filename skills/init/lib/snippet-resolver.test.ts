import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { resolveSnippetIncludes } from './snippet-resolver'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'snippet-resolver-'))
}

describe('resolveSnippetIncludes', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('resolves include markers in content replacing with file content', async () => {
    await fs.writeFile(path.join(tmp, 'section-a.md'), '## Section A\n\nContent here.\n', 'utf8')
    const content = 'Before\n\n{{include: ./section-a.md}}\n\nAfter'
    const result = await resolveSnippetIncludes(content, tmp)
    expect(result).toContain('## Section A')
    expect(result).toContain('Content here.')
    expect(result).not.toContain('{{include:')
  })

  test('leaves content unchanged when no include markers', async () => {
    const content = '# Title\n\nSome content without markers.\n'
    const result = await resolveSnippetIncludes(content, tmp)
    expect(result).toBe(content)
  })

  test('uses baseDir to resolve relative paths', async () => {
    const subDir = path.join(tmp, 'sub')
    await fs.mkdir(subDir, { recursive: true })
    await fs.writeFile(path.join(subDir, 'snippet.md'), 'Snippet content', 'utf8')
    const content = '{{include: ./snippet.md}}'
    const result = await resolveSnippetIncludes(content, subDir)
    expect(result).toBe('Snippet content')
  })

  test('resolves multiple include markers in a single pass', async () => {
    await fs.writeFile(path.join(tmp, 'part1.md'), 'Part 1', 'utf8')
    await fs.writeFile(path.join(tmp, 'part2.md'), 'Part 2', 'utf8')
    const content = '{{include: ./part1.md}}\n---\n{{include: ./part2.md}}'
    const result = await resolveSnippetIncludes(content, tmp)
    expect(result).toContain('Part 1')
    expect(result).toContain('Part 2')
    expect(result).not.toContain('{{include:')
  })
})
