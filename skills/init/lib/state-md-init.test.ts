// 2026-05-11 (Luiz/dev): testes de writeStackToStateMd.
// Plano 02 fase-06 — atende CA-19, CA-20, CA-21, G7 (D37 sem KP).
// RED: escritos antes de state-md-init.ts existir.
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — fixtures atualizadas (Plano 01 fase-03).

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { writeStackToStateMd } from './state-md-init'
import type { DetectedStack } from './detect-stack'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'state')

// 2026-05-18 (Luiz/dev): D22 — fixtures usam novo shape { primary, secondary, signalSource, anchorFiles }
const NEXTJS: DetectedStack = { primary: 'nextjs', secondary: [], signalSource: 'package.json#dependencies.next', anchorFiles: ['package.json'] }

describe('writeStackToStateMd', () => {
  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(path.join(FIXTURE, 'docs'), { recursive: true })
  })
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('CA-19: writes detected_stack: nextjs into docs/STATE.md', async () => {
    // STATE.md ja existe via scaffold (template):
    await fs.writeFile(
      path.join(FIXTURE, 'docs/STATE.md'),
      '# State\n\n## Resources\n\n- detected_stack: unknown\n\n## Recent Activity\n',
      'utf8',
    )

    const result = await writeStackToStateMd(FIXTURE, NEXTJS)
    expect(result.status).toBe('updated')

    const body = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(body).toContain('detected_stack: nextjs')
    expect(body).not.toContain('detected_stack: unknown') // substituido
  })

  it('creates STATE.md if absent (defensive)', async () => {
    const result = await writeStackToStateMd(FIXTURE, NEXTJS)
    expect(result.status).toBe('created')
    const body = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(body).toContain('detected_stack: nextjs')
  })

  it('is idempotent — re-write same stack produces same content', async () => {
    await writeStackToStateMd(FIXTURE, NEXTJS)
    const first = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    await writeStackToStateMd(FIXTURE, NEXTJS)
    const second = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(second).toBe(first)
  })

  it('CA-21: writes detected_stack: unknown when primary=null', async () => {
    // 2026-05-18 (Luiz/dev): D22 — primary null -> label 'unknown' preservado na saida (CA-10 compat)
    const result = await writeStackToStateMd(FIXTURE, { primary: null, secondary: [], signalSource: 'no signal', anchorFiles: [] })
    expect(result.status).toBe('created')
    const body = await fs.readFile(path.join(FIXTURE, 'docs/STATE.md'), 'utf8')
    expect(body).toContain('detected_stack: unknown')
  })

  it('does NOT create docs/knowledge/ directory (D37 — no KP in v6.0.0)', async () => {
    await writeStackToStateMd(FIXTURE, NEXTJS)
    const knowledgeExists = await fs.stat(path.join(FIXTURE, 'docs', 'knowledge')).then(() => true).catch(() => false)
    expect(knowledgeExists).toBe(false)
  })
})
