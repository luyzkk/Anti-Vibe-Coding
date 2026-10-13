// 2026-05-12 (Luiz/dev): 3-tier fallback para CLAUDE.md → AGENTS.md
// Mitiga R1 (Windows symlink). Decisao: D16 do PRD v6.0.0.
// Ordem: symlink (POSIX/Win-devmode) → hardlink (Win-NTFS) → copy + hook PostToolUse.

import { promises as fs, type Stats } from 'node:fs'
import path from 'node:path'

export type LinkTier = 'symlink' | 'hardlink' | 'copy-with-hook'

export type LinkResult = {
  tier: LinkTier
  targetPath: string
  hookRegistered: boolean
  /** O CLAUDE.md tinha instrucoes proprias e elas foram trazidas para o AGENTS.md nesta execucao. */
  mergedExisting: boolean
  /** Copia byte a byte do CLAUDE.md original, quando houve juncao. */
  backupPath?: string
}

const MERGE_HEADING = '## Instruções do CLAUDE.md anterior'

export async function linkClaudeToAgents(targetDir: string): Promise<LinkResult> {
  const agentsPath = path.join(targetDir, 'AGENTS.md')
  const claudePath = path.join(targetDir, 'CLAUDE.md')

  // Garantir que AGENTS.md existe — fail fast se fase-02 nao rodou.
  await fs.access(agentsPath)

  // 2026-10-13 (Luiz/dev): 8.0 fatia 1. Antes, um fs.rm direto apagava o CLAUDE.md do projeto e as
  // instrucoes do dono sumiam. Agora o conteudo proprio e guardado e trazido para o AGENTS.md antes
  // de o arquivo dar lugar ao link.
  const merge = await mergeExistingClaude(targetDir, agentsPath, claudePath)

  // Link, symlink e copia identica ja espelham o AGENTS.md: podem ser recriados sem perda.
  await fs.rm(claudePath, { force: true })

  // Tier 1 — symlink
  try {
    await fs.symlink(agentsPath, claudePath, 'file')
    return { tier: 'symlink', targetPath: claudePath, hookRegistered: false, ...merge }
  } catch (err) {
    if (!isPermissionOrUnsupported(err)) throw err
  }

  // Tier 2 — hardlink NTFS (nao exige admin no Windows 11)
  try {
    await fs.link(agentsPath, claudePath)
    return { tier: 'hardlink', targetPath: claudePath, hookRegistered: false, ...merge }
  } catch (err) {
    if (!isPermissionOrUnsupported(err)) throw err
  }

  // Tier 3 — copy + hook PostToolUse
  await fs.copyFile(agentsPath, claudePath)
  await registerSyncHook(targetDir)
  return { tier: 'copy-with-hook', targetPath: claudePath, hookRegistered: true, ...merge }
}

type MergeOutcome = { mergedExisting: boolean; backupPath?: string }

/**
 * Traz para o AGENTS.md o texto de um CLAUDE.md que nao e espelho dele.
 * Nao faz nada quando o CLAUDE.md nao existe, e um symlink, esta vazio, e identico ao AGENTS.md
 * ou ja foi juntado numa execucao anterior.
 */
async function mergeExistingClaude(
  targetDir: string,
  agentsPath: string,
  claudePath: string,
): Promise<MergeOutcome> {
  const none: MergeOutcome = { mergedExisting: false }

  let stat: Stats
  try {
    stat = await fs.lstat(claudePath)
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') return none
    throw err
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return none

  const own = await fs.readFile(claudePath, 'utf8')
  const agents = await fs.readFile(agentsPath, 'utf8')
  const ownBody = normalize(own).trim()
  if (ownBody === '') return none
  if (ownBody === normalize(agents).trim()) return none
  if (normalize(agents).includes(ownBody)) return none

  const backupPath = path.join(targetDir, '.claude', 'backups', `CLAUDE.md.${timestamp()}.bak`)
  await fs.mkdir(path.dirname(backupPath), { recursive: true })
  await fs.copyFile(claudePath, backupPath)

  const relBackup = path.relative(targetDir, backupPath).split(path.sep).join('/')
  const section =
    `\n\n${MERGE_HEADING}\n\n` +
    `<!-- Trazido pelo init do Anti-Vibe-Coding. Original guardado em ${relBackup}. -->\n\n` +
    `${ownBody}\n`
  await fs.writeFile(agentsPath, normalize(agents).replace(/\n+$/, '') + section, 'utf8')

  return { mergedExisting: true, backupPath }
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n')
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
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
