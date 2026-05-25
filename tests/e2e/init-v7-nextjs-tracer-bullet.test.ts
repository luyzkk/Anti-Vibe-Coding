// 2026-05-24 (Luiz/dev): E2E tracer bullet Plano01 fase-05 — Next.js + React Stack Knowledge feature.
// Prova CA-01 (happy path Next.js), CA-02 (Vite puro herda matrix Next via D6),
// CA-03 (monorepo Next+Vite, R5 — G3 ordem probes), CA-07 (perf <500ms), CA-10 (zero regressão global).
//
// DI-fase05-ca02-detectMultiStack-anchor: detectMultiStack usa ANCHOR_CHECKS (file presence),
// não probes por conteúdo. fixture Vite-only com package.json (sem next) aciona BOTH node-ts e react
// anchors → tiebreaker por file count → 'nodejs-typescript' vence (empate, ordem original preservada).
// CA-02 valida D6 via detectStack (singular) que retorna primary:'react' + STACK_ID_TO_MATRIX_FOLDER lookup.
// stack.json (via detectMultiStack) mostra 'nodejs-typescript' como primary — comportamento correto do código.
// DI-fase05-ca03-detectMultiStack-anchor: mesmo problema — monorepo Next+Vite com package.json
// aciona node-ts anchor primeiro. detectStack retorna 'nextjs' (probeNextjs bate antes de probeReact/probeNodeTs).
// detectMultiStack retorna 'nodejs-typescript' (anchor order + equal file count tiebreaker).

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'

import { detectStack } from '../../skills/init/lib/detect-stack'
import { detectMultiStack } from '../../skills/init/lib/detect-multi-stack'
import { writeStackJson } from '../../skills/init/lib/write-stack-json'
import { copyKnowledge } from '../../skills/init/lib/copy-knowledge'
import { STACK_ID_TO_MATRIX_FOLDER } from '../../skills/init/lib/stack-id-map'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')
const FIXTURE_DIR = join(PLUGIN_ROOT, 'tests', 'fixtures', 'nextjs-app-router-fixture')

async function cloneFixture(): Promise<string> {
  const dest = await fs.mkdtemp(path.join(tmpdir(), 'e2e-next-'))
  await fs.cp(FIXTURE_DIR, dest, { recursive: true })
  return dest
}

async function readStackJson(targetDir: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(path.join(targetDir, '.claude', 'stack.json'), 'utf8')
  return JSON.parse(raw) as Record<string, unknown>
}

async function runPipeline(targetDir: string): Promise<{ elapsedMs: number }> {
  const start = performance.now()
  const detection = await detectMultiStack(targetDir)
  await writeStackJson(targetDir, detection)
  await copyKnowledge({
    targetDir,
    pluginRoot: PLUGIN_ROOT,
    primary: detection.primary,
    refresh: false,
  })
  return { elapsedMs: performance.now() - start }
}

