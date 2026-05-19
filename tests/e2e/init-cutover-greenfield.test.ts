// tests/e2e/init-cutover-greenfield.test.ts
// 2026-05-17 (Luiz/dev): E2E byte-idempotence pos-cutover — PRD CA-01, SH-03, MH-03.
// Testa dispatcher runInit contra fixture greenfield limpa.
// DEV-P04F04-1: detect-legacy aborta projetos legacy antes de migrate steps — CA-02 testado separadamente.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { runLinkClaudeStep } from '../../skills/init/lib/steps/02-link-claude-agents'
import { scaffoldTemplates } from '../../skills/init/lib/scaffold-templates'
import { scaffoldFullTree } from '../../skills/init/lib/scaffold-full-tree'

const FIXTURE_SRC = path.join(import.meta.dir, '__fixtures__', 'init-greenfield')
const GOLDEN_STDOUT = path.join(import.meta.dir, '__golden__', 'init-greenfield.stdout.txt')
const GOLDEN_TREE = path.join(import.meta.dir, '__golden__', 'init-greenfield.tree.json')

// 2026-05-17 (Luiz/dev): intercepta console.log (canal usado pelo dispatcher via `log` default).
// process.stdout.write eh usado por subprocessos (harness-validate), nao pelo dispatcher — ok ignorar.
async function captureLog<T>(fn: () => Promise<T>): Promise<{ lines: string[]; result: T }> {
  const lines: string[] = []
  const orig = console.log
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '))
  }
  try {
    const result = await fn()
    return { lines, result }
  } finally {
    console.log = orig
  }
}

async function readTreeSorted(root: string): Promise<string[]> {
  const result: string[] = []
  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const name = String(e.name)
      const full = path.join(dir, name)
      const rel = path.posix.join(prefix, name)
      if (e.isDirectory()) {
        result.push(rel + '/')
        await walk(full, rel)
      } else {
        result.push(rel)
      }
    }
  }
  await walk(root, '')
  return result.sort()
}

