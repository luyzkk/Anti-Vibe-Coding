import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { classifyBlocksHybridStep } from './08-classify-blocks-hybrid'
import { writeDiscoveryArtifact, readDiscoveryArtifact } from '../discovery-store'
import { registry } from '../registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-classify-'))
}

async function touch(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

describe('classifyBlocksHybridStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel', () => {
    expect(classifyBlocksHybridStep.id).toBe('08-classify-blocks-hybrid')
  })

  test('sem discovered-docs.json previo → 0 docs (graceful)', async () => {
    const report = await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('0 docs (nenhum discovered)')
    expect(report.mutated).toBe(false)
  })

  test('sem ambiguos (todos high) → pendingLlmRefinement vazio', async () => {
    await touch(
      path.join(tmp, 'docs', 'AUTH.md'),
      'auth oauth jwt csrf password secret seguranca criptografia',
    )
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      docs: [{
        absolutePath: path.join(tmp, 'docs', 'AUTH.md'),
        relativePath: 'docs/AUTH.md',
        bytes: 100,
        extension: '.md',
        blockedBySecret: false,
      }],
    })

    const report = await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('1 high')

    const persisted = await readDiscoveryArtifact<{
      pendingLlmRefinement: readonly string[]
      mappings: ReadonlyArray<{ source: string; confidence: string }>
    }>(tmp, 'classification-result')
    expect(persisted?.pendingLlmRefinement).toHaveLength(0)
    expect(persisted?.mappings[0]?.confidence).toBe('high')
  })

  test('com ambiguos → pendingLlmRefinement contem o source', async () => {
    await touch(
      path.join(tmp, 'docs', 'MIXED.md'),
      'auth react oauth component css tailwind',
    )
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      docs: [{
        absolutePath: path.join(tmp, 'docs', 'MIXED.md'),
        relativePath: 'docs/MIXED.md',
        bytes: 50,
        extension: '.md',
        blockedBySecret: false,
      }],
    })

    await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    const persisted = await readDiscoveryArtifact<{
      pendingLlmRefinement: readonly string[]
    }>(tmp, 'classification-result')
    expect(persisted?.pendingLlmRefinement).toContain('docs/MIXED.md')
  })

  test('arquivos blockedBySecret sao filtrados (entram em skippedDueToSecret)', async () => {
    await touch(path.join(tmp, 'docs', 'STRIPE.md'), 'auth content')
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      docs: [{
        absolutePath: path.join(tmp, 'docs', 'STRIPE.md'),
        relativePath: 'docs/STRIPE.md',
        bytes: 20,
        extension: '.md',
        blockedBySecret: true,
      }],
    })

    await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    const persisted = await readDiscoveryArtifact<{
      mappings: readonly unknown[]
      skippedDueToSecret: readonly string[]
    }>(tmp, 'classification-result')
    expect(persisted?.mappings).toHaveLength(0)
    expect(persisted?.skippedDueToSecret).toContain('docs/STRIPE.md')
  })

  test('registry: classifyBlocksHybridStep apos discoverExistingDocsStep, antes de migrate0', () => {
    const ids = registry.map((s) => s.id)
    const idxClassify = ids.indexOf('08-classify-blocks-hybrid')
    const idxDiscover = ids.indexOf('07-discover-existing-docs')
    const idxMigrate0 = ids.indexOf('migrate-0-parse-dry-run')
    expect(idxClassify).toBe(idxDiscover + 1)
    expect(idxClassify).toBeLessThan(idxMigrate0)
  })

  test('--dry-run NAO escreve classification-result.json', async () => {
    await writeDiscoveryArtifact(tmp, 'discovered-docs', { docs: [] })
    await classifyBlocksHybridStep.run({ cwd: tmp, args: ['--dry-run'], flags: { 'dry-run': true } })
    const persisted = await readDiscoveryArtifact(tmp, 'classification-result')
    expect(persisted).toBeNull()
  })
})
