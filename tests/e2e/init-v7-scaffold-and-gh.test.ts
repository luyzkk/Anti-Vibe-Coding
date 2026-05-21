// tests/e2e/init-v7-scaffold-and-gh.test.ts
// 2026-05-21 (Luiz/dev): E2E Plano 03 fase-03 init-refactor-v7.
// Cobre CA-01 (placeholders + .github/ presentes), CA-02 (.claude/CLAUDE.md byte-identico),
// CA-08 (re-run skip-if-exists). Re-valida tracer global apos Steps 5-6 reais.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { registry } from '../../skills/init/lib/registry'
import { TEMPLATE_MANIFEST } from '../../skills/init/lib/template-manifest'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-e2e-scaffold-'))
}

describe('init v7 e2e — scaffold + gh (Plano 03 fase-03)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('registry: 05-scaffold-and-link na posicao 5, 06-install-gh-files na posicao 6', () => {
    // 2026-05-21 (Luiz/dev): contrato de ordem D12 (revisada por DV-1/DV-3 — pipeline 10 steps).
    const ids = registry.map((s) => s.id)
    expect(ids[4]).toBe('05-scaffold-and-link')
    expect(ids[5]).toBe('06-install-gh-files')
  })

  test('CA-01: greenfield (Node-TS) — runInit cria todos os placeholders do manifest + .github/ files', async () => {
    // 2026-05-21 (Luiz/dev): package.json minimo para Step 2 detectar stack node-ts.
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )

    const result = await runInit([], { cwd: tmp })
    expect(result.kind).toBe('ok')

    // 2026-05-21 (Luiz/dev): valida cada entry do manifest (cobre 4 extras AVC — RF-12).
    for (const entry of TEMPLATE_MANIFEST) {
      const stat = await fs.stat(path.join(tmp, entry.dst))
      expect(stat.isFile()).toBe(true)
    }

    // 2026-05-21 (Luiz/dev): valida .github/ files (Step 6).
    const yml = await fs.stat(path.join(tmp, '.github/workflows/harness.yml'))
    expect(yml.isFile()).toBe(true)
    const pr = await fs.stat(path.join(tmp, '.github/pull_request_template.md'))
    expect(pr.isFile()).toBe(true)

    // 2026-05-21 (Luiz/dev): valida link CLAUDE.md raiz ↔ AGENTS.md (Step 5 / linkClaudeToAgents).
    const rootClaude = await fs.stat(path.join(tmp, 'CLAUDE.md'))
    expect(rootClaude.isFile()).toBe(true)
  })

  test('CA-02: .claude/CLAUDE.md preexistente (533 linhas) — byte-identico apos runInit', async () => {
    // 2026-05-21 (Luiz/dev): cobre PRD linha 280 — invariante CA-02 ponta-a-ponta.
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    const original = Array.from({ length: 533 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    const claudeMdPath = path.join(tmp, '.claude', 'CLAUDE.md')
    await fs.writeFile(claudeMdPath, original, 'utf8')

    const result = await runInit([], { cwd: tmp })
    expect(result.kind).toBe('ok')

    const after = await fs.readFile(claudeMdPath, 'utf8')
    expect(after).toBe(original)
    expect(after.split('\n')).toHaveLength(533)
  })

  test('CA-08: re-run (idempotencia) — Steps 5-6 isolados nao sobrescrevem nenhum placeholder', async () => {
    // 2026-05-21 (Luiz/dev): cobre PRD CA-08 ponta-a-ponta para Steps 5-6.
    // NOTA: PRD DR-1 — gate de re-entrada aborta quando .claude/legacy-manifest.json existe.
    // Para isolar CA-08 do gate, testamos Steps 5-6 diretamente via registry.find().
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )
    await runInit([], { cwd: tmp })

    // Snapshot do estado apos primeiro run.
    const beforeSecond: Record<string, string> = {}
    for (const entry of TEMPLATE_MANIFEST) {
      beforeSecond[entry.dst] = await fs.readFile(path.join(tmp, entry.dst), 'utf8')
    }
    const ymlBefore = await fs.readFile(path.join(tmp, '.github/workflows/harness.yml'), 'utf8')
    const prBefore = await fs.readFile(path.join(tmp, '.github/pull_request_template.md'), 'utf8')

    // 2026-05-21 (Luiz/dev): re-rodar Steps 5-6 isoladamente (bypassa gate de re-entrada).
    const ctx = { cwd: tmp, args: [], flags: {} as Record<string, boolean | string> }
    const step5 = registry.find((s) => s.id === '05-scaffold-and-link')!
    const step6 = registry.find((s) => s.id === '06-install-gh-files')!
    const r5 = await step5.run(ctx)
    const r6 = await step6.run(ctx)

    // 2026-05-21 (Luiz/dev): summary do segundo run confirma 0 escritos, todos skipados.
    expect(r5.summary).toMatch(/placeholdersCreated:\s*0/)
    expect(r5.summary).toMatch(new RegExp(`placeholdersSkipped:\\s*${String(TEMPLATE_MANIFEST.length)}`))
    expect(r6.summary).toMatch(/ghFilesInstalled:\s*0/)
    expect(r6.summary).toMatch(/ghFilesSkipped:\s*2/)

    // 2026-05-21 (Luiz/dev): conteudo permanece byte-identico (defesa adicional).
    for (const entry of TEMPLATE_MANIFEST) {
      const after = await fs.readFile(path.join(tmp, entry.dst), 'utf8')
      const snapshot = beforeSecond[entry.dst]
      if (snapshot !== undefined) {
        expect(after).toBe(snapshot)
      }
    }
    const ymlAfter = await fs.readFile(path.join(tmp, '.github/workflows/harness.yml'), 'utf8')
    const prAfter = await fs.readFile(path.join(tmp, '.github/pull_request_template.md'), 'utf8')
    expect(ymlAfter).toBe(ymlBefore)
    expect(prAfter).toBe(prBefore)
  })
})
