// skills/init/lib/steps/05-scaffold-and-link.test.ts
// 2026-05-21 (Luiz/dev): Step 5 — scaffold-and-link REAL (Plano 03 fase-01 init-refactor-v7).
// Cobre RF-03 (scaffold 36 placeholders), CA-02 (.claude/CLAUDE.md preservado), CA-08 (skip-if-exists),
// D4 (sem dry-run/noWrite), G6 (link APOS scaffold).
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scaffoldAndLinkStep } from './05-scaffold-and-link'
import { TEMPLATE_MANIFEST } from '../template-manifest'

async function mkTmp(): Promise<string> {
  // 2026-05-21 (Luiz/dev): fixture isolada por teste — evita poluicao cross-test (PRD NFR).
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-step5-'))
}

describe('scaffoldAndLinkStep (Step 5 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = 05-scaffold-and-link', () => {
    // 2026-05-21 (Luiz/dev): id e contrato com registry.ts e tracer e2e (PRD CA-09).
    expect(scaffoldAndLinkStep.id).toBe('05-scaffold-and-link')
  })

  test('greenfield: escreve todos os placeholders do TEMPLATE_MANIFEST e linka CLAUDE.md raiz', async () => {
    // 2026-05-21 (Luiz/dev): cobre RF-03 — 36 placeholders criados (incluindo 4 extras AVC).
    const report = await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    // 2026-05-21 (Luiz/dev): summary multilinha contem 3 metricas observabilidade (PRD NFR linha 211).
    expect(report.summary).toMatch(/placeholdersCreated:\s*\d+/)
    expect(report.summary).toMatch(/placeholdersSkipped:\s*\d+/)
    expect(report.summary).toMatch(/Linked via tier:\s*(symlink|hardlink|copy-with-hook)/)

    // 2026-05-21 (Luiz/dev): assert por arquivo — RF-12 4 docs extras AVC presentes (G5 do README).
    const extras = [
      'docs/MERGE_GATES.md',
      'docs/CODE_STYLE.md',
      'docs/STATE.md',
      '.claude/CLAUDE.md',
    ]
    for (const rel of extras) {
      const stat = await fs.stat(path.join(tmp, rel))
      expect(stat.isFile()).toBe(true)
    }

    // 2026-05-21 (Luiz/dev): contagem total bate com TEMPLATE_MANIFEST (PRD CA-01).
    for (const entry of TEMPLATE_MANIFEST) {
      const stat = await fs.stat(path.join(tmp, entry.dst))
      expect(stat.isFile()).toBe(true)
    }
  })

  test('re-run: nenhum arquivo sobrescrito — skip-if-exists ativo (CA-08)', async () => {
    // 2026-05-21 (Luiz/dev): primeira execucao popula; segunda deve skipar tudo (PRD CA-08).
    await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })
    const second = await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })

    // 2026-05-21 (Luiz/dev): placeholdersCreated deve ser 0 no re-run (todos ja existem).
    expect(second.summary).toMatch(/placeholdersCreated:\s*0/)
    expect(second.summary).toMatch(new RegExp(`placeholdersSkipped:\\s*${String(TEMPLATE_MANIFEST.length)}`))
  })

  test('CA-02 / D16: .claude/CLAUDE.md preexistente (533 linhas) e byte-identico apos run', async () => {
    // 2026-05-21 (Luiz/dev): cobre CA-02 — PRD linha 280 ("533 linhas antes, 533 linhas depois").
    // Numero 533 escolhido por simetria com evidencia do CLAUDE.md destruido pelo init v6.7.
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    const original = Array.from({ length: 533 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    const claudeMdPath = path.join(tmp, '.claude', 'CLAUDE.md')
    await fs.writeFile(claudeMdPath, original, 'utf8')

    const report = await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })

    const after = await fs.readFile(claudeMdPath, 'utf8')
    // 2026-05-21 (Luiz/dev): invariante byte-identico — sem byte adicionado ou removido.
    expect(after).toBe(original)
    // 2026-05-21 (Luiz/dev): invariante line-count — CA-02 explicito.
    expect(after.split('\n')).toHaveLength(533)
    // 2026-05-21 (Luiz/dev): summary deve mostrar o skip do .claude/CLAUDE.md.
    expect(report.summary).toMatch(/placeholdersSkipped:\s*[1-9]/)
  })

  test('D4: zero imports de dry-run no codigo do step', async () => {
    // 2026-05-21 (Luiz/dev): meta-test — garante que D4 (CONTEXT linha 38) eh respeitado
    // pelo arquivo do step. Se algum dev re-introduzir isDryRun/WriteRecorder, este teste quebra.
    const src = await fs.readFile(
      path.join(import.meta.dir, '05-scaffold-and-link.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/isDryRun|WriteRecorder|makeWriter|dry-run-mode/)
  })
})
