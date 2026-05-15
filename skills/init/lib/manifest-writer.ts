// 2026-05-14 (Luiz/dev): manifest writer para migration mode — Plano 04 fase-01.
// Escreve .claude/.anti-vibe-manifest.json com initMode, catalog de plans e checksums.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { TEMPLATE_MANIFEST } from './template-manifest'

export type InitMode = 'fresh' | 'migration' | 'completed'

export type MigrationPlanEntry = {
  id: string
  /**
   * Slot canônico que este plan cobre. Ex: 'docs/DESIGN.md'.
   * Usa os mesmos paths que TEMPLATE_MANIFEST[n].dst.
   * 'unknown' se a extração falhar (plan posicionado em Tier 4 do orchestrator).
   */
  slot: string
  /** Path relativo ao repo root do plan file. Ex: 'docs/exec-plans/active/2026-05-14-design-md-migration.md'. */
  path: string
  /** 'active' enquanto em docs/exec-plans/active/; 'completed' após mover para completed/. */
  status: 'active' | 'completed'
}

export type AntiVibeManifest = {
  pluginVersion: string
  initMode: InitMode
  /** ISO 8601 — momento da última escrita do manifest. */
  installedAt: string
  /**
   * Checksums SHA-256 de artefatos criados pelo pipeline.
   * Em 'fresh': checksums dos 26 arquivos scaffolded.
   * Em 'migration': checksums de migration plans + _INIT_ORCHESTRATOR.md + discovery/*.json.
   * @remarks Campo polimórfico por initMode — não comparar cross-mode.
   */
  files: Record<string, string>
  /** Catalog de migration plans. Presente apenas quando initMode é 'migration' ou 'completed'. */
  migrationPlans?: MigrationPlanEntry[]
}

export type Phase4Input = {
  targetDir: string
  pluginVersion: string
  inventoryRunId: string
  planPaths: string[]
}

const MANIFEST_PATH = '.claude/.anti-vibe-manifest.json'

/** SHA-256 hex do conteúdo do arquivo. Retorna '' se arquivo não existir. */
export async function computeChecksum(absPath: string): Promise<string> {
  let content: Buffer
  try {
    content = await fs.readFile(absPath)
  } catch {
    return ''
  }
  return createHash('sha256').update(content).digest('hex')
}

/** Resolve .claude/ no targetDir, criando se não existir. */
async function ensureClaudeDir(targetDir: string): Promise<string> {
  const claudeDir = path.join(targetDir, '.claude')
  await fs.mkdir(claudeDir, { recursive: true })
  return claudeDir
}

const SLOT_COMMENT_RE = /<!--\s*migration-slot:\s*(.+?)\s*-->/
const GOAL_SLOT_RE = /`((?:docs|scripts|\.github)\/[^`]+\.(?:md|ts)|(?:AGENTS|ARCHITECTURE|CLAUDE|README)\.md)`/

// AGENTS.md, ARCHITECTURE.md, CLAUDE.md are not in TEMPLATE_MANIFEST (they're user-owned files),
// but they are valid migration targets referenced in SLOT_TIERS.
const EXTRA_SLOTS = new Set(['AGENTS.md', 'ARCHITECTURE.md', 'CLAUDE.md'])
const VALID_SLOTS = new Set([...TEMPLATE_MANIFEST.map((e) => e.dst), ...EXTRA_SLOTS])

async function inferSlotFromPlanFile(absPath: string): Promise<string> {
  let content: string
  try {
    content = await fs.readFile(absPath, 'utf-8')
  } catch {
    return 'unknown'
  }

  const commentMatch = content.match(SLOT_COMMENT_RE)
  if (commentMatch?.[1] && VALID_SLOTS.has(commentMatch[1])) {
    return commentMatch[1]
  }

  const goalMatch = content.match(GOAL_SLOT_RE)
  if (goalMatch?.[1] && VALID_SLOTS.has(goalMatch[1])) {
    return goalMatch[1]
  }

  return 'unknown'
}

export async function buildMigrationPlanCatalog(targetDir: string): Promise<MigrationPlanEntry[]> {
  const entries: MigrationPlanEntry[] = []

  for (const [status, dir] of [
    ['active', 'docs/exec-plans/active'],
    ['completed', 'docs/exec-plans/completed'],
  ] as const) {
    const absDir = path.join(targetDir, dir)
    let files: string[]
    try {
      files = await fs.readdir(absDir)
    } catch {
      continue
    }

    for (const file of files) {
      if (!file.endsWith('-migration.md')) continue
      const absPath = path.join(absDir, file)
      const relPath = `${dir}/${file}`
      const id = file.replace(/\.md$/, '')
      const slot = await inferSlotFromPlanFile(absPath)
      entries.push({ id, slot, path: relPath, status })
    }
  }

  return entries
}

export async function writeManifest(
  targetDir: string,
  manifest: AntiVibeManifest,
): Promise<void> {
  await ensureClaudeDir(targetDir)
  const absPath = path.join(targetDir, MANIFEST_PATH)
  await fs.writeFile(absPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

export async function readManifest(targetDir: string): Promise<AntiVibeManifest | null> {
  const absPath = path.join(targetDir, MANIFEST_PATH)
  try {
    const raw = await fs.readFile(absPath, 'utf-8')
    return JSON.parse(raw) as AntiVibeManifest
  } catch {
    return null
  }
}

export async function buildAndWritePhase4Manifest(input: Phase4Input): Promise<AntiVibeManifest> {
  const { targetDir, pluginVersion, planPaths } = input

  const migrationPlans = await buildMigrationPlanCatalog(targetDir)

  const filesToChecksum = [
    'docs/exec-plans/active/_INIT_ORCHESTRATOR.md',
    'discovery/inventory.json',
    'discovery/semantic-inventory.json',
    ...planPaths.map((p) => path.relative(targetDir, p)),
  ]
  const files: Record<string, string> = {}
  await Promise.all(
    filesToChecksum.map(async (rel) => {
      const checksum = await computeChecksum(path.join(targetDir, rel))
      if (checksum) files[rel] = checksum
    }),
  )

  const manifest: AntiVibeManifest = {
    pluginVersion,
    initMode: 'migration',
    installedAt: new Date().toISOString(),
    files,
    migrationPlans,
  }

  await writeManifest(targetDir, manifest)
  return manifest
}
