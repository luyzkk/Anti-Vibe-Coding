// 2026-05-18 (Luiz/dev): TDD RED — Step 11 move-docs-with-stub (Plano 04 fase-05)

import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { moveDocsWithStubStep } from './11-move-docs-with-stub'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-move-docs-'))
}

async function writeDiscovery(
  cwd: string,
  name: string,
  data: unknown,
): Promise<void> {
  const dir = path.join(cwd, '.anti-vibe', 'discovery')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2), 'utf8')
}

describe('moveDocsWithStubStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('moves classified docs and writes stubs at old paths', async () => {
    // Write the source doc
    const docsDir = path.join(tmp, 'docs')
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(path.join(tmp, 'docs', 'ARCHITECTURE.md'), '# Architecture\n\nDesign patterns.', 'utf8')

    // Classification result with one mapped doc
    await writeDiscovery(tmp, 'classification-result', {
      mappings: [
        { source: 'docs/ARCHITECTURE.md', target: 'docs/DESIGN.md', confidence: 'high', rationale: 'heuristic', pendingLlmRefinement: false },
      ],
      orphans: [],
      sharedGlossary: [],
    })
    // No blocked files
    await writeDiscovery(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 1,
      blockedFiles: [],
      durationMs: 0,
    })

    const report = await moveDocsWithStubStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('init-move-docs')

    // Target file should exist with original content
    const targetContent = await fs.readFile(path.join(tmp, 'docs', 'DESIGN.md'), 'utf8')
    expect(targetContent).toContain('Architecture')

    // Stub should exist at old path
    const stubContent = await fs.readFile(path.join(tmp, 'docs', 'ARCHITECTURE.md'), 'utf8')
    expect(stubContent).toContain('Moved')
    expect(stubContent).toContain('DESIGN.md')
  })

  test('routes orphans to docs/references/', async () => {
    const docsDir = path.join(tmp, 'docs')
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(path.join(tmp, 'docs', 'RANDOM_NOTE.md'), '# Random note\n\nSome content.', 'utf8')

    await writeDiscovery(tmp, 'classification-result', {
      mappings: [],
      orphans: [
        { source: 'docs/RANDOM_NOTE.md', target: 'docs/references/RANDOM_NOTE.md', reason: 'no heuristic match' },
      ],
      sharedGlossary: [],
    })
    await writeDiscovery(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 1,
      blockedFiles: [],
      durationMs: 0,
    })

    const report = await moveDocsWithStubStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('init-move-docs')

    // Orphan routed to docs/references/
    const refDir = path.join(tmp, 'docs', 'references')
    const refContent = await fs.readFile(path.join(refDir, 'RANDOM_NOTE.md'), 'utf8')
    expect(refContent).toContain('Random note')
  })

  test('skips README.md (conservative v1 — any README is protected)', async () => {
    const docsDir = path.join(tmp, 'docs')
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(path.join(tmp, 'README.md'), '# Root README\n\nProject.', 'utf8')
    await fs.writeFile(path.join(tmp, 'docs', 'README.md'), '# Docs README\n\nDocs.', 'utf8')

    await writeDiscovery(tmp, 'classification-result', {
      mappings: [
        { source: 'README.md', target: 'docs/DESIGN.md', confidence: 'low', rationale: 'heuristic', pendingLlmRefinement: true },
        { source: 'docs/README.md', target: 'docs/DESIGN.md', confidence: 'low', rationale: 'heuristic', pendingLlmRefinement: true },
      ],
      orphans: [],
      sharedGlossary: [],
    })
    await writeDiscovery(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 2,
      blockedFiles: [],
      durationMs: 0,
    })

    const report = await moveDocsWithStubStep.run({ cwd: tmp, args: [], flags: {} })

    // Both READMEs skipped — mutated should be false (0 moved)
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('init-move-docs')

    // Original README.md at root still intact (not moved/stubbed)
    const rootReadme = await fs.readFile(path.join(tmp, 'README.md'), 'utf8')
    expect(rootReadme).toContain('Root README')

    // Original README.md in docs still intact
    const docsReadme = await fs.readFile(path.join(tmp, 'docs', 'README.md'), 'utf8')
    expect(docsReadme).toContain('Docs README')
  })

  test('skips files that appear in blockedFiles from secrets-scan-result', async () => {
    const docsDir = path.join(tmp, 'docs')
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(path.join(tmp, 'docs', 'STRIPE.md'), '# Stripe\n\nsk_live_abc123xyz456secret7890abcdef.', 'utf8')
    await fs.writeFile(path.join(tmp, 'docs', 'DESIGN.md'), '# Design\n\nArchitecture.', 'utf8')

    await writeDiscovery(tmp, 'classification-result', {
      mappings: [
        { source: 'docs/STRIPE.md', target: 'docs/SECURITY.md', confidence: 'high', rationale: 'heuristic', pendingLlmRefinement: false },
        { source: 'docs/DESIGN.md', target: 'docs/RELIABILITY.md', confidence: 'medium', rationale: 'heuristic', pendingLlmRefinement: true },
      ],
      orphans: [],
      sharedGlossary: [],
    })
    // STRIPE.md is blocked
    await writeDiscovery(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 2,
      blockedFiles: [
        { relativePath: 'docs/STRIPE.md', matches: [] },
      ],
      durationMs: 0,
    })

    const report = await moveDocsWithStubStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.summary).toContain('init-move-docs')

    // STRIPE.md should still be at original path (not moved/stubbed)
    const stripeContent = await fs.readFile(path.join(tmp, 'docs', 'STRIPE.md'), 'utf8')
    expect(stripeContent).toContain('Stripe')

    // DESIGN.md was not in blockedFiles — should have been processed
    // (DESIGN.md → RELIABILITY.md move)
    const reliabilityExists = await fs.readFile(path.join(tmp, 'docs', 'RELIABILITY.md'), 'utf8').then(() => true).catch(() => false)
    expect(reliabilityExists).toBe(true)
  })
})
