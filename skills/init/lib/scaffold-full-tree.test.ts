// 2026-05-11 (Luiz/dev): valida fase-02 — arvore completa em fixture vazia.
// Plano 02 fase-02. Alinhado com PRD M2 e CA-06.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scaffoldFullTree } from './scaffold-full-tree'
import { TEMPLATE_MANIFEST } from './template-manifest'
import { WriteRecorder, makeWriter } from './dry-run'

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

  // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — bug 3 (re-run sobrescrevia tudo).
  // Antes: filesWritten === TEMPLATE_MANIFEST.length em re-run (overwrite cego).
  // Apos: filesSkipped === TEMPLATE_MANIFEST.length, filesWritten vazio.
  it('preserves all existing files on re-run (no-overwrite guard)', async () => {
    await scaffoldFullTree({ targetDir: FIXTURE_DIR, projectName: 'p', stack: 'unknown' })
    const second = await scaffoldFullTree({ targetDir: FIXTURE_DIR, projectName: 'p', stack: 'unknown' })
    expect(second.filesWritten.length).toBe(0)
    expect(second.filesSkipped.length).toBe(TEMPLATE_MANIFEST.length)
  })

  // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — preserva README.md customizado.
  it('preserves preexisting README.md instead of overwriting', async () => {
    const readmePath = path.join(FIXTURE_DIR, 'README.md')
    const sentinel = '# User Custom README\n\nMy own content, do not touch.\n'
    await fs.writeFile(readmePath, sentinel, 'utf8')

    const result = await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'p',
      stack: 'unknown',
    })

    const preserved = await fs.readFile(readmePath, 'utf8')
    expect(preserved).toBe(sentinel)
    expect(result.filesSkipped).toContain(readmePath)
    expect(result.filesWritten).not.toContain(readmePath)
  })

  // 2026-05-19 (Luiz/dev): MH-03 — CODE_STYLE.md presente no scaffold greenfield.
  it('creates docs/CODE_STYLE.md as part of scaffold-full-tree', async () => {
    await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'fixture-app',
      stack: 'unknown',
    })

    const stat = await fs.stat(path.join(FIXTURE_DIR, 'docs/CODE_STYLE.md'))
    expect(stat.isFile()).toBe(true)
  })

  // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run nao toca disco.
  // makeWriter com dryRun:true + recorder redireciona writes p/ memoria. Zero fs.writeFile reais.
  it('respects injected writer in dry-run mode (zero fs.writeFile reais)', async () => {
    const recorder = new WriteRecorder()
    const writer = makeWriter({ dryRun: true, recorder })

    const result = await scaffoldFullTree({
      targetDir: FIXTURE_DIR,
      projectName: 'p',
      stack: 'unknown',
      writeFile: writer,
    })

    expect(recorder.count()).toBe(TEMPLATE_MANIFEST.length)
    expect(result.filesWritten.length).toBe(TEMPLATE_MANIFEST.length)

    // Verifica que nenhum arquivo realmente foi escrito em disco (fixture continua vazia)
    const entries = await fs.readdir(FIXTURE_DIR)
    expect(entries.length).toBe(0)
  })
})
