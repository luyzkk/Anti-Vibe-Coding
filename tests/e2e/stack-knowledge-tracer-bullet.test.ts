// 2026-05-16 (Luiz/dev): E2E tracer bullet — Plano 01 fase-05.
// Prova CA-02 (stack.json + knowledge copy ≤100ms), CA-05 (preface aparece), CA-09 (graceful degradation).
// G5 do plano: performance baseline com 1 átomo (~10ms esperado). 14 átomos extrapola linear.
// 2026-05-16 (Luiz/dev): Plano 02 fase-05 — edge cases CA-03/CA-06/CA-07/CA-10 + NFR perf.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'

import { detectStack } from '../../skills/init/lib/detect-stack'
import { detectMultiStack } from '../../skills/init/lib/detect-multi-stack'
import { writeStackJson } from '../../skills/init/lib/write-stack-json'
import { copyKnowledge } from '../../skills/init/lib/copy-knowledge'
import { writeStackToStateMd } from '../../skills/init/lib/state-md-init'
import { getStackKnowledgePreface, PREFACE_MESSAGE } from '../../skills/security/lib/stack-aware-preface'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')

// 2026-05-16 (Luiz/dev): helpers comuns para edge cases — Plano 02 fase-05. Plano 06 fase-06 reutiliza.
async function cloneFixture(fixtureName: string): Promise<string> {
  const src = path.join(import.meta.dir, '..', 'fixtures', 'stack-knowledge', fixtureName)
  const dest = await fs.mkdtemp(path.join(tmpdir(), `e2e-${fixtureName}-`))
  await fs.cp(src, dest, { recursive: true })
  return dest
}

async function readStackJsonRaw(targetDir: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(targetDir, '.claude', 'stack.json'), 'utf8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

async function readStateMd(targetDir: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(targetDir, 'docs', 'STATE.md'), 'utf8')
  } catch {
    return null
  }
}

async function runInit(targetDir: string, args: string = ''): Promise<{ output: string }> {
  // 2026-05-16 (Luiz/dev): /init orquestrado via helpers diretos — evita acoplamento ao executor de slash commands.
  // Pattern espelha init-tracer-bullet.test.ts.
  const detection = await detectMultiStack(targetDir)
  await writeStackJson(targetDir, detection)
  const refresh = args.includes('--refresh-knowledge')
  const copyResult = await copyKnowledge({
    targetDir,
    pluginRoot: PLUGIN_ROOT,
    primary: detection.primary,
    refresh,
  })
  return { output: copyResult.message }
}

describe('stack-knowledge tracer bullet (Plano 01 fase-05)', () => {
  let project: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'tracer-stack-'))
    // projeto Node+TS minimal
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0.0' } }, null, 2),
    )
    writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }')
  })

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
  })

  // CA-02 — happy path Node+TS
  it('CA-02: writes .claude/stack.json with primary nodejs-typescript and copies knowledge in ≤100ms', async () => {
    const stack = await detectStack(project)
    expect(stack.id).toBe('node-ts')

    // 2026-05-16 (Luiz/dev): Plano 02 fase-02 — writeStackJson now receives MultiStackResult.
    const multiResult = await detectMultiStack(project)
    const { written: stackJson } = await writeStackJson(project, multiResult)
    expect(stackJson.primary).toBe('nodejs-typescript')

    const start = performance.now()
    // 2026-05-16 (Luiz/dev): Plano 02 fase-03 — nova assinatura targetDir (não projectRoot), sem durationMs.
    const result = await copyKnowledge({ targetDir: project, pluginRoot: PLUGIN_ROOT, primary: stackJson.primary })
    const elapsed = performance.now() - start

    expect(result.status).toBe('copied')
    expect(result.atomCount).toBeGreaterThanOrEqual(1) // pilot atom da fase-02
    // CA-02 SLA: ≤100ms medido externamente (durationMs removido do contrato em fase-03)
    expect(elapsed).toBeLessThan(100)
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
  })

  // CA-05 — preface aparece quando INDEX existe
  // 2026-05-16 (Luiz/dev): verify-work HIGH #4 — usa helper real (não replica inline)
  it('CA-05: stack-aware-preface in /security yields non-empty string when .claude/knowledge/INDEX.md exists', () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'INDEX.md'), '# fake INDEX')

    const preface = getStackKnowledgePreface(project)
    expect(preface).toBe(PREFACE_MESSAGE)
    expect(preface).toContain('.claude/knowledge/INDEX.md')
  })

  // CA-09 — preface vazio (graceful degradation) quando INDEX ausente
  it('CA-09: stack-aware-preface in /security yields empty string when .claude/knowledge/INDEX.md absent', () => {
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(false)
    expect(getStackKnowledgePreface(project)).toBe('')
  })

  // Bonus regression: stack-aware-preface block existe no SKILL.md (espelha test unitário da fase-04, garantido aqui no E2E)
  it('regression: skills/security/SKILL.md retains stack-aware-preface block', () => {
    const body = readFileSync(join(PLUGIN_ROOT, 'skills', 'security', 'SKILL.md'), 'utf8')
    expect(body).toContain('<!-- stack-aware-preface:start -->')
    expect(body).toContain('<!-- stack-aware-preface:end -->')
  })
})

