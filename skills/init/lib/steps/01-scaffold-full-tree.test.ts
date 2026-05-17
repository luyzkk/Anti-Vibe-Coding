// skills/init/lib/steps/01-scaffold-full-tree.test.ts
// 2026-05-17 (Luiz/dev): plano02 fase-01 — golden test do step scaffold-full-tree.
// PRD R1 (wording byte-identico) + G7 (scaffoldFullTree ja cria TODO.md via tpl, entao
// scaffoldTodoMd sempre retorna 'skipped' em greenfield => log "ja existe").
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scaffoldFullTreeStep } from './01-scaffold-full-tree'

const ctx = (cwd: string) => ({
  cwd,
  args: [] as readonly string[],
  flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('scaffoldFullTreeStep', () => {
  let tmpDir: string

  beforeEach(async () => {
    // 2026-05-17 (Luiz/dev): cada teste em tmp dir — scaffold escreve arquivos em disco.
    tmpDir = path.join(os.tmpdir(), `scaffold-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('greenfield: 3 expected log lines + mutated true', async () => {
    const report = await scaffoldFullTreeStep.run(ctx(tmpDir))
    expect(report.mutated).toBe(true)

    const lines = report.summary.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatch(/^Base files: \d+$/)
    expect(lines[1]).toMatch(/^Tree files: \d+ in \d+ ms$/)
    // 2026-05-17 (Luiz/dev): G7 — scaffoldFullTree ja cria TODO.md via TODO.md.tpl,
    // entao scaffoldTodoMd retorna 'skipped'. Log correto eh "ja existe".
    expect(lines[2]).toBe('TODO.md ja existe — mantido sem modificacao (G2).')
  })

  test('greenfield: scaffolds expected files (AGENTS/ARCHITECTURE/TODO + docs)', async () => {
    await scaffoldFullTreeStep.run(ctx(tmpDir))
    expect(existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true)
    expect(existsSync(path.join(tmpDir, 'ARCHITECTURE.md'))).toBe(true)
    expect(existsSync(path.join(tmpDir, 'TODO.md'))).toBe(true)
    expect(existsSync(path.join(tmpDir, 'docs'))).toBe(true)
  })

  test('with-todo: existing TODO.md is preserved (G2 idempotency)', async () => {
    const todoPath = path.join(tmpDir, 'TODO.md')
    await Bun.write(todoPath, '# Existing TODO\n\n- old item\n')

    const report = await scaffoldFullTreeStep.run(ctx(tmpDir))
    const lines = report.summary.split('\n')
    expect(lines[2]).toBe('TODO.md ja existe — mantido sem modificacao (G2).')
  })
})
