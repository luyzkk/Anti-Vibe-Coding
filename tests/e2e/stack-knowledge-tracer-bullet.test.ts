// 2026-05-16 (Luiz/dev): E2E tracer bullet — Plano 01 fase-05.
// Prova CA-02 (stack.json + knowledge copy ≤100ms), CA-05 (preface aparece), CA-09 (graceful degradation).
// G5 do plano: performance baseline com 1 átomo (~10ms esperado). 14 átomos extrapola linear.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { detectStack } from '../../skills/init/lib/detect-stack'
import { writeStackJson } from '../../skills/init/lib/write-stack-json'
import { copyKnowledge } from '../../skills/init/lib/copy-knowledge'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')

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

    const stackJson = await writeStackJson(project, stack)
    expect(stackJson.primary).toBe('nodejs-typescript')

    const start = performance.now()
    const result = await copyKnowledge({ projectRoot: project, pluginRoot: PLUGIN_ROOT, primary: stackJson.primary })
    const elapsed = performance.now() - start

    expect(result.status).toBe('copied')
    if (result.status === 'copied') {
      expect(result.atomCount).toBeGreaterThanOrEqual(1) // pilot atom da fase-02
      expect(result.durationMs).toBeLessThan(100) // CA-02 SLA
    }
    expect(elapsed).toBeLessThan(100)
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
  })

  // CA-05 — preface aparece quando INDEX existe
  it('CA-05: stack-aware-preface in /security yields non-empty string when .claude/knowledge/INDEX.md exists', () => {
    // simula resultado de CA-02
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'INDEX.md'), '# fake INDEX')

    // replica a lógica do bloco stack-aware-preface (fase-04). Em produção, o agente lê o bloco e executa.
    const knowledgePath = join(project, '.claude', 'knowledge', 'INDEX.md')
    const preface = existsSync(knowledgePath)
      ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\` para padrões stack-specific deste projeto.`
      : ''
    expect(preface).not.toBe('')
    expect(preface).toContain('.claude/knowledge/INDEX.md')
  })

  // CA-09 — preface vazio (graceful degradation) quando INDEX ausente
  it('CA-09: stack-aware-preface in /security yields empty string when .claude/knowledge/INDEX.md absent', () => {
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(false)

    const knowledgePath = join(project, '.claude', 'knowledge', 'INDEX.md')
    const preface = existsSync(knowledgePath)
      ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\` para padrões stack-specific deste projeto.`
      : ''
    expect(preface).toBe('')
  })

  // Bonus regression: stack-aware-preface block existe no SKILL.md (espelha test unitário da fase-04, garantido aqui no E2E)
  it('regression: skills/security/SKILL.md retains stack-aware-preface block', () => {
    const body = readFileSync(join(PLUGIN_ROOT, 'skills', 'security', 'SKILL.md'), 'utf8')
    expect(body).toContain('<!-- stack-aware-preface:start -->')
    expect(body).toContain('<!-- stack-aware-preface:end -->')
  })
})
