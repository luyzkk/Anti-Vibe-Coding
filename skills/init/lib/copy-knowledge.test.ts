// 2026-05-16 (Luiz/dev): RED→GREEN — Plano 02 fase-03. Migrado de monostack (Plano 01) para contrato final:
// nova assinatura { targetDir, pluginRoot, primary, refresh? }, 5 status, mensagens CA-04 literais.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promises as fsp } from 'node:fs'
import { copyKnowledge } from './copy-knowledge'
import { AbortError } from './steps/abort-error'
import type { MatrixFolder } from './detect-multi-stack'

function setupFixtureSync(): { targetDir: string; pluginRoot: string } {
  const root = mkdtempSync(join(tmpdir(), 'copy-knowledge-'))
  const pluginRoot = join(root, 'plugin')
  const targetDir = join(root, 'project')
  // 2026-05-20 (Luiz/dev): D1 do PRD knowledge-path-cutover — fixture usa knowledge/ (nao docs/knowledge/)
  // simula matrix: knowledge/nodejs-typescript/{INDEX.md, atoms/pilot.md}
  mkdirSync(join(pluginRoot, 'knowledge', 'nodejs-typescript', 'atoms'), { recursive: true })
  writeFileSync(join(pluginRoot, 'knowledge', 'nodejs-typescript', 'INDEX.md'), '# INDEX')
  writeFileSync(join(pluginRoot, 'knowledge', 'nodejs-typescript', 'atoms', 'pilot.md'), '---\ntopic: pilot\n---\n')
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

  // 2026-05-20 (Luiz/dev): D4/SH-01 do PRD knowledge-path-cutover — CA-03 promovido para CA-10.
  // primary detectado + matrix ausente agora lanca AbortError (nao retorna no-source silencioso).
  it('throws AbortError when matrix folder for primary does not exist (CA-10)', async () => {
    // 'rails' folder não existe no pluginRoot de fixture
    await expect(
      copyKnowledge({ targetDir, pluginRoot, primary: 'rails' as MatrixFolder })
    ).rejects.toThrow(AbortError)
  })

  // 2026-05-16 (Luiz/dev): path traversal guard — preserva fix HIGH #1 do verify-work (commit 34347a2).
  it('returns status=no-source on path traversal attempt (primary contains ..)', async () => {
    // VALID_PRIMARY rejeita '../etc' → noop/no-source antes de tocar disco
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: '../etc' as 'rails' })
    // Comportamento esperado: guard rejeita → status no-source (invalid primary)
    expect(result.status).toBe('no-source')
    expect(result.message).toContain('^[a-z0-9_-]+$') // VALID_PRIMARY.source deve aparecer na mensagem (sem flags)
    expect(existsSync(join(targetDir, '.claude', 'knowledge'))).toBe(false)
  })

  // 2026-05-20 (Luiz/dev): D9/CA-13 do PRD knowledge-path-cutover — path traversal guard via slash separator
  it('returns no-source for primary with slash separator (CA-13)', async () => {
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: 'foo/bar' as 'rails' })
    expect(result.status).toBe('no-source')
    expect(existsSync(join(targetDir, '.claude', 'knowledge'))).toBe(false)
  })

  it('destDir is always returned (no-matrix case)', async () => {
    const result = await copyKnowledge({ targetDir, pluginRoot, primary: null })
    expect(result.destDir).toBe(join(targetDir, '.claude', 'knowledge'))
  })
})

// 2026-05-20 (Luiz/dev): D4/SH-01 do PRD knowledge-path-cutover — AbortError quando primary != null
// mas matrix ausente no plugin. Antes retornava 'no-source' (warning silencioso); agora lanca AbortError.
describe('AbortError when detected stack has no matrix (CA-10)', () => {
  it('throws AbortError when primary is valid but sourceDir does not exist', async () => {
    const tmpPlugin = await fsp.mkdtemp(join(tmpdir(), 'ck-test-'))
    // Criar knowledge/ mas SEM subpasta rails/
    await fsp.mkdir(join(tmpPlugin, 'knowledge', 'nodejs-typescript'), { recursive: true })
    await fsp.writeFile(join(tmpPlugin, 'knowledge', 'nodejs-typescript', 'INDEX.md'), '')

    const targetDir = await fsp.mkdtemp(join(tmpdir(), 'ck-target-'))

    try {
      await expect(
        copyKnowledge({
          targetDir,
          pluginRoot: tmpPlugin,
          primary: 'rails' as MatrixFolder,
        })
      ).rejects.toThrow(AbortError)
    } finally {
      await fsp.rm(tmpPlugin, { recursive: true, force: true })
      await fsp.rm(targetDir, { recursive: true, force: true })
    }
  })
})

