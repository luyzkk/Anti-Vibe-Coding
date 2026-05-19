// 2026-05-19 (Luiz/dev): Plano 05 fase-04 — tracer-bullet sob dispatcher orquestrado.
// Substitui chamadas diretas de lib (scaffoldTemplates/scaffoldFullTree/linkClaudeToAgents)
// por `runInit([], {...})` — alinha tracer com cutover. Resolve CA-10 + R5.
// G6 do plano: perda intencional — nao se testa mais a API de bibliotecas individuais;
// cobertura ja existe nos unit tests. Decisao registrada em MEMORY.md (DI-Plano05-fase04).

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'

const FIXTURE_SRC = path.join(import.meta.dir, '__fixtures__', 'init-greenfield')

async function captureLog(fn: () => Promise<unknown>): Promise<{ lines: string[]; result: unknown }> {
  const lines: string[] = []
  const orig = console.log
  console.log = (...args: unknown[]) => { lines.push(args.map(String).join(' ')) }
  try {
    const result = await fn()
    return { lines, result }
  } finally {
    console.log = orig
  }
}

describe('E2E tracer bullet — runInit dispatcher (CA-10, R5)', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(os.tmpdir(), 'tracer-bullet-'))
    await cp(FIXTURE_SRC, cwd, { recursive: true })
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  it('greenfield: runInit emits scaffold + PLAN.md + warning-mode validator + final message', async () => {
    const overallStart = Date.now()

    const { lines, result } = await captureLog(() =>
      runInit([], { cwd, log: (s: string) => console.log(s), askUser: async () => 'N' }),
    )

    // 1. dispatch terminou em ok
    expect((result as { kind: string }).kind).toBe('ok')

    // 2. scaffold completo: docs canonicos presentes (incluindo CODE_STYLE.md)
    // Note: core-beliefs.md esta em docs/design-docs/ (nao docs/CORE_BELIEFS.md)
    const docs = [
      'AGENTS.md', 'ARCHITECTURE.md', 'CLAUDE.md',
      'docs/DESIGN.md', 'docs/FRONTEND.md', 'docs/SECURITY.md',
      'docs/RELIABILITY.md', 'docs/PRODUCT_SENSE.md', 'docs/QUALITY_SCORE.md',
      'docs/PLANS.md', 'docs/design-docs/core-beliefs.md', 'docs/CODE_STYLE.md',
    ]
    for (const rel of docs) {
      const exists = await fs.stat(path.join(cwd, rel)).then(() => true).catch(() => false)
      expect(exists, `expected ${rel} to exist after runInit`).toBe(true)
    }

    // 3. Step 91 (Plano 03 fase-05) gerou PLAN.md populate com >=10 fases
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const dated = (await fs.readdir(activeDir)).find((n) => /populate-harness$/.test(n))
    expect(dated, 'expected docs/exec-plans/active/<DATE>-populate-harness folder').toBeDefined()
    const populateFolder = path.join(activeDir, String(dated))
    const planPath = path.join(populateFolder, 'PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf-8')
    // PLAN.md tem tabela de fases: linhas `| NN | \`doc\` | ... |`
    const tableRows = planContent.match(/^\| \d{2} \|/gm) ?? []
    expect(tableRows.length).toBeGreaterThanOrEqual(10) // CA-01: >=10 docs populaveis

    // 4. Fase files individuais existem e tem 4 blocos canonicos
    const phaseFiles = (await fs.readdir(populateFolder)).filter((f) => f.startsWith('fase-'))
    expect(phaseFiles.length).toBeGreaterThanOrEqual(10)
    // Verificar 4 blocos canonicos em um fase file representativo
    const samplePhase = await fs.readFile(path.join(populateFolder, phaseFiles[0]!), 'utf-8')
    expect(samplePhase).toContain('Inputs (docs')
    expect(samplePhase).toContain('Inputs (codigo)')
    expect(samplePhase).toContain('Instrucao LLM')
    expect(samplePhase).toContain('Criterio de done')

    // 5. Step 90 rodou em modo warning (nao abortou) — CA-07
    // Step id e 'final-validation' (sem prefixo numerico 90-)
    const log90 = lines.find((l) => l.startsWith('[final-validation]'))
    expect(log90, 'Step final-validation should have produced a log line').toBeDefined()
    expect(log90 ?? '').not.toContain('AbortError')

    // 6. CA-11 — mensagem final menciona /execute-plan + path do PLAN.md
    const tail = lines.slice(-12).join('\n')
    expect(tail).toContain('/anti-vibe-coding:execute-plan')
    expect(tail).toContain('populate-harness')

    // 7. progress.txt presente -> docs/compound/_imported/ populado
    const progressPath = path.join(cwd, '.claude', 'progress.txt')
    if (await fs.stat(progressPath).then(() => true).catch(() => false)) {
      const imported = await fs.readdir(path.join(cwd, 'docs', 'compound', '_imported'))
      expect(imported).toContain('INDEX.md')
      expect(imported.filter((f) => /^\d{4}-/.test(f)).length).toBeGreaterThanOrEqual(1)
    }

    // 8. budget
    const totalMs = Date.now() - overallStart
    expect(totalMs).toBeLessThan(30_000)
  })

  it('no references to removed steps 07/08/09/11 in registry', async () => {
    // Smoke check: importa registry e confirma IDs ausentes (CA-10)
    const { registry } = await import('../../skills/init/lib/registry')
    const ids = registry.map((s) => s.id)
    expect(ids).not.toContain('07-discover-existing-docs')
    expect(ids).not.toContain('08-classify-blocks-hybrid')
    expect(ids).not.toContain('09-propose-merge-batch')
    expect(ids).not.toContain('11-move-docs-with-stub')
  })
})