// 2026-05-16 (Luiz/dev): edge cases — CA-03/CA-06/CA-07/CA-10 + NFR perf.
// Plano 02 fase-05: extensão do E2E com fixtures isolados em tests/fixtures/stack-knowledge/.
describe('stack-knowledge E2E — edge cases (Plano 02 fase-05)', () => {
  // 2026-05-16 (Luiz/dev): CA-03 — Rails puro: primary=rails, no-source pq docs/knowledge/rails não existe em v6.3.2.
  it('CA-03: Rails puro grava primary=rails, secondary=[], knowledge NÃO copiado (no-source)', async () => {
    const dir = await cloneFixture('rails-only')
    try {
      const { output } = await runInit(dir)
      const stackJson = await readStackJsonRaw(dir)
      expect(stackJson).not.toBeNull()
      expect(stackJson!.primary).toBe('rails')
      expect(stackJson!.secondary).toEqual([])
      expect(stackJson!.anchor_files).toEqual(['Gemfile'])
      // 2026-05-16 (Luiz/dev): em v6.3.2 não existe docs/knowledge/rails/ → copy-knowledge retorna no-source
      expect(output).toContain('rails')
      expect(output).toMatch(/não foi copiado/i)
      // Garantia: pasta knowledge/ NÃO foi criada (ou foi criada mas vazia)
      const knowledgeExists = await fs.access(path.join(dir, '.claude', 'knowledge')).then(() => true).catch(() => false)
      if (knowledgeExists) {
        const entries = await fs.readdir(path.join(dir, '.claude', 'knowledge'))
        expect(entries).toHaveLength(0)
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  // 2026-05-16 (Luiz/dev): CA-06 — sem anchor file: primary=null, output literal, sem crash.
  it('CA-06: projeto sem anchor file grava primary=null, sem crash', async () => {
    const dir = await cloneFixture('no-anchor')
    try {
      const { output } = await runInit(dir)
      const stackJson = await readStackJsonRaw(dir)
      expect(stackJson).not.toBeNull()
      expect(stackJson!.primary).toBeNull()
      expect(stackJson!.secondary).toEqual([])
      expect(stackJson!.anchor_files).toEqual([])
      expect(output).toBe('Stack não detectada. Knowledge não foi copiado.')
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  // 2026-05-16 (Luiz/dev): CA-07 — multi-stack Rails+Node: 5 .rb vs 1 .ts → tiebreaker → primary=rails.
  it('CA-07: multi-stack Rails+Node (maioria .rb) grava primary=rails, secondary=[nodejs-typescript]', async () => {
    const dir = await cloneFixture('multi-stack')
    try {
      await runInit(dir)
      const stackJson = await readStackJsonRaw(dir)
      expect(stackJson).not.toBeNull()
      expect(stackJson!.primary).toBe('rails')
      expect(stackJson!.secondary).toEqual(['nodejs-typescript'])
      const anchorFiles = (stackJson!.anchor_files as string[]).sort()
      expect(anchorFiles).toEqual(['Gemfile', 'package.json'])
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  // 2026-05-16 (Luiz/dev): CA-10 regressão — STATE.md mantém StackId interno (node-ts), stack.json usa matrix folder (nodejs-typescript).
  // G1: guard test que falhará se state-md-init.ts for alterado.
  it('CA-10 regressão: STATE.md mantém detected_stack: node-ts (StackId), stack.json.primary=nodejs-typescript (matrix folder)', async () => {
    const dir = await cloneFixture('node-ts-only')
    try {
      // Criar STATE.md mínimo com placeholder
      await fs.mkdir(path.join(dir, 'docs'), { recursive: true })
      await fs.writeFile(path.join(dir, 'docs', 'STATE.md'), '# STATE\n\n- detected_stack: __PLACEHOLDER__\n')

      // writeStackToStateMd usa detectStack (singular) — StackId interno
      const detected = await detectStack(dir)
      await writeStackToStateMd(dir, detected)

      // runInit grava .claude/stack.json com primary=nodejs-typescript (matrix folder)
      await runInit(dir)

      const stateMd = await readStateMd(dir)
      expect(stateMd).not.toBeNull()
      // 2026-05-16 (Luiz/dev): CA-10 asserção — alinhada com PRD §Critérios de Aceite (DI-1/DI-2).
      expect(stateMd).toContain('detected_stack: node-ts')       // StackId interno preservado
      expect(stateMd).not.toContain('detected_stack: nodejs-typescript') // matrix folder NÃO vaza para STATE.md

      const stackJson = await readStackJsonRaw(dir)
      expect(stackJson).not.toBeNull()
      expect(stackJson!.primary).toBe('nodejs-typescript')       // matrix folder em stack.json
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  // 2026-05-16 (Luiz/dev): NFR perf — detectMultiStack < 500ms em fixture sintético.
  it('NFR perf: detectMultiStack completes in < 500ms on multi-stack fixture', async () => {
    const dir = await cloneFixture('multi-stack')
    try {
      const start = Date.now()
      await detectMultiStack(dir)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(500)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  // 2026-05-16 (Luiz/dev): NFR perf — copyKnowledge (Node+TS, 1 átomo piloto) < 100ms.
  it('NFR perf: copyKnowledge (Node+TS happy path) completes in < 100ms', async () => {
    const dir = await cloneFixture('node-ts-only')
    try {
      const start = Date.now()
      await copyKnowledge({ targetDir: dir, pluginRoot: PLUGIN_ROOT, primary: 'nodejs-typescript' })
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(100)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})
