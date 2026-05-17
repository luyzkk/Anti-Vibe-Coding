// 2026-05-16 (Luiz/dev): RED→GREEN — Plano 02 fase-03. Migrado de monostack (Plano 01) para contrato final:
// nova assinatura { targetDir, pluginRoot, primary, refresh? }, 5 status, mensagens CA-04 literais.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyKnowledge } from './copy-knowledge'

function setupFixtureSync(): { targetDir: string; pluginRoot: string } {
  const root = mkdtempSync(join(tmpdir(), 'copy-knowledge-'))
  const pluginRoot = join(root, 'plugin')
  const targetDir = join(root, 'project')
  // simula matrix: docs/knowledge/nodejs-typescript/{INDEX.md, atoms/pilot.md}
  mkdirSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms'), { recursive: true })
  writeFileSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'INDEX.md'), '# INDEX')
  writeFileSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms', 'pilot.md'), '---\ntopic: pilot\n---\n')
  mkdirSync(targetDir, { recursive: true })
  return { targetDir, pluginRoot }
}

describe('copyKnowledge — idempotência + refresh', () => {
  let targetDir: string
  let pluginRoot: string

  beforeEach(() => {
    const fixture = setupFixtureSync()
    targetDir = fixture.targetDir
    pluginRoot = fixture.pluginRoot
  })

  afterEach(() => {
    // cleanup — best effort, ignore errors
    try { rmSync(join(targetDir, '..', '..'), { recursive: true, force: true }) } catch { /* noop */ }
  })

  it('returns status=copied + atomCount on first run', async () => {
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    expect(result.status).toBe('copied')
    // atomCount = INDEX.md + pilot.md = 2 (copyTree conta todos os arquivos, não só atoms/)
    expect(result.atomCount).toBe(2)
    expect(result.message).toContain('Knowledge copied: 2 atoms')
    expect(existsSync(join(targetDir, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(targetDir, '.claude', 'knowledge', 'atoms', 'pilot.md'))).toBe(true)
  })

  it('returns status=skipped with CA-04 message when .claude/knowledge/ exists (no refresh)', async () => {
    await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    const second = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    expect(second.status).toBe('skipped')
    expect(second.atomCount).toBe(0)
    // CA-04: mensagem literal exata do PRD
    expect(second.message).toBe(
      'Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar.',
    )
  })

  it('returns status=refreshed and overwrites when refresh=true (RF7)', async () => {
    await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript' })
    // mutar conteúdo para verificar overwrite
    writeFileSync(join(targetDir, '.claude', 'knowledge', 'INDEX.md'), '# STALE')
    const refreshed = await copyKnowledge({
      targetDir,
      pluginRoot,
      primary: 'nodejs-typescript',
      refresh: true,
    })
    expect(refreshed.status).toBe('refreshed')
    expect(refreshed.atomCount).toBe(2)
    // conteúdo restaurado ao original
    expect(readFileSync(join(targetDir, '.claude', 'knowledge', 'INDEX.md'), 'utf8')).toBe('# INDEX')
  })

  it('returns status=no-matrix when primary=null (CA-06)', async () => {
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: null })
    expect(result.status).toBe('no-matrix')
    expect(result.atomCount).toBe(0)
    // G10: mensagem literal exata
    expect(result.message).toBe('Stack não detectada. Knowledge não foi copiado.')
    expect(existsSync(join(targetDir, '.claude', 'knowledge'))).toBe(false)
  })

  it('returns status=no-source when matrix folder for primary does not exist (CA-03)', async () => {
    // 'rails' folder não existe no pluginRoot de fixture
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: 'rails' })
    expect(result.status).toBe('no-source')
    expect(result.atomCount).toBe(0)
    expect(result.message).toContain('rails')
  })

  // 2026-05-16 (Luiz/dev): path traversal guard — preserva fix HIGH #1 do verify-work (commit 34347a2).
  it('returns status=no-source on path traversal attempt (primary contains ..)', async () => {
    // VALID_PRIMARY rejeita '../etc' → noop/no-source antes de tocar disco
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: '../etc' as 'rails' })
    // Comportamento esperado: guard rejeita → status no-source (invalid primary)
    expect(['no-source', 'no-matrix']).toContain(result.status)
    expect(existsSync(join(targetDir, '.claude', 'knowledge'))).toBe(false)
  })

  it('destDir is always returned (no-matrix case)', async () => {
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: null })
    expect(result.destDir).toBe(join(targetDir, '.claude', 'knowledge'))
  })
})
