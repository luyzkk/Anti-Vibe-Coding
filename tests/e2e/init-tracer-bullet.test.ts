// 2026-05-11 (Luiz/dev): tracer bullet E2E — prova D2, D13, D16 juntos.
// Plano 01 fase-05. Atualizado em Plano 02 fase-02: scaffold gera 27 arquivos (2 base + 25 tree).

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { scaffoldTemplates } from '../../skills/init/lib/scaffold-templates'
import { scaffoldFullTree } from '../../skills/init/lib/scaffold-full-tree'
import { linkClaudeToAgents } from '../../skills/init/lib/symlink-fallback'

const FIXTURE = path.join(import.meta.dir, '..', 'fixtures', 'empty-dir')
const TEMPLATES = path.join(import.meta.dir, '..', '..', 'skills/init/assets/templates')

async function runValidator(cwd: string): Promise<{ code: number; stderr: string; stdout: string; durationMs: number }> {
  const start = Date.now()
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', 'scripts/harness-validate.ts'], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d })
    proc.stderr.on('data', (d) => { stderr += d })
    proc.on('exit', (code) => resolve({
      code: code ?? -1,
      stderr,
      stdout,
      durationMs: Date.now() - start,
    }))
  })
}

describe('E2E tracer bullet — /init → harness-validate', () => {
  beforeEach(async () => {
    // Limpar tudo dentro de FIXTURE exceto .gitignore e .gitkeep
    const entries = await fs.readdir(FIXTURE)
    for (const entry of entries) {
      if (entry === '.gitignore' || entry === '.gitkeep') continue
      await fs.rm(path.join(FIXTURE, entry), { recursive: true, force: true })
    }
  })

  afterEach(async () => {
    // Mesma limpeza
    const entries = await fs.readdir(FIXTURE)
    for (const entry of entries) {
      if (entry === '.gitignore' || entry === '.gitkeep') continue
      await fs.rm(path.join(FIXTURE, entry), { recursive: true, force: true })
    }
  })

  it('runs full init flow and validator exits 0 in under 30s', async () => {
    const overallStart = Date.now()

    // Step 1 — scaffold templates (fase-02 + fase-04)
    const scaffoldResult = await scaffoldTemplates({
      targetDir: FIXTURE,
      templatesDir: TEMPLATES,
      projectName: 'tracer-fixture',
      stack: 'unknown',
    })

    expect(await fs.stat(path.join(FIXTURE, 'AGENTS.md'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, 'ARCHITECTURE.md'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, 'scripts/harness-validate.ts'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, 'package.json'))).toBeDefined()

    // Step 1b — scaffold full tree (Plano 02 fase-02: 14+ docs)
    // 2026-05-11 (Luiz/dev): apos fase-02 do Plano 02, scaffold gera 27 arquivos (2 base + 25 tree).
    const treeResult = await scaffoldFullTree({
      targetDir: FIXTURE,
      projectName: 'tracer-fixture',
      stack: 'unknown',
    })

    expect(scaffoldResult.filesWritten.length + treeResult.filesWritten.length).toBeGreaterThanOrEqual(27)

    // Step 2 — link CLAUDE.md to AGENTS.md (fase-03)
    const linkResult = await linkClaudeToAgents(FIXTURE)
    expect(['symlink', 'hardlink', 'copy-with-hook']).toContain(linkResult.tier)

    const claudeContent = await fs.readFile(path.join(FIXTURE, 'CLAUDE.md'), 'utf8')
    const agentsContent = await fs.readFile(path.join(FIXTURE, 'AGENTS.md'), 'utf8')
    expect(claudeContent).toBe(agentsContent)

    // Step 3 — rodar validator
    const validatorResult = await runValidator(FIXTURE)
    expect(validatorResult.code).toBe(0)
    expect(validatorResult.stdout).toContain('Harness validation passed')
    expect(validatorResult.durationMs).toBeLessThan(2000) // CA-26 com folga

    // Step 4 — orcamento total <=30s
    const totalMs = Date.now() - overallStart
    expect(totalMs).toBeLessThan(30_000)

    console.log(`Tracer bullet end-to-end: ${totalMs}ms (link tier: ${linkResult.tier})`)
  })

  it('detects regressions: hand-edit AGENTS.md to 50 lines → validator exits 1', async () => {
    // scaffold + link + AGENTS bloated → validator deve rejeitar
    await scaffoldTemplates({
      targetDir: FIXTURE,
      templatesDir: TEMPLATES,
      projectName: 'regression-fixture',
      stack: 'unknown',
    })
    await linkClaudeToAgents(FIXTURE)

    // Inflar AGENTS.md para 50 linhas
    const bloated = Array.from({ length: 50 }, (_, i) => `# Line ${i}`).join('\n')
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), bloated, 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('40 lines or fewer')
  })
})
