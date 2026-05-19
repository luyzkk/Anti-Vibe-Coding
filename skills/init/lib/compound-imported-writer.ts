// skills/init/lib/compound-imported-writer.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ProgressEntry } from './progress-txt-parser'

export type CompoundImportedResult = {
  filesWritten: string[]
  indexPath: string
}

function renderEntry(entry: ProgressEntry, today: string, sourceRel: string): string {
  const tags = ['imported', entry.category]
  return [
    '---',
    `title: "${entry.title.replace(/"/g, '\\"')}"`,
    `category: ${entry.category}`,
    `tags: [${tags.join(', ')}]`,
    `created: ${today}`,
    `source: ${sourceRel} linha ${String(entry.sourceLineNumber)}`,
    '---',
    '',
    '## Problem',
    '',
    entry.body.trim().length > 0
      ? entry.body.trim()
      : '_(imported sem corpo — revisar manualmente)_',
    '',
    '## Solution',
    '',
    '_(extracted from imported gotcha — refinar via PR review se necessario)_',
    '',
    '## Prevention',
    '',
    '_(extrapolated from rule)_',
    '',
  ].join('\n')
}

function renderIndex(entries: ProgressEntry[], today: string, sourceRel: string): string {
  const lines = [
    '---',
    `title: "Imported gotchas from .claude/progress.txt"`,
    `created: ${today}`,
    `source: ${sourceRel}`,
    `count: ${String(entries.length)}`,
    '---',
    '',
    '# Imported Gotchas (legacy `progress.txt`)',
    '',
    'Cada entrada abaixo foi extraida automaticamente de `.claude/progress.txt` durante `/anti-vibe-coding:init`.',
    'Revisar via PR antes de promover para `docs/CORE_BELIEFS.md` ou outros docs canonicos.',
    '',
    '## Index',
    '',
  ]
  for (const e of entries) {
    const slug = `${String(e.index).padStart(4, '0')}-${e.slug}`
    lines.push(
      `- [\`${slug}.md\`](./${slug}.md) — ${e.title} _(${sourceRel} linha ${String(e.sourceLineNumber)})_`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

/**
 * Escreve cada entrada em `docs/compound/_imported/{nnnn}-{slug}.md` + INDEX.md.
 * Idempotente: re-run com mesmo input sobrescreve sem duplicar (prefixo {nnnn} estavel).
 * @param opts.targetDir cwd do projeto (path absoluto)
 * @param opts.sourcePath caminho do progress.txt relativo ao targetDir (ex: `.claude/progress.txt`)
 */
export async function writeCompoundImported(
  entries: ProgressEntry[],
  opts: { targetDir: string; sourcePath: string },
): Promise<CompoundImportedResult> {
  const outDir = path.join(opts.targetDir, 'docs', 'compound', '_imported')
  await fs.mkdir(outDir, { recursive: true })

  const today = new Date().toISOString().slice(0, 10)
  const filesWritten: string[] = []

  for (const entry of entries) {
    const slug = `${String(entry.index).padStart(4, '0')}-${entry.slug}`
    const dest = path.join(outDir, `${slug}.md`)
    await fs.writeFile(dest, renderEntry(entry, today, opts.sourcePath), 'utf-8')
    filesWritten.push(dest)
  }

  const indexPath = path.join(outDir, 'INDEX.md')
  await fs.writeFile(indexPath, renderIndex(entries, today, opts.sourcePath), 'utf-8')

  return { filesWritten, indexPath }
}
