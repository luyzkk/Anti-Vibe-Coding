// 2026-05-12 (Luiz/dev): 3-tier fallback para CLAUDE.md → AGENTS.md
// Mitiga R1 (Windows symlink). Decisao: D16 do PRD v6.0.0.
// Ordem: symlink (POSIX/Win-devmode) → hardlink (Win-NTFS) → copy + hook PostToolUse.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type LinkTier = 'symlink' | 'hardlink' | 'copy-with-hook'

export type LinkResult = {
  tier: LinkTier
  targetPath: string
  hookRegistered: boolean
}

export async function linkClaudeToAgents(targetDir: string): Promise<LinkResult> {
  const agentsPath = path.join(targetDir, 'AGENTS.md')
  const claudePath = path.join(targetDir, 'CLAUDE.md')

  // Garantir que AGENTS.md existe — fail fast se fase-02 nao rodou.
  await fs.access(agentsPath)

  // Limpar CLAUDE.md existente (idempotente). Tolerante a ENOENT.
  await fs.rm(claudePath, { force: true })

  // Tier 1 — symlink
  try {
    await fs.symlink(agentsPath, claudePath, 'file')
    return { tier: 'symlink', targetPath: claudePath, hookRegistered: false }
  } catch (err) {
    if (!isPermissionOrUnsupported(err)) throw err
  }

  // Tier 2 — hardlink NTFS (nao exige admin no Windows 11)
  try {
    await fs.link(agentsPath, claudePath)
    return { tier: 'hardlink', targetPath: claudePath, hookRegistered: false }
  } catch (err) {
    if (!isPermissionOrUnsupported(err)) throw err
  }

  // Tier 3 — copy + hook PostToolUse
  await fs.copyFile(agentsPath, claudePath)
  await registerSyncHook(targetDir)
  return { tier: 'copy-with-hook', targetPath: claudePath, hookRegistered: true }
}

function isPermissionOrUnsupported(err: unknown): err is NodeJS.ErrnoException {
  if (!isErrnoException(err)) return false
  return err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'ENOSYS'
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && typeof (value as NodeJS.ErrnoException).code === 'string'
}

async function registerSyncHook(targetDir: string): Promise<void> {
  const settingsPath = path.join(targetDir, '.claude', 'settings.local.json')
  await fs.mkdir(path.dirname(settingsPath), { recursive: true })

  let settings: Record<string, unknown> = {}
  try {
    const existing = await fs.readFile(settingsPath, 'utf8')
    settings = JSON.parse(existing) as Record<string, unknown>
  } catch {
    // arquivo nao existe — comeca do zero
  }

  const hooks = (settings['hooks'] as Record<string, unknown[]> | undefined) ?? {}
  const postToolUse = (hooks['PostToolUse'] as Array<Record<string, unknown>> | undefined) ?? []

  const alreadyRegistered = postToolUse.some(
    (entry) =>
      typeof entry['command'] === 'string' &&
      entry['command'].includes('sync-agents-to-claude.cjs'),
  )

  if (!alreadyRegistered) {
    postToolUse.push({
      matcher: 'Edit|Write',
      command: 'node .claude/hooks/sync-agents-to-claude.cjs',
    })
    hooks['PostToolUse'] = postToolUse
    settings['hooks'] = hooks
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
  }

  // Copiar o script do hook para .claude/hooks/ no projeto-alvo
  const hookSrc = path.join(
    import.meta.dir,
    '..',
    'assets',
    'hooks',
    'sync-agents-to-claude.cjs',
  )
  const hookDst = path.join(targetDir, '.claude', 'hooks', 'sync-agents-to-claude.cjs')
  await fs.mkdir(path.dirname(hookDst), { recursive: true })
  await fs.copyFile(hookSrc, hookDst)
}