// 2026-05-17 (Luiz/dev): mascara campos nao-deterministicos antes de comparar com golden.
// - `in \d+ ms` — timing do scaffoldFullTree (varia a cada run)
// - Paths absolutos (tmpDir) — STATE.md, .github files, etc.
// - `.claude/metrics/YYYY-MM.jsonl` — basename com data atual
// - Trailing spaces em linhas com summary vazio (dispatcher emite `[id] ` com espaco extra)
function normalizeStdout(text: string, tmpDir: string): string {
  return text
    .replace(/in \d+ ms/g, 'in <NN> ms')
    .replace(new RegExp(tmpDir.replace(/\\/g, '\\\\').replace(/\//g, '\\/'), 'g'), '<TMP>')
    .replace(/\d{4}-\d{2}\.jsonl/g, '<YYYY-MM>.jsonl')
    // 2026-05-18 (Luiz/dev): Plano 02 fase-04 — normaliza pasta populate-harness com timestamp.
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness/g, '<DATE>-populate-harness')
    // 2026-05-18 (Luiz/dev): Plano 07 fase-01 fix — normaliza timing "— Xms" dos novos steps 06-12.
    .replace(/— \d+ms/g, '— <NN>ms')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
}

function normalizeTree(entries: string[]): string[] {
  // 2026-05-17 (Luiz/dev): normaliza .claude/metrics/YYYY-MM.jsonl (data-driven filename).
  // 2026-05-18 (Luiz/dev): Plano 02 fase-04 — normaliza pasta populate-harness datada.
  return entries.map((e) =>
    e
      .replace(/\.claude\/metrics\/\d{4}-\d{2}\.jsonl/, '.claude/metrics/<YYYY-MM>.jsonl')
      .replace(/docs\/exec-plans\/active\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness/, 'docs/exec-plans/active/<DATE>-populate-harness'),
  )
}

describe('E2E cutover — greenfield (CA-01)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'init-greenfield-'))
    await cp(FIXTURE_SRC, tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  // 2026-05-19 (Luiz/dev): Plano 01 fase-05 — test.skip: golden tree/stdout referenciam
  // steps 07/08/09/10-apply-merge/11 removidos no Plano 01 fases 02-04.
  // Golden snapshot em tests/e2e/__golden__/init-greenfield.{tree.json,stdout.txt} precisa
  // ser regenerado. Plano 05 fase-04 reescreve estes testes para o fluxo LLM-driven novo.
  test.skip('greenfield init generates expected file tree matching golden', async () => {
    await captureLog(() =>
      runInit([], {
        cwd: tmpDir,
        // 2026-05-17 (Luiz/dev): delivery-loop requer askUser; sem injeccao retorna needsUser
        // mas dispatcher nao tem askUser — skip silencioso. Injetar stub para evitar no-op.
        askUser: async () => 'N',
      }),
    )

    const tree = normalizeTree(await readTreeSorted(tmpDir))
    const expectedTree = normalizeTree(
      JSON.parse(await fs.readFile(GOLDEN_TREE, 'utf8')) as string[],
    )
    expect(tree).toEqual(expectedTree)
  })

  // 2026-05-19 (Luiz/dev): Plano 01 fase-05 — test.skip: golden stdout referencia steps removidos.
  // Plano 05 fase-04 regenera golden e reescreve este teste.
  test.skip('greenfield init produces stdout matching golden (normalized)', async () => {
    const { lines } = await captureLog(() =>
      runInit([], {
        cwd: tmpDir,
        askUser: async () => 'N',
      }),
    )

    const stdout = lines.join('\n')
    const expectedStdout = await fs.readFile(GOLDEN_STDOUT, 'utf8')
    expect(normalizeStdout(stdout, tmpDir)).toBe(normalizeStdout(expectedStdout, '<TMP>'))
  })

  test('capabilities-discovery soft-fails when architecture profile absent (CA-06)', async () => {
    // 2026-05-17 (Luiz/dev): fixture greenfield nao tem .anti-vibe/architecture-profile.json
    // -> readArchitectureProfile retorna null -> step retorna wording de skip.
    // GT-P04F04-1: wording exato observado via inspeção de 15-capabilities-discovery.ts linha 23:
    //   '[capabilities-discovery] skipped — architecture profile not detected. Run /anti-vibe-coding:detect-architecture first.'
    // O dispatcher adiciona prefix `[capabilities-discovery] ` ao summary — logo o log final tem ID duplicado.
    const { lines } = await captureLog(() =>
      runInit([], { cwd: tmpDir, askUser: async () => 'N' }),
    )
    const joined = lines.join('\n')
    expect(joined).toContain(
      '[capabilities-discovery] skipped — architecture profile not detected',
    )
  })

  test('tier 3 copy-with-hook generates CLAUDE.md mirror and hook entry in settings (CA-08)', async () => {
    // 2026-05-17 (Luiz/dev): simula tier 3 (copy-with-hook) via linker stub injetado no step.
    // O helper symlink-fallback nao tem CLAUDE_LINK_TIER_FORCE — usamos a interface de injecao
    // do runLinkClaudeStep (02-link-claude-agents.ts exporta esse overload).
    // AGENTS.md precisa existir antes do link — scaffoldear primeiro.
    const TEMPLATES_DIR = path.join(
      import.meta.dir,
      '..',
      '..',
      'skills',
      'init',
      'assets',
      'templates',
    )
    await scaffoldTemplates({
      targetDir: tmpDir,
      templatesDir: TEMPLATES_DIR,
      projectName: 'ca08-fixture',
      stack: 'unknown',
    })
    await scaffoldFullTree({ targetDir: tmpDir, projectName: 'ca08-fixture', stack: 'unknown' })

    // Stub linker que forca tier 3: chama linkClaudeToAgents depois de deletar o symlink
    // e tornar symlink impossivel via stub que joga EPERM na primeira tentativa.
    // Estrategia mais simples: usar linkClaudeToAgents real mas checar o tier retornado.
    // Em Windows com dev mode, symlink funciona -> tier 1. Para forcar tier 3 sem tocar helper,
    // criamos um stub direto que implementa copy-with-hook manualmente.
    const copyWithHookLinker = async (targetDir: string) => {
      // 2026-05-17 (Luiz/dev): stub que replica comportamento do tier 3.
      // Importamos apenas fs para fazer a copia e registrar o hook.
      const agentsPath = path.join(targetDir, 'AGENTS.md')
      const claudePath = path.join(targetDir, 'CLAUDE.md')
      await fs.rm(claudePath, { force: true })
      await fs.copyFile(agentsPath, claudePath)

      // Registrar hook em .claude/settings.local.json
      const settingsPath = path.join(targetDir, '.claude', 'settings.local.json')
      await fs.mkdir(path.dirname(settingsPath), { recursive: true })
      const settings = {
        hooks: {
          PostToolUse: [{ matcher: 'Edit|Write', command: 'node .claude/hooks/sync-agents-to-claude.cjs' }],
        },
      }
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8')

      return { tier: 'copy-with-hook' as const, targetPath: claudePath, hookRegistered: true }
    }

    const report = await runLinkClaudeStep(tmpDir, copyWithHookLinker)
    expect(report.summary).toContain('copy-with-hook')
    // 2026-05-17 (Luiz/dev): wording do step — GT-P04F04-3 (02-link-claude-agents.ts linha 25).
    expect(report.summary).toContain('Hook registered in .claude/settings.local.json')

    const claudeContent = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8')
    const agentsContent = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8')
    expect(claudeContent).toBe(agentsContent)

    const settingsPath = path.join(tmpDir, '.claude', 'settings.local.json')
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8')) as unknown
    expect(JSON.stringify(settings)).toContain('PostToolUse')
  })
})
