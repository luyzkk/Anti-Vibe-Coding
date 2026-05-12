#!/usr/bin/env bun
// compound-check — fase-01 skeleton + fase-02 frontmatter+sections (CA-29).
// Fase-01 (plano04): coleta arquivos, reporta unreadable.
// Fase-02 (plano04): valida YAML frontmatter (title/category/tags/created) + H2 obrigatorias.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

type Failure = { rule: string; file: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  const files = await listCompoundFilesLocal(root)
  await checkAllNotes(files, failures)

  if (failures.length > 0) {
    console.error('Compound check failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.file}: ${f.message}`)
    }
    process.exit(1)
  }

  console.log(`Compound check passed (${files.length} compound notes validated).`)
  process.exit(0)
}

// Helper inlined no template (sem dependencia de `lib/` no projeto-alvo).
// O `lib/compound-files-collector.ts` no plugin e o gerador; o `.tpl` carrega copia inline.
async function listCompoundFilesLocal(rootDir: string): Promise<string[]> {
  const baseDir = path.join(rootDir, 'docs', 'compound')
  return collectMd(baseDir)
}

async function collectMd(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const skip = new Set(['README.md', 'index.md'])
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (entry.name === '_archived') return []
        return collectMd(path.join(dir, entry.name))
      }
      if (!entry.isFile() || !entry.name.endsWith('.md') || skip.has(entry.name)) return []
      return [path.join(dir, entry.name)]
    }),
  )
  return nested.flat()
}

// === fase-02: frontmatter + required sections (CA-29) ===
// Parser inlinado — script independente do plugin no projeto-alvo.
// Schema espelhado em `lib/compound-frontmatter.ts` (fonte canonica para uso programatico).
// Sincronizacao manual: se mudar schema, atualizar os dois lugares.

const FRONTMATTER_RE_INLINE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/
const DATE_RE_INLINE = /^\d{4}-\d{2}-\d{2}$/

async function checkAllNotes(files: ReadonlyArray<string>, failures: Failure[]): Promise<void> {
  // Promise.all para I/O paralelo — G1 do Plano 04 (perf <2s em 100 docs).
  await Promise.all(files.map((file) => checkOne(file, failures)))
}

async function checkOne(file: string, failures: Failure[]): Promise<void> {
  let body: string
  try {
    body = await fs.readFile(file, 'utf8')
  } catch (err) {
    failures.push({
      rule: 'readable',
      file: path.relative(root, file),
      message: `cannot read file (${(err as Error).message})`,
    })
    return
  }

  const relPath = path.relative(root, file)

  // Frontmatter validation
  const fmResult = parseFrontmatterInline(body)
  if (!fmResult.ok) {
    for (const err of fmResult.errors) {
      failures.push({ rule: 'frontmatter', file: relPath, message: err })
    }
  }

  // Required sections (CA-29)
  const missing = findMissingSectionsInline(body)
  for (const section of missing) {
    failures.push({
      rule: 'required-section',
      file: relPath,
      message: `missing required H2 section: ${section}`,
    })
  }
}

type FmInlineResult =
  | { ok: true }
  | { ok: false; errors: ReadonlyArray<string> }

function parseFrontmatterInline(body: string): FmInlineResult {
  const match = body.match(FRONTMATTER_RE_INLINE)
  if (!match) {
    if (body.trimStart().startsWith('---')) {
      return { ok: false, errors: ['frontmatter delimiter "---" found but never closed'] }
    }
    return { ok: false, errors: ['missing frontmatter (expected `---` on line 1)'] }
  }

  const data = parseYamlInline(match[1]!)
  const errors: string[] = []

  if (typeof data.title !== 'string' || (data.title as string).trim() === '') {
    errors.push('frontmatter.title must be a non-empty string')
  }
  if (typeof data.category !== 'string' || (data.category as string).trim() === '') {
    errors.push('frontmatter.category must be a non-empty string')
  }
  if (!Array.isArray(data.tags)) {
    errors.push('frontmatter.tags must be an array')
  } else if ((data.tags as unknown[]).length === 0) {
    errors.push('frontmatter.tags must have at least 1 element')
  }
  if (typeof data.created !== 'string' || !DATE_RE_INLINE.test(data.created as string)) {
    errors.push('frontmatter.created must be a string in YYYY-MM-DD format')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true }
}

function parseYamlInline(raw: string): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  const lines = raw.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (line.trim() === '' || line.trim().startsWith('#')) { i += 1; continue }
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
    if (!m) { i += 1; continue }
    const key = m[1]!
    const rest = m[2]!.trim()
    if (rest === '') {
      const items: string[] = []
      i += 1
      while (i < lines.length && /^\s+-\s+/.test(lines[i]!)) {
        const im = lines[i]!.match(/^\s+-\s+(.+)$/)
        if (im) items.push(stripQ(im[1]!.trim()))
        i += 1
      }
      data[key] = items
      continue
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1)
      data[key] = inner === '' ? [] : inner.split(',').map((s) => stripQ(s.trim()))
    } else {
      data[key] = stripQ(rest)
    }
    i += 1
  }
  return data
}

function stripQ(s: string): string {
  return ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    ? s.slice(1, -1)
    : s
}

function findMissingSectionsInline(body: string): ReadonlyArray<string> {
  const missing: string[] = []
  for (const section of ['Problem', 'Solution', 'Prevention']) {
    const re = new RegExp(`^## ${section}\\s*$`, 'm')
    if (!re.test(body)) missing.push(`## ${section}`)
  }
  return missing
}

await main()
