// 2026-05-11 (Luiz/dev): valida fase-02 — arvore completa em fixture vazia.
// Plano 02 fase-02. Alinhado com PRD M2 e CA-06.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scaffoldFullTree } from './scaffold-full-tree'
import { TEMPLATE_MANIFEST } from './template-manifest'

const FIXTURE_DIR = path.join(import.meta.dir, '__fixtures__', 'tree')

async function clean(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
  await fs.mkdir(dir, { recursive: true })
}

describe('scaffoldFullTree', () => {
  beforeEach(async () => { await clean(FIXTURE_DIR) })
  afterEach(async () => { await fs.rm(FIXTURE_DIR, { recursive: true, force: true }) })

  it('writes every template from the manifest', async () => {
    const result = await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'fixture-app',
      stack: 'unknown',
    })

    expect(result.filesWritten.length).toBe(TEMPLATE_MANIFEST.length)

    for (const entry of TEMPLATE_MANIFEST) {
      const stat = await fs.stat(path.join(FIXTURE_DIR, entry.dst))
      expect(stat.isFile()).toBe(true)
    }
  })

  it('substitutes {{PROJECT_NAME}}, {{STACK}}, {{TODAY}} — no residuals', async () => {
    await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'fixture-app',
      stack: 'nextjs',
    })

    for (const entry of TEMPLATE_MANIFEST) {
      const body = await fs.readFile(path.join(FIXTURE_DIR, entry.dst), 'utf8')
      expect(body).not.toContain('{{PROJECT_NAME}}')
      expect(body).not.toContain('{{STACK}}')
      expect(body).not.toContain('{{TODAY}}')
    }
  })

  it('completes in under 1 second on empty fixture (perf budget — feeds CA-06 ≤60s)', async () => {
    const result = await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'perf-fixture',
      stack: 'unknown',
    })
    expect(result.durationMs).toBeLessThan(1000)
  })

  it('is idempotent — re-running overwrites without error', async () => {
    await scaffoldFullTree({ targetDir: FIXTURE_DIR, projectName: 'p', stack: 'unknown' })
    const second = await scaffoldFullTree({ targetDir: FIXTURE_DIR, projectName: 'p', stack: 'unknown' })
    expect(second.filesWritten.length).toBe(TEMPLATE_MANIFEST.length)
  })
})
