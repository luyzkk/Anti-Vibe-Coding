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

  // 2026-10-13 (Luiz/dev): 8.0 fatia 1 — o init apagava o CLAUDE.md do projeto antes de criar o link.
  // Decisao do dono na entrevista: juntar o conteudo ao AGENTS.md, guardar copia e so entao ligar.
  describe('quando o projeto ja tem um CLAUDE.md proprio', () => {
    const OWN = '# Regras do projeto\n\n- usar pnpm\n- nunca tocar em payments/ sem teste\n'

    it('keeps the existing instructions by merging them into AGENTS.md', async () => {
      await fs.writeFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), OWN, 'utf8')
      const result = await linkClaudeToAgents(FIXTURE_DIR)
      const agents = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
      expect(agents).toContain('# Agent')
      expect(agents).toContain('- nunca tocar em payments/ sem teste')
      const claude = await fs.readFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), 'utf8')
      expect(claude).toBe(agents)
      expect(result.mergedExisting).toBe(true)
    })

    it('saves a byte-exact backup of the original CLAUDE.md', async () => {
      await fs.writeFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), OWN, 'utf8')
      const result = await linkClaudeToAgents(FIXTURE_DIR)
      expect(result.backupPath).toBeDefined()
      const backup = await fs.readFile(result.backupPath as string, 'utf8')
      expect(backup).toBe(OWN)
    })

    it('does not duplicate the merged instructions when init runs again', async () => {
      await fs.writeFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), OWN, 'utf8')
      await linkClaudeToAgents(FIXTURE_DIR)
      const second = await linkClaudeToAgents(FIXTURE_DIR)
      const agents = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
      expect(agents.split('- nunca tocar em payments/ sem teste').length - 1).toBe(1)
      expect(second.mergedExisting).toBe(false)
    })

    it('replaces without merging when CLAUDE.md already mirrors AGENTS.md', async () => {
      await fs.writeFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), '# Agent\r\n', 'utf8')
      const result = await linkClaudeToAgents(FIXTURE_DIR)
      expect(result.mergedExisting).toBe(false)
      expect(result.backupPath).toBeUndefined()
      const agents = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
      expect(agents).toBe('# Agent\n')
    })
  })
})
