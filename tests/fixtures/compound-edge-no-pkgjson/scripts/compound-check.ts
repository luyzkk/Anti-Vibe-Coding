#!/usr/bin/env bun
// 2026-05-24 (Luiz/dev): port of compound-check.mjs (Andre) to TS+Bun — D8 + Plano 02 fase-01
// Inlines helpers (parseFrontmatterInline, listCompoundFilesLocal) — RF-10: no lib/ dep in target.
// Schema mirrored in skills/compound-engineering/lib/compound-frontmatter.ts (manual sync).
// compound-check — frontmatter + sections (CA-29) + P3 strict rules (D8).

import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const STRICT = process.argv.includes('--strict')

type Failure = { rule: string; file: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  const files = await listCompoundFilesLocal(root)
  await checkAllNotes(files, failures)

  if (STRICT) {
    // 2026-05-24 (Luiz/dev): P3 — 3 regras --strict (D8, DI-Plano02-fase01-p3-rules)

    // P3.1 — AGENTS link: AGENTS.md must link to docs/COMPOUND_ENGINEERING.md
    const agentsOk = await checkAgentsLink(root)
    if (!agentsOk) {
      failures.push({
        rule: 'agents-link',
        file: 'AGENTS.md',
        message: '[agents-link] AGENTS.md: missing link to docs/COMPOUND_ENGINEERING.md',
      })
    }

    // P3.2 — Plan-generator: scripts/new-plan.ts.tpl or new-plan.mjs must have 4 sections
    const planGenErrors = await checkPlanGeneratorSections(root)
    for (const msg of planGenErrors) {
      failures.push({ rule: 'plan-generator', file: 'scripts/new-plan.ts.tpl', message: msg })
    }

    // P3.3 — Active-plan hygiene: plans in docs/exec-plans/active/ must not have unfilled placeholders
    const planHygieneErrors = await checkActivePlanHygiene(root)
    for (const msg of planHygieneErrors) {
      failures.push({ rule: 'active-plan', file: 'docs/exec-plans/active/', message: msg })
    }
  }

  if (failures.length > 0) {
    console.error('Compound check failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.file}: ${f.message}`)
    }
    process.exit(1)
  }

  console.log(`${files.length} compound notes validated${STRICT ? ' (strict mode)' : ''}`)
  process.exit(0)
}

// === P3 helpers (strict-only) ===

async function checkAgentsLink(rootDir: string): Promise<boolean> {
  // 2026-05-24 (Luiz/dev): regex D23 — qualquer link markdown apontando para docs/COMPOUND_ENGINEERING.md
  try {
    const body = await fs.readFile(path.join(rootDir, 'AGENTS.md'), 'utf8')
    return /\[.*?\]\(\.?\/?docs\/COMPOUND_ENGINEERING\.md\)/.test(body)
  } catch {
    return true // AGENTS.md absent = skip (not required to exist)
  }
}

async function checkPlanGeneratorSections(rootDir: string): Promise<string[]> {
  // 2026-05-24 (Luiz/dev): P3.2 — checks new-plan.ts.tpl or new-plan.mjs (Andre uses .mjs, we use .ts.tpl)
  const candidates = [
    path.join(rootDir, 'scripts', 'new-plan.ts.tpl'),
    path.join(rootDir, 'scripts', 'new-plan.mjs'),
    path.join(rootDir, 'scripts', 'new-plan.ts'),
  ]
  let body: string | null = null
  for (const candidate of candidates) {
    try {
      body = await fs.readFile(candidate, 'utf8')
      break
    } catch {
      // try next
    }
  }
  if (body === null) return [] // sem gerador = skip

  const requiredSections = [
    '## Compound Opportunity',
    '## Review Checklist',
    '## Validation Log',
    '## Lessons Captured',
  ]
  const missing: string[] = []
  for (const section of requiredSections) {
    if (!body.includes(section)) {
      missing.push(`[plan-generator] new-plan script missing section: ${section}`)
    }
  }
  return missing
}

async function checkActivePlanHygiene(rootDir: string): Promise<string[]> {
  // 2026-05-24 (Luiz/dev): P3.3 — checks active plans have no unfilled placeholder text
  const activeDir = path.join(rootDir, 'docs', 'exec-plans', 'active')
  const errors: string[] = []

  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(activeDir, { withFileTypes: true })
  } catch {
    return [] // directory absent = skip
  }

  const placeholderPhrases = [
    'Describe the desired outcome in one paragraph.',
    'List the assumptions that could invalidate the plan.',
    'Note migration, rollout, or dependency risks.',
    'Define what must be true before the work is considered done.',
  ]

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') continue

    const relativePath = path.join('docs/exec-plans/active', entry.name)
    let content: string
    try {
      content = await fs.readFile(path.join(rootDir, relativePath), 'utf8')
    } catch {
      errors.push(`[active-plan] unable to read ${relativePath}`)
      continue
    }

    for (const phrase of placeholderPhrases) {
      if (content.includes(phrase)) {
        errors.push(`[active-plan] ${relativePath}: still contains placeholder text: "${phrase}"`)
      }
    }
  }
  return errors
}

// === Collector inlined (no lib/ dep in target project) ===
// lib/compound-files-collector.ts in the plugin is the source; .tpl carries an inline copy.
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
// Parser inlined — script is independent from the plugin in the target project.
// Schema mirrored in lib/compound-frontmatter.ts (canonical source for programmatic use).
// Manual sync: if schema changes, update both places.

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