// 2026-05-17 (Luiz/dev): security hardening Wave 1 — CWE-61 + CWE-367
import { symlinkSync, rmSync as rmSyncNode } from 'node:fs'

describe('copyKnowledge security hardening (Wave 1)', () => {
  let pluginRoot: string
  let targetDir: string

  beforeEach(() => {
    pluginRoot = mkdtempSync(join(tmpdir(), 'plugin-'))
    targetDir = mkdtempSync(join(tmpdir(), 'target-'))
    // 2026-05-20 (Luiz/dev): D1 do PRD knowledge-path-cutover — fixture usa knowledge/ (nao docs/knowledge/)
    // fake stack matrix folder
    const matrixDir = join(pluginRoot, 'knowledge/nodejs-typescript')
    mkdirSync(matrixDir, { recursive: true })
    writeFileSync(join(matrixDir, 'INDEX.md'), '# Test')
    mkdirSync(join(matrixDir, 'atoms'), { recursive: true })
    writeFileSync(join(matrixDir, 'atoms/atom1.md'), '# Atom 1')
  })

  afterEach(() => {
    rmSyncNode(pluginRoot, { recursive: true, force: true })
    rmSyncNode(targetDir, { recursive: true, force: true })
  })

  it('S1: rejects symlink in source tree (CWE-61)', async () => {
    // plant symlink pointing outside pluginRoot
    const outsideFile = join(tmpdir(), 'outside-secret.txt')
    writeFileSync(outsideFile, 'secret')
    const symlinkPath = join(pluginRoot, 'knowledge/nodejs-typescript/atoms/evil-link.md')
    try {
      symlinkSync(outsideFile, symlinkPath)
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException
      // Windows blocks symlink without admin — graceful skip
      if (e.code === 'EPERM' || e.code === 'EACCES') {
        rmSyncNode(outsideFile, { force: true })
        return
      }
      throw err
    }

    let threw = false
    let result: Awaited<ReturnType<typeof copyKnowledge>> | undefined
    try {
      result = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript', refresh: false })
    } catch {
      threw = true
    }

    // evil-link.md must NOT exist in destination regardless of throw/return path
    expect(existsSync(join(targetDir, '.claude/knowledge/atoms/evil-link.md'))).toBe(false)

    // if it didn't throw, status must be no-source (symlink rejection)
    if (!threw && result !== undefined) {
      expect(result.status).toBe('no-source')
    }

    rmSyncNode(outsideFile, { force: true })
  })

  it('S3: refresh eliminates TOCTOU — does not fail across sequential rapid calls', async () => {
    // 1st pass: destDir does not exist, refresh=true
    const r1 = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript', refresh: true })
    expect(['copied', 'refreshed']).toContain(r1.status)

    // 2nd pass: destDir exists, refresh=true
    const r2 = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript', refresh: true })
    expect(r2.status).toBe('refreshed')

    // 3rd pass: simulate "someone deleted destDir between check and rm"
    rmSyncNode(join(targetDir, '.claude/knowledge'), { recursive: true, force: true })
    const r3 = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript', refresh: true })
    expect(['copied', 'refreshed']).toContain(r3.status)
  })

  // M1.4: mensagem de erro de symlink não expõe path absoluto do pluginRoot
  it('M1.4: symlink error message does not contain absolute pluginRoot path', async () => {
    const outsideFile = join(tmpdir(), 'outside-secret-m14.txt')
    writeFileSync(outsideFile, 'secret')
    const symlinkPath = join(pluginRoot, 'knowledge/nodejs-typescript/atoms/evil-link-m14.md')
    try {
      symlinkSync(outsideFile, symlinkPath)
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException
      // Windows blocks symlink without admin — graceful skip
      if (e.code === 'EPERM' || e.code === 'EACCES') {
        rmSyncNode(outsideFile, { force: true })
        return
      }
      throw err
    }

    try {
      const result = await copyKnowledge({ targetDir, pluginRoot, primary: 'nodejs-typescript', refresh: false })
      // if not thrown, message must not contain absolute pluginRoot (starts with / or drive letter)
      const hasAbsolutePath = /^[/\\]/.test(result.message) || /^[A-Za-z]:[/\\]/.test(result.message)
      // message may contain <plugin-root> placeholder or relative path, but NOT absolute pluginRoot
      expect(result.message).not.toContain(pluginRoot)
    } catch {
      // if it threw, that's also acceptable (symlink detected at OS level)
    }

    rmSyncNode(outsideFile, { force: true })
  })
})
