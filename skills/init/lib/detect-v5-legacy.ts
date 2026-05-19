// 2026-05-11 (Luiz/dev): detector v5.x — D9 (/init absorve), D15 (sem /migrate dedicada).
// Retorna LegacyState para que /init decida fluxo: novo / migrar / ja-v6.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type LegacyArtifact =
  | 'planning-dir'           // .planning/ existe e tem conteudo
  | 'lessons-learned'        // lessons-learned.md na raiz
  | 'decisions'              // decisions.md na raiz
  | 'senior-principles'      // senior-principles.md na raiz (raro fora do plugin)
  // 2026-05-18 (Luiz/dev): Quick Plan init v6.4.x bug 1 — projetos v5 reais vivem em .claude/.
  | 'claude-decisions'              // .claude/decisions.md
  | 'claude-senior-principles'      // .claude/senior-principles.md
  | 'claude-architecture-profile'   // .claude/architecture-profile.md
  | 'claude-project-map'            // .claude/PROJECT_MAP.md
  | 'claude-plans-dir'              // .claude/plans/ com conteudo
  | 'claude-tasks-dir'              // .claude/tasks/ com conteudo
  | 'claude-knowledge-dir'          // .claude/knowledge/ com conteudo
  | 'claude-rules-dir'              // .claude/rules/ com conteudo
  | 'claude-prompts-dir'            // .claude/prompts/ com conteudo
  | 'claude-manifest-v5-backup'     // .claude/.anti-vibe-manifest.json.backup-v5.* (smoking gun)
  | 'claude-manifest-v5'            // .claude/.anti-vibe-manifest.json com pluginVersion < 6

export type LegacyState = {
  /** True se ao menos UM artefato v5.x foi detectado. */
  isLegacy: boolean
  /** True se docs/ ja existe com sinal de v6 (evita duplo-migrar). */
  alreadyMigrated: boolean
  /** Lista de artefatos encontrados (ordem documentada). */
  artifacts: LegacyArtifact[]
  /** Paths absolutos detectados — para o caller passar adiante sem re-stat. */
  paths: Partial<Record<LegacyArtifact, string>>
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Heuristica de v5.x: .planning/ ou um dos 3 .md legados.
 * Heuristica de "ja em v6": docs/exec-plans/ existe (foi gerado por scaffold v6).
 * Caller decide: se isLegacy && !alreadyMigrated → oferecer migracao.
 *
 * @example
 * const state = await detectV5Legacy('/path/to/project')
 * if (state.isLegacy && !state.alreadyMigrated) {
 *   // oferecer migracao
 * }
 */
// Diretorios .claude/ que precisam ter conteudo > 0 para contar como legacy.
const CLAUDE_DIR_PROBES: ReadonlyArray<readonly [LegacyArtifact, string]> = [
  ['claude-plans-dir', 'plans'],
  ['claude-tasks-dir', 'tasks'],
  ['claude-knowledge-dir', 'knowledge'],
  ['claude-rules-dir', 'rules'],
  ['claude-prompts-dir', 'prompts'],
]

const DIR_ARTIFACTS = new Set<LegacyArtifact>([
  'planning-dir',
  'claude-plans-dir',
  'claude-tasks-dir',
  'claude-knowledge-dir',
  'claude-rules-dir',
  'claude-prompts-dir',
])

async function detectClaudeManifestV5Backup(claudeDir: string): Promise<string | null> {
  const entries = await fs.readdir(claudeDir).catch(() => [] as string[])
  const backup = entries.find((e) => e.startsWith('.anti-vibe-manifest.json.backup-v5'))
  return backup === undefined ? null : path.join(claudeDir, backup)
}

async function detectClaudeManifestV5(claudeDir: string): Promise<string | null> {
  const manifestPath = path.join(claudeDir, '.anti-vibe-manifest.json')
  if (!(await exists(manifestPath))) return null
  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    const parsed = JSON.parse(raw) as { pluginVersion?: unknown }
    const version = typeof parsed.pluginVersion === 'string' ? parsed.pluginVersion : ''
    // v5.x ou qualquer coisa que nao comeca com '6.' (incluindo manifests malformados sem versao)
    return version.startsWith('6.') ? null : manifestPath
  } catch {
    // Manifest corrompido sera tratado como suspeito (conta como legacy para forcar revisao manual)
    return manifestPath
  }
}

export async function detectV5Legacy(targetDir: string): Promise<LegacyState> {
  const claudeDir = path.join(targetDir, '.claude')
  const probes: Array<[LegacyArtifact, string]> = [
    ['planning-dir', path.join(targetDir, '.planning')],
    ['lessons-learned', path.join(targetDir, 'lessons-learned.md')],
    ['decisions', path.join(targetDir, 'decisions.md')],
    ['senior-principles', path.join(targetDir, 'senior-principles.md')],
    // 2026-05-18 (Luiz/dev): Quick Plan init v6.4.x bug 1 — .claude/ probes
    ['claude-decisions', path.join(claudeDir, 'decisions.md')],
    ['claude-senior-principles', path.join(claudeDir, 'senior-principles.md')],
    ['claude-architecture-profile', path.join(claudeDir, 'architecture-profile.md')],
    ['claude-project-map', path.join(claudeDir, 'PROJECT_MAP.md')],
    ...CLAUDE_DIR_PROBES.map(([id, name]) => [id, path.join(claudeDir, name)] as [LegacyArtifact, string]),
  ]

  const artifacts: LegacyArtifact[] = []
  const paths: LegacyState['paths'] = {}

  for (const [id, p] of probes) {
    if (await exists(p)) {
      // Diretorios exigem conteudo > 0 (vazio nao conta).
      if (DIR_ARTIFACTS.has(id)) {
        const entries = await fs.readdir(p).catch(() => [])
        if (entries.length === 0) continue
      }
      artifacts.push(id)
      paths[id] = p
    }
  }

  // Manifest v5 (live ou backup) dentro de .claude/ — sinal mais forte de install v5.
  const v5BackupPath = await detectClaudeManifestV5Backup(claudeDir)
  if (v5BackupPath !== null) {
    artifacts.push('claude-manifest-v5-backup')
    paths['claude-manifest-v5-backup'] = v5BackupPath
  }
  const v5LivePath = await detectClaudeManifestV5(claudeDir)
  if (v5LivePath !== null) {
    artifacts.push('claude-manifest-v5')
    paths['claude-manifest-v5'] = v5LivePath
  }

  const v6Marker = path.join(targetDir, 'docs', 'exec-plans')
  const alreadyMigrated = await exists(v6Marker)

  return {
    isLegacy: artifacts.length > 0,
    alreadyMigrated,
    artifacts,
    paths,
  }
}
