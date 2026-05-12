// 2026-05-11 (Luiz/dev): converte .planning.v5-backup/.planning/ em docs/exec-plans/* + docs/product-specs/*.
// LE do backup (G1 do plano), ESCREVE em docs/. Idempotente (G2).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parsePlanningEntry, type PlanningEntry } from './parse-planning-entry'
import { BACKUP_DIR } from './backup-planning'

export type MigrationReport = {
  status: 'completed' | 'dry-run' | 'partial'
  entries: number
  written: string[]
  skipped: Array<{ relPath: string; reason: string }>
  conflicts: Array<{ source: string; target: string }>
}

export type MigratePlanningOptions = {
  dryRun?: boolean
  /** Permite ao caller injetar virtual FS (fase-06). */
  writeFile?: (filePath: string, body: string) => Promise<void>
}

const DEFAULT_WRITE = async (p: string, body: string): Promise<void> => {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

/**
 * Migra .planning.v5-backup/.planning/ → docs/exec-plans/* + docs/product-specs/*.
 * Idempotente: arquivos ja presentes no destino com mesmo conteudo sao skip.
 *
 * @example
 * const report = await migratePlanning('/path/to/project')
 * if (report.status === 'completed') { console.log('done') }
 */
export async function migratePlanning(
  targetDir: string,
  options: MigratePlanningOptions = {},
): Promise<MigrationReport> {
  const write = options.writeFile ?? DEFAULT_WRITE
  const backupPlanningDir = path.join(targetDir, BACKUP_DIR, '.planning')

  const written: string[] = []
  const skipped: MigrationReport['skipped'] = []
  const conflicts: MigrationReport['conflicts'] = []

  const allFiles = await listMarkdownFilesRecursive(backupPlanningDir)

  // Cada arquivo .md vira uma entry. Processamento paralelo por entry (G11).
  await Promise.all(allFiles.map(async (absSrc) => {
    const relPath = toForwardSlashes(path.relative(backupPlanningDir, absSrc))
    const entry = parsePlanningEntry(relPath)
    const target = computeTargetPath(targetDir, entry)

    if (!target) {
      skipped.push({ relPath, reason: `unknown entry kind: ${entry.kind}` })
      return
    }

    // Idempotencia: destino ja existe?
    const exists = await fs.access(target).then(() => true).catch(() => false)
    if (exists && !options.dryRun) {
      const existing = await fs.readFile(target, 'utf8')
      const fresh = await readWithBomStrip(absSrc)
      if (existing === fresh) {
        skipped.push({ relPath, reason: 'already-migrated' })
        return
      }
      conflicts.push({ source: absSrc, target })
      return
    }

    const body = await readWithBomStrip(absSrc)
    if (!options.dryRun) {
      await write(target, body)
    }
    written.push(target)
  }))

  // G-A1: deletar .planning/ original (NAO o backup). Skip em dry-run.
  if (!options.dryRun && conflicts.length === 0) {
    const original = path.join(targetDir, '.planning')
    const stillExists = await fs.access(original).then(() => true).catch(() => false)
    if (stillExists) {
      await fs.rm(original, { recursive: true, force: true })
    }
  }

  return {
    status: options.dryRun ? 'dry-run' : (conflicts.length === 0 ? 'completed' : 'partial'),
    entries: allFiles.length,
    written,
    skipped,
    conflicts,
  }
}

function computeTargetPath(targetDir: string, entry: PlanningEntry): string | null {
  const datePrefix = entry.date ?? 'undated'
  const slug = entry.slug

  switch (entry.kind) {
    case 'context-file':
      // .planning/CONTEXT-foo.md → docs/exec-plans/active/{slug}.md
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${slug}.md`)
    case 'plan-folder-prd':
      // → docs/product-specs/{date}-{slug}.md
      return path.join(targetDir, 'docs', 'product-specs', `${datePrefix}-${slug}.md`)
    case 'plan-folder-plan':
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${datePrefix}-${slug}-plan.md`)
    case 'plan-folder-context':
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${datePrefix}-${slug}-context.md`)
    case 'plan-folder-state':
      // G-A2: archived state como referencia historica.
      return path.join(targetDir, 'docs', 'exec-plans', 'active', '_archived-state', `${datePrefix}-${slug}-STATE.md`)
    case 'plan-folder-summary':
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${datePrefix}-${slug}-${entry.basename}.md`)
    case 'subplan-readme':
    case 'subplan-fase':
    case 'subplan-memory':
      // Preserva estrutura aninhada: docs/exec-plans/active/{date}-{slug}/plano01/...
      return path.join(
        targetDir, 'docs', 'exec-plans', 'active',
        `${datePrefix}-${slug}`,
        entry.subplan ?? 'unknown-subplan',
        `${entry.basename}.md`,
      )
    case 'unknown':
      return null
  }
}

async function listMarkdownFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = []
  async function walk(d: string): Promise<void> {
    const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) {
        await walk(full)
      } else if (e.name.toLowerCase().endsWith('.md')) {
        out.push(full)
      }
    }
  }
  await walk(dir)
  return out
}

async function readWithBomStrip(filePath: string): Promise<string> {
  // G4: editores Windows salvam .md com BOM. Strip antes de qualquer parse downstream.
  const body = await fs.readFile(filePath, 'utf8')
  return body.replace(/^\uFEFF/, '')
}

function toForwardSlashes(p: string): string {
  // G3: normaliza separadores Windows para forward slash antes de parsePlanningEntry.
  return p.replaceAll('\\', '/')
}