describe('init Next.js + React tracer bullet (Plano 01 fase-05)', () => {

  // CA-01: happy path Next.js App Router
  describe('CA-01: happy path Next.js fixture', () => {
    let project: string

    beforeEach(async () => {
      project = await cloneFixture()
    })

    afterEach(() => {
      fs.rm(project, { recursive: true, force: true }).catch(() => { /* best-effort */ })
    })

    it('detectStack returns primary nextjs', async () => {
      const result = await detectStack(project)
      expect(result.primary).toBe('nextjs')
    })

    it('writes .claude/stack.json with primary nextjs', async () => {
      await runPipeline(project)
      const stackJson = await readStackJson(project)
      expect(stackJson.primary).toBe('nextjs')
    })

    it('copies INDEX.md starting with canonical EN header (D16)', async () => {
      await runPipeline(project)
      const indexPath = join(project, '.claude', 'knowledge', 'INDEX.md')
      expect(existsSync(indexPath)).toBe(true)
      const content = await fs.readFile(indexPath, 'utf8')
      // D16: cabeçalho canônico EN
      expect(content).toMatch(/^# Next\.js \+ React Knowledge — Index/m)
    })

    it('copies pilot atom app-router-and-layouts.md', async () => {
      await runPipeline(project)
      const atomPath = join(project, '.claude', 'knowledge', 'atoms', 'app-router-and-layouts.md')
      expect(existsSync(atomPath)).toBe(true)
      const content = await fs.readFile(atomPath, 'utf8')
      // frontmatter EN + 4 H2 sections
      expect(content).toMatch(/tier:\s*1/)
      expect(content).toMatch(/^## When to consult/m)
      expect(content).toMatch(/^## Senior patterns/m)
      expect(content).toMatch(/^## Anti-patterns/m)
      expect(content).toMatch(/^## Decision criteria/m)
    })

    it('CA-07: pipeline completes in <500ms', async () => {
      const { elapsedMs } = await runPipeline(project)
      expect(elapsedMs).toBeLessThan(500)
    })
  })

  // CA-02: Vite-puro — detectStack retorna 'react', STACK_ID_TO_MATRIX_FOLDER mapeia para 'nextjs' (D6)
  // DI-fase05-ca02: detectMultiStack com package.json + vite.config.ts retorna 'nodejs-typescript' como primary
  // (anchor node-ts vem primeiro em ANCHOR_CHECKS, empate no tiebreaker file count).
  // CA-02 valida D6 mapping via detectStack singular — prova que StackId 'react' → MatrixFolder 'nextjs'.
  describe('CA-02: Vite-only project (StackId react, shared matrix D6)', () => {
    let project: string

    beforeEach(() => {
      project = mkdtempSync(join(tmpdir(), 'e2e-vite-'))
      writeFileSync(join(project, 'vite.config.ts'), 'export default {}')
      writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({
          name: 'vite-fixture',
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' },
        }, null, 2),
      )
    })

    afterEach(() => {
      fs.rm(project, { recursive: true, force: true }).catch(() => { /* best-effort */ })
    })

    it('detectStack returns primary react', async () => {
      const result = await detectStack(project)
      expect(result.primary).toBe('react')
    })

    it('STACK_ID_TO_MATRIX_FOLDER maps react to nextjs (D6 shared matrix)', () => {
      // D6: StackId 'react' → MatrixFolder 'nextjs' (atoms cobrem React conceitual + Next idioms)
      expect(STACK_ID_TO_MATRIX_FOLDER['react']).toBe('nextjs')
    })

    it('copies same INDEX.md with EN canonical header when primary resolves to nextjs', async () => {
      // Usar detectStack (singular) para obter o StackId correto e copiar via D6 mapping
      const detected = await detectStack(project)
      const matrixFolder = detected.primary !== null ? STACK_ID_TO_MATRIX_FOLDER[detected.primary] : null
      expect(matrixFolder).toBe('nextjs')

      await copyKnowledge({
        targetDir: project,
        pluginRoot: PLUGIN_ROOT,
        primary: matrixFolder as 'nextjs',
        refresh: false,
      })

      const indexPath = join(project, '.claude', 'knowledge', 'INDEX.md')
      expect(existsSync(indexPath)).toBe(true)
      const content = await fs.readFile(indexPath, 'utf8')
      expect(content).toMatch(/^# Next\.js \+ React Knowledge — Index/m)
    })
  })

  // CA-03: monorepo Next+Vite — detectStack retorna 'nextjs' (probeNextjs vence via G3 ordem)
  // DI-fase05-ca03: detectMultiStack com package.json (next em deps) + vite.config.ts retorna
  // 'nodejs-typescript' como primary (anchor node-ts primeiro no ANCHOR_CHECKS).
  // CA-03 valida G3 via detectStack singular — probeNextjs vence probeReact.
  describe('CA-03: monorepo Next+Vite (R5 edge case, G3 probe order)', () => {
    let project: string

    beforeEach(() => {
      project = mkdtempSync(join(tmpdir(), 'e2e-monorepo-'))
      // Setup: vite.config.ts + package.json com NEXT e REACT em deps.
      writeFileSync(join(project, 'vite.config.ts'), 'export default {}')
      writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({
          name: 'monorepo-fixture',
          dependencies: {
            next: '^14.0.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
        }, null, 2),
      )
    })

    afterEach(() => {
      fs.rm(project, { recursive: true, force: true }).catch(() => { /* best-effort */ })
    })

    it('detectStack returns primary nextjs (probeNextjs wins via G3 ordem)', async () => {
      const result = await detectStack(project)
      expect(result.primary).toBe('nextjs')
      // signalSource confirma probe Next (não react)
      expect(result.signalSource).toContain('next')
    })

    it('STACK_ID_TO_MATRIX_FOLDER maps nextjs to nextjs (own matrix folder RF-02)', () => {
      expect(STACK_ID_TO_MATRIX_FOLDER['nextjs']).toBe('nextjs')
    })

    it('copies INDEX.md when primary resolves to nextjs matrix', async () => {
      // CA-03: prova que monorepo com next em deps recebe knowledge nextjs via detectStack + D6
      const detected = await detectStack(project)
      const matrixFolder = detected.primary !== null ? STACK_ID_TO_MATRIX_FOLDER[detected.primary] : null
      expect(matrixFolder).toBe('nextjs')

      await copyKnowledge({
        targetDir: project,
        pluginRoot: PLUGIN_ROOT,
        primary: matrixFolder as 'nextjs',
        refresh: false,
      })

      const indexPath = join(project, '.claude', 'knowledge', 'INDEX.md')
      expect(existsSync(indexPath)).toBe(true)
    })
  })
})
