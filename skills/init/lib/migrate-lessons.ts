// 2026-05-11 (Luiz/dev): converte lessons-learned.md em N arquivos docs/compound/*.md.
// Frontmatter contract: title/category/tags/created (CA-29).
// Lê do backup (.planning.v5-backup/) — G1: fonte de verdade durante migracao.
// Plano 03 fase-04 — Migration v5 → v6.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseLessons, type LessonEntry } from './parse-lessons'
import { slugify } from './slugify'
import { BACKUP_DIR } from './backup-planning'

export type LessonsMigrationReport = {
  status: 'completed' | 'dry-run' | 'skipped'
  entries: number
  written: string[]
  skipped: Array<{ title: string; reason: string }>
}

export type MigrateLessonsOptions = {
  dryRun?: boolean
  writeFile?: (filePath: string, body: string) => Promise<void>
  /** Fallback date para entries sem date inferida (default: today). */
  fallbackDate?: string
}

const DEFAULT_WRITE = async (p: string, body: string): Promise<void> => {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

/**
 * Migra lessons-learned.md do backup para N compound notes em docs/compound/.
 * Idempotente: arquivos ja existentes sao pulados (reason: 'already-migrated').
 *
 * @example
 * const report = await migrateLessons('/path/to/project', { dryRun: true })
 * console.log(report.status, report.written.length)
 */
export async function migrateLessons(
  targetDir: string,
  options: MigrateLessonsOptions = {},
): Promise<LessonsMigrationReport> {
  const write = options.writeFile ?? DEFAULT_WRITE
  const sourcePath = path.join(targetDir, BACKUP_DIR, 'lessons-learned.md')

  const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false)
  if (!sourceExists) {
    return { status: 'skipped', entries: 0, written: [], skipped: [{ title: 'source-missing', reason: 'no lessons-learned.md in backup' }] }
  }

  const raw = await fs.readFile(sourcePath, 'utf8')
  const body = raw.replace(/^\uFEFF/, '')  // G4: strip BOM
  const fallback = options.fallbackDate ?? new Date().toISOString().slice(0, 10)
  const entries = parseLessons(body, fallback)

  const written: string[] = []
  const skipped: LessonsMigrationReport['skipped'] = []

  for (const entry of entries) {
    const slug = slugify(entry.title)
    if (!slug) {
      skipped.push({ title: entry.title, reason: 'slug empty after normalization' })
      continue
    }
    const filename = `${entry.date}-${slug}.md`
    const target = path.join(targetDir, 'docs', 'compound', filename)

    // Idempotencia: ja existe? skip.
    const exists = await fs.access(target).then(() => true).catch(() => false)
    if (exists) {
      skipped.push({ title: entry.title, reason: 'already-migrated' })
      continue
    }

    const content = renderCompoundNote(entry)
    if (!options.dryRun) {
      await write(target, content)
    }
    written.push(target)
  }

  return {
    status: options.dryRun ? 'dry-run' : 'completed',
    entries: entries.length,
    written,
    skipped,
  }
}

function renderCompoundNote(entry: LessonEntry): string {
  const tagsYaml = entry.tags.length > 0
    ? `[${entry.tags.map(t => JSON.stringify(t)).join(', ')}]`
    : '[]'

  // Heuristica: mapear o body do entry para secoes Problem/Solution/Prevention.
  // Formato A: cabecalhos **Sintoma**/**Fix**/**Prevencao** → mapeados explicitamente.
  // Formato B: **Regra** + **Contexto** → Solution = Regra, Problem = Contexto.
  const sections = mapBodyToSections(entry.body)

  return `---
title: ${JSON.stringify(entry.title)}
category: ${JSON.stringify(entry.category)}
tags: ${tagsYaml}
created: ${entry.date}
---

# ${entry.title}

## Problem

${sections.problem || '(See original content below.)'}

## Solution

${sections.solution || '(See original content below.)'}

## Prevention

${sections.prevention || '(Migrated from v5 lessons-learned.md — adjust as needed.)'}

---

<!-- Source: anti-vibe-coding/lessons-learned.md (line ${entry.sourceLine}) — migrated by /init Plano 03 fase-04. -->

## Original

${entry.body}
`
}

function mapBodyToSections(body: string): { problem: string; solution: string; prevention: string } {
  const sintoma = extract(body, /\*\*Sintoma:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const causa = extract(body, /\*\*Causa[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const fix = extract(body, /\*\*Fix[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const licao = extract(body, /\*\*Li[çc][ãa]o:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const prevencao = extract(body, /\*\*Preven[çc][ãa]o:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const regra = extract(body, /\*\*Regra:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const contexto = extract(body, /\*\*Contexto:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)

  return {
    problem: sintoma || causa || contexto || '',
    solution: fix || licao || regra || '',
    prevention: prevencao || '',
  }
}

function extract(body: string, re: RegExp): string {
  const m = re.exec(body)
  return m ? m[1]!.trim() : ''
}
