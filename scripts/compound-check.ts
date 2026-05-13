#!/usr/bin/env bun
// compound-check — fase-01 skeleton + fase-02 frontmatter+sections (CA-29).
// Fase-01 (plano04): coleta arquivos, reporta unreadable.
// Fase-02 (plano04): valida YAML frontmatter (title/category/tags/created) + H2 obrigatorias.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

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
// Frontmatter parsing via js-yaml (CORE_SCHEMA) — closes the bypass surface
// of the prior hand-rolled inline parser (verify-work plano08 MEDIO, TODO L12).
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

  // CORE_SCHEMA: strings/numbers/bools/nulls/arrays/maps — no JS-specific tags,
  // no implicit Date coercion (matches our manual DATE_RE check below).
  let parsed: unknown
  try {
    parsed = yaml.load(match[1]!, { schema: yaml.CORE_SCHEMA })
  } catch (err) {
    return { ok: false, errors: [`invalid YAML frontmatter: ${(err as Error).message}`] }
  }

  if (parsed === null || parsed === undefined) {
    return { ok: false, errors: ['frontmatter is empty'] }
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['frontmatter must be a YAML mapping'] }
  }

  const data = parsed as Record<string, unknown>
  const errors: string[] = []

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('frontmatter.title must be a non-empty string')
  }
  if (typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('frontmatter.category must be a non-empty string')
  }
  if (!Array.isArray(data.tags)) {
    errors.push('frontmatter.tags must be an array')
  } else if (data.tags.length === 0) {
    errors.push('frontmatter.tags must have at least 1 element')
  }
  if (typeof data.created !== 'string' || !DATE_RE_INLINE.test(data.created)) {
    errors.push('frontmatter.created must be a string in YYYY-MM-DD format')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true }
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
