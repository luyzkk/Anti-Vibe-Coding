// 2026-05-12 (Luiz/dev): TDD RED phase — testes para helper 3-tier symlink fallback
// Fase 03 do plano01 v6.0.0. Ver fase-03-symlink-fallback.md.
// DEV-01: Teste do Tier 3 com mock de fs.symlink/fs.link omitido — bun:test mock.module
// nao suporta facilmente overrides parciais de 'node:fs' promises em ESM. Registrado como
// item de follow-up apos bun:test stabilizar API de mocking.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { linkClaudeToAgents } from './symlink-fallback'

const FIXTURE_DIR = path.join(import.meta.dir, '__fixtures__', 'link-test')

describe('linkClaudeToAgents', () => {
  beforeEach(async () => {
    await fs.mkdir(FIXTURE_DIR, { recursive: true })
    await fs.writeFile(path.join(FIXTURE_DIR, 'AGENTS.md'), '# Agent\n', 'utf8')
  })

  afterEach(async () => {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true })
  })

  it('creates CLAUDE.md via symlink or hardlink (tier 1 or 2)', async () => {
    const result = await linkClaudeToAgents(FIXTURE_DIR)
    expect(['symlink', 'hardlink']).toContain(result.tier)
    const stat = await fs.lstat(path.join(FIXTURE_DIR, 'CLAUDE.md'))
    expect(stat.isSymbolicLink() || stat.isFile()).toBe(true)
  })

  it('reads same content from CLAUDE.md as AGENTS.md', async () => {
    await linkClaudeToAgents(FIXTURE_DIR)
    const a = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
    const c = await fs.readFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), 'utf8')
    expect(c).toBe(a)
  })

  it('is idempotent — running twice yields same result', async () => {
    await linkClaudeToAgents(FIXTURE_DIR)
    const result2 = await linkClaudeToAgents(FIXTURE_DIR)
    expect(['symlink', 'hardlink', 'copy-with-hook']).toContain(result2.tier)
    const a = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
    const c = await fs.readFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), 'utf8')
    expect(c).toBe(a)
  })
})
