// 2026-05-16 (Luiz/dev): casos cobertos — CA-02 (Node+TS), CA-03 (Rails puro), CA-06 (sem anchor), CA-07 (multi-stack), G4 (perf bounded).
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { detectMultiStack } from './detect-multi-stack'

async function mkProject(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'multi-stack-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content)
  }
  return dir
}

describe('detectMultiStack', () => {
  it('returns nodejs-typescript primary when only package.json with ts present', async () => {
    const dir = await mkProject({ 'package.json': JSON.stringify({ devDependencies: { typescript: '^5' } }) })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBe('nodejs-typescript')
    expect(result.secondary).toEqual([])
    expect(result.anchor_files).toEqual(['package.json'])
  })

  it('returns rails primary when only Gemfile present (CA-03)', async () => {
    const dir = await mkProject({ 'Gemfile': 'gem "rails"\n' })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBe('rails')
    expect(result.secondary).toEqual([])
  })

  it('returns primary=null when no anchor file present (CA-06)', async () => {
    const dir = await mkProject({ 'README.md': '# nothing here' })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBeNull()
    expect(result.secondary).toEqual([])
    expect(result.anchor_files).toEqual([])
  })

  it('multi-stack Rails+Node: primary=rails when .rb files outnumber .ts/.js (CA-07)', async () => {
    const dir = await mkProject({
      'Gemfile': 'gem "rails"\n',
      'package.json': JSON.stringify({ devDependencies: { typescript: '^5' } }),
      'app/models/user.rb': 'class User; end',
      'app/models/order.rb': 'class Order; end',
      'app/models/item.rb': 'class Item; end',
      'frontend/index.ts': 'export const x = 1',
    })
    const result = await detectMultiStack(dir)
    expect(result.primary).toBe('rails')
    expect(result.secondary).toEqual(['nodejs-typescript'])
    expect(result.anchor_files.sort()).toEqual(['Gemfile', 'package.json'])
  })

  it('completes detection within 500ms even with bounded walk (NFR perf, G4)', async () => {
    const dir = await mkProject({
      'package.json': JSON.stringify({ devDependencies: { typescript: '^5' } }),
      'Gemfile': 'gem "rails"\n',
      // criar 200 arquivos shallow para exercitar o walk
      ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`src/a${i}.ts`, '//x'])),
      ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`app/b${i}.rb`, '#x'])),
    })
    const start = Date.now()
    await detectMultiStack(dir)
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
  })
})
