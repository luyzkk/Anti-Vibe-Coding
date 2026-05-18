import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { proposeMergeBatchStep } from './09-propose-merge-batch'
import { writeDiscoveryArtifact } from '../discovery-store'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-propose-merge-'))
}

describe('proposeMergeBatchStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('returns mutated:false with "no transformations needed" when all discovery artifacts are empty (greenfield)', async () => {
    const report = await proposeMergeBatchStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('init-propose-merge')
    expect(report.summary).toContain('no transformations needed')
    expect(report.needsUser).toBeUndefined()
  })

  test('emits needsUser with aggregated diff when proposal has transforms and moves', async () => {
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      subagent_id: 'init-discover-existing-docs',
      docs: [{
        absolutePath: path.join(tmp, 'EXISTING-DOC.md'),
        relativePath: 'EXISTING-DOC.md',
        bytes: 100,
        extension: '.md',
        blockedBySecret: false,
      }],
      blockedCount: 1,
      durationMs: 10,
    })
    await writeDiscoveryArtifact(tmp, 'classification-result', {
      subagent_id: 'init-classify-blocks',
      mappings: [{
        source: 'EXISTING-DOC.md',
        target: 'docs/SECURITY.md',
        confidence: 'high',
        rationale: 'auth tokens',
        pendingLlmRefinement: false,
      }],
      orphans: [],
      sharedGlossary: [],
      pendingLlmRefinement: [],
      skippedDueToSecret: [],
      durationMs: 5,
    })
    await writeDiscoveryArtifact(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 1,
      blockedFiles: [{
        relativePath: 'SECRET-DOC.md',
        matches: [{ kind: 'aws-key', line: 1, snippet: 'AKIA...' }],
      }],
      durationMs: 5,
    })

    const report = await proposeMergeBatchStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('init-propose-merge')
    expect(report.needsUser).toBeDefined()
    expect(report.needsUser?.prompt).toBeTruthy()
    expect(report.needsUser?.options.length).toBeGreaterThan(0)
  })

  test('skips needsUser and console.logs diff in --dry-run mode', async () => {
    await writeDiscoveryArtifact(tmp, 'classification-result', {
      subagent_id: 'init-classify-blocks',
      mappings: [{
        source: 'EXISTING-DOC.md',
        target: 'docs/SECURITY.md',
        confidence: 'high',
        rationale: 'auth tokens',
        pendingLlmRefinement: false,
      }],
      orphans: [],
      sharedGlossary: [],
      pendingLlmRefinement: [],
      skippedDueToSecret: [],
      durationMs: 5,
    })
    await writeDiscoveryArtifact(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 0,
      blockedFiles: [],
      durationMs: 5,
    })

    const report = await proposeMergeBatchStep.run({
      cwd: tmp,
      args: ['--dry-run'],
      flags: { 'dry-run': true },
    })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('init-propose-merge')
    expect(report.needsUser).toBeUndefined()
  })

  test('early-skips in --additive-merge with summary containing "additive-merge"', async () => {
    const report = await proposeMergeBatchStep.run({
      cwd: tmp,
      args: ['--additive-merge'],
      flags: { 'additive-merge': true },
    })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('init-propose-merge')
    expect(report.summary).toContain('additive-merge')
    expect(report.needsUser).toBeUndefined()
  })
})
