// 2026-05-11 (Luiz/dev): converte decisions.md em N arquivos docs/design-docs/ADR-*.md.
// Numbering monotonico por destino (G7). Idempotente por slug (G2).
// Le de .planning.v5-backup/ (fonte de verdade durante migracao — G1).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseDecisions, type DecisionEntry } from './parse-decisions'
import { slugify } from './slugify'
import { BACKUP_DIR } from './backup-planning'

export type DecisionsMigrationReport = {
  status: 'completed' | 'dry-run' | 'skipped'
  entries: number
  written: string[]
  skipped: Array<{ title: string; reason: string }>
  coreBeliefs?: 'created' | 'skipped'
}

export type MigrateDecisionsOptions = {
  dryRun?: boolean
  writeFile?: (filePath: string, body: string) => Promise<void>
}

const DEFAULT_WRITE = async (p: string, body: string): Promise<void> => {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

const RE_ADR_FILE = /^ADR-(\d{4})-/

/**
 * Converte decisions.md do backup para ADR-NNNN-{slug}.md em docs/design-docs/.
 * Numeracao monotonica por destino (G7). Idempotente por slug (G2).
 * Se senior-principles.md existir no backup, copia para core-beliefs.md (G-A3).
 *
 * @example
 * const report = await migrateDecisions('/path/to/project')
 * console.log(report.status, report.written.length)
 */
export async function migrateDecisions(
  targetDir: string,
  options: MigrateDecisionsOptions = {},
): Promise<DecisionsMigrationReport> {
  const write = options.writeFile ?? DEFAULT_WRITE
  const sourcePath = path.join(targetDir, BACKUP_DIR, 'decisions.md')

  const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false)
  if (!sourceExists) {
    return {
      status: 'skipped',
      entries: 0,
      written: [],
      skipped: [{ title: 'source-missing', reason: 'no decisions.md in backup' }],
      coreBeliefs: await handleCoreBeliefs(targetDir, options, write),
    }
  }

  const raw = await fs.readFile(sourcePath, 'utf8')
  const body = raw.replace(/^\uFEFF/, '')  // G4: strip BOM
  const entries = parseDecisions(body)

  // G7: numbering monotonico por destino.
  const designDocsDir = path.join(targetDir, 'docs', 'design-docs')
  let counter = await findHighestAdrNumber(designDocsDir)

  const written: string[] = []
  const skipped: DecisionsMigrationReport['skipped'] = []

  // Existing slugs para idempotencia (G2): detecta ADRs ja migrados por slug, nao por numero.
  const existingSlugs = await readExistingAdrSlugs(designDocsDir)

  for (const entry of entries) {
    const slug = slugify(entry.title)
    if (!slug) {
      skipped.push({ title: entry.title, reason: 'slug empty after normalization' })
      continue
    }

    // Idempotencia: ja existe ADR com mesmo slug? skip.
    if (existingSlugs.has(slug)) {
      skipped.push({ title: entry.title, reason: 'already-migrated' })
      continue
    }

    counter += 1
    const adrId = `ADR-${String(counter).padStart(4, '0')}`
    const filename = `${adrId}-${slug}.md`
    const target = path.join(designDocsDir, filename)
    const content = renderAdr(adrId, entry)

    if (!options.dryRun) {
      await write(target, content)
    }
    written.push(target)
    existingSlugs.add(slug)
  }

  return {
    status: options.dryRun ? 'dry-run' : 'completed',
    entries: entries.length,
    written,
    skipped,
    coreBeliefs: await handleCoreBeliefs(targetDir, options, write),
  }
}

export async function findHighestAdrNumber(designDocsDir: string): Promise<number> {
  const entries = await fs.readdir(designDocsDir).catch(() => [])
  let max = 0
  for (const e of entries) {
    const m = RE_ADR_FILE.exec(e)
    if (m) {
      const n = parseInt(m[1]!, 10)
      if (n > max) max = n
    }
  }
  return max
}

export async function readExistingAdrSlugs(designDocsDir: string): Promise<Set<string>> {
  const entries = await fs.readdir(designDocsDir).catch(() => [])
  const slugs = new Set<string>()
  for (const e of entries) {
    const m = /^ADR-\d{4}-(.+)\.md$/.exec(e)
    if (m) slugs.add(m[1]!)
  }
  return slugs
}

export async function handleCoreBeliefs(
  targetDir: string,
  options: MigrateDecisionsOptions,
  write: (p: string, body: string) => Promise<void>,
): Promise<'created' | 'skipped'> {
  // G-A3: senior-principles.md → docs/design-docs/core-beliefs.md
  const src = path.join(targetDir, BACKUP_DIR, 'senior-principles.md')
  const exists = await fs.access(src).then(() => true).catch(() => false)
  if (!exists) return 'skipped'

  const dst = path.join(targetDir, 'docs', 'design-docs', 'core-beliefs.md')
  const dstExists = await fs.access(dst).then(() => true).catch(() => false)
  if (dstExists) return 'skipped'  // idempotente

  if (!options.dryRun) {
    const srcBody = await fs.readFile(src, 'utf8')
    await write(dst, srcBody.replace(/^\uFEFF/, ''))  // G4: strip BOM
  }
  return 'created'
}

export function renderAdr(id: string, entry: DecisionEntry): string {
  const tags = inferTags(entry)
  const tagsYaml = `[${tags.map(t => JSON.stringify(t)).join(', ')}]`
  // Status sempre accepted na migracao — quando user usar /decision-registry --revoke
  // em v6 (Plano 06 fase-06), ADR antigo vira superseded-by: ADR-NNNN.
  const status = 'accepted'
  const date = entry.date || 'unknown'

  return `---
id: ${id}
title: ${JSON.stringify(entry.title)}
status: ${status}
date: ${date}
tags: ${tagsYaml}
---

# ${id}: ${entry.title}

## Context

${entry.alternatives || '(See original below.)'}

**Justification:** ${entry.justification || '(See original below.)'}

## Decision

${entry.chosen || '(Not extracted — see original.)'}

## Consequences

**Known risk:** ${entry.risk || '(none documented)'}

**Reversibility:** ${entry.reversibility || '(unspecified)'}

---

<!-- Source: anti-vibe-coding/decisions.md — migrated by /init Plano 03 fase-05. -->

## Original

${entry.rawBody}
`
}

function inferTags(entry: DecisionEntry): string[] {
  const tokens = new Set<string>()
  for (const word of entry.title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 4) tokens.add(word)
  }
  if (/reversivel|reversible/i.test(entry.reversibility)) tokens.add('reversible')
  if (/irreversivel|irreversible/i.test(entry.reversibility)) tokens.add('irreversible')
  return Array.from(tokens).slice(0, 6)
}
