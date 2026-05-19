// tests/e2e/ca12-greenfield-populate-validate.test.ts
// 2026-05-18 (Luiz/dev): CA-12 do PRD refactor-init-harness-populate-merge.
// E2E greenfield: init -> PLAN.md de populacao -> harness:validate exit 0.

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { cp } from 'node:fs/promises'
import { runInit } from '../../skills/init/lib/run-init'

const FIXTURE = path.join(import.meta.dir, '..', 'fixtures', 'greenfield-v6.4')
const PLUGIN_ROOT = path.join(import.meta.dir, '..', '..')

async function runHarnessValidate(cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // 2026-05-18 (Luiz/dev): harness:validate usa process.cwd() como root.
    // Spawn com { cwd } aponta o validator para o tmpdir gerado pelo init.
    // Padrao espelhado de tests/e2e/init-tracer-bullet.test.ts.
    const proc = spawn('bun', ['run', 'scripts/harness-validate.ts'], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

describe('CA-12 E2E greenfield populate-validate', () => {
  let tmp: string

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ca12-greenfield-'))
    await cp(FIXTURE, tmp, { recursive: true })
    // 2026-05-18 (Luiz/dev): runInit em greenfield — sem CLAUDE.md, sem docs/.
    // askUser retorna 'N' para delivery-loop (sem populacao interativa no teste).
    await runInit([], { cwd: tmp, askUser: async () => 'N' })
  }, 120_000)

  afterAll(async () => {
    try { await fs.rm(tmp, { recursive: true, force: true }) } catch { /* G12 — Windows handle leak tolerated */ }
  })

  it('runInit em greenfield-v6.4 completa sem AbortError', async () => {
    // Se chegou aqui, beforeAll nao lancou — init completou sem AbortError.
    // CA-11: registry executa todos os steps sem erro em greenfield.
    expect(tmp).toBeTruthy()
    expect(await fs.access(path.join(tmp, 'AGENTS.md')).then(() => true).catch(() => false)).toBe(true)
  })

  it('emite docs/exec-plans/active/{date}-populate-harness/PLAN.md com >= 5 tasks', async () => {
    const activeDir = path.join(tmp, 'docs', 'exec-plans', 'active')
    const dirs = await fs.readdir(activeDir)
    const populateDir = dirs.find((d) => d.endsWith('-populate-harness'))
    expect(populateDir).toBeTruthy()

    const planPath = path.join(activeDir, populateDir!, 'PLAN.md')
    expect(await fs.access(planPath).then(() => true).catch(() => false)).toBe(true)

    const planContent = await fs.readFile(planPath, 'utf-8')
    // 2026-05-19 (Luiz/dev): Plano 05 fase-04 — PLAN.md v2 usa tabela de fases (nao ### Task).
    // Formato v2: linhas `| NN | \`doc\` | [fase-NN-slug.md](./...) | aberta |`
    // CA-01: pelo menos 5 fases (proxy conservador de TEMPLATE_MANIFEST.length - filosoficos).
    const tableRows = (planContent.match(/^\| \d{2} \|/gm) ?? []).length
    expect(tableRows).toBeGreaterThanOrEqual(5)

    // SH-06: PLAN.md v2 nao tem task validate separada — a instrucao esta no 'Como executar'.
    // 2026-05-19 (Luiz/dev): Plano 05 fase-04 — v2 renderer nao emite Validate Harness task.
    // Verificar que 'Como executar' esta presente (substituto do antigo SH-06).
    expect(planContent).toContain('Como executar')
  })

  it('harness:validate exit 0 e AGENTS.md root tem <= 40 linhas sem placeholders', async () => {
    // 2026-05-18 (Luiz/dev): template AGENTS.md.tpl tem 38 linhas com links obrigatorios.
    // Nao e necessario simular execute-plan — scaffold ja produz AGENTS.md valido.
    // CA-12 E2E REAL (invocar /execute-plan programaticamente) deferido para v6.5+.
    const validateResult = await runHarnessValidate(tmp)
    if (validateResult.code !== 0) {
      console.error('harness:validate stderr:', validateResult.stderr)
      console.error('harness:validate stdout:', validateResult.stdout)
    }
    expect(validateResult.code).toBe(0)

    const agentsMd = await fs.readFile(path.join(tmp, 'AGENTS.md'), 'utf-8')
    const lineCount = agentsMd.trimEnd().split('\n').length
    expect(lineCount).toBeLessThanOrEqual(40)
    expect(agentsMd).not.toMatch(/<<PLACEHOLDER>>/)
    expect(agentsMd).not.toMatch(/TODO populate/i)
  }, 60_000)
})
