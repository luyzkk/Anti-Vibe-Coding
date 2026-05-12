// 2026-05-12 (Luiz/dev): revoke helper — D31/CA-43 — cria ADR superseded com link bidirecional
// DI-01-01: em skills/lib/ (cross-skill), nao em anti-vibe-coding/lib/ (inexistente)
// noUncheckedIndexedAccess: guards em todos os m[1] de regex
import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'

export type RevokeOptions = {
  reason: string
  newSlug?: string
  newBody?: string
}

export type RevokeResult = {
  original: { id: string; path: string }
  superseded: { id: string; path: string }
}

/**
 * Revoga ADR criando nova ADR superseded com link bidirecional.
 * ADR original NAO e deletada. (CA-43, R14)
 *
 * @param id aceita: 1, '3', 'ADR-0003', 'ADR-3'
 *
 * @example
 * const result = revoke('/project', 3, { reason: 'Replaced by simpler approach' })
 * // result.superseded.id === 'ADR-0004'
 */
export function revoke(projectRoot: string, id: string | number, opts: RevokeOptions): RevokeResult {
  // 2026-05-12 (Luiz/dev): calcula designDocsDir direto — evita async para manter assinatura sync
  const designDocsDir = path.join(projectRoot, 'docs', 'design-docs')

  const originalFile = resolveAdrFile(designDocsDir, id)
  if (originalFile === null) {
    throw new Error(`ADR "${id}" nao encontrada em ${designDocsDir}`)
  }

  const originalFileName = path.basename(originalFile)
  const originalId = extractAdrIdFromFilename(originalFileName)
  const originalSlug = extractSlugFromFilename(originalFileName)

  // numero monotônico: max existente + 1
  const nextNum = computeNextAdrNumber(designDocsDir)
  const nextFormatted = formatAdrNumber(nextNum)
  const newId = `ADR-${nextFormatted}`

  const newSlug = opts.newSlug ?? `${originalSlug}-superseded`
  const newFileName = `${newId}-${newSlug}.md`
  const newFilePath = path.join(designDocsDir, newFileName)

  const today = new Date().toISOString().slice(0, 10)

  // --- cria novo ADR superseded ---
  const newBody = opts.newBody ?? renderSupersededTemplate({
    supersedesId: originalId,
    supersedesPath: originalFileName,
    reason: opts.reason,
  })

  const newFrontmatter = [
    '---',
    `id: ${newId}`,
    `title: "Supersedes ${originalId}"`,
    `status: active`,
    `supersedes: ${originalId}`,
    `created: ${today}`,
    '---',
    '',
  ].join('\n')

  fs.writeFileSync(newFilePath, newFrontmatter + newBody, 'utf-8')

  // --- atualiza ADR original ---
  const originalContent = fs.readFileSync(originalFile, 'utf-8')
  const parsed = matter(originalContent)

  // atualiza status no frontmatter
  parsed.data.status = `superseded-by: ${newId}`

  // remove bloco superseded-by anterior (idempotencia parcial — evita duplicar bloco)
  const cleanedBody = parsed.content.replace(/^>\s*\*\*Superseded-by:\*\*[^\n]+\n+/m, '')

  // prepende novo bloco no topo do body
  const supersededBlock = `> **Superseded-by:** [${newId}](./${newFileName}) on ${today} — ${opts.reason}\n\n`
  const newOriginalBody = supersededBlock + cleanedBody.trimStart()

  // reconstroi o arquivo com frontmatter atualizado
  const newOriginalContent = matter.stringify(newOriginalBody, parsed.data)
  fs.writeFileSync(originalFile, newOriginalContent, 'utf-8')

  return {
    original: { id: originalId, path: originalFile },
    superseded: { id: newId, path: newFilePath },
  }
}

// --- auxiliares ---

function resolveAdrFile(designDocsDir: string, id: string | number): string | null {
  const idStr = typeof id === 'number' ? String(id) : id
  const num = parseAdrNumber(idStr)
  if (num === null) return null

  const formatted = formatAdrNumber(num)
  let entries: string[]
  try {
    entries = fs.readdirSync(designDocsDir)
  } catch {
    return null
  }

  const match = entries.find((f) => f.startsWith(`ADR-${formatted}-`))
  if (match === undefined) return null
  return path.join(designDocsDir, match)
}

function parseAdrNumber(id: string): number | null {
  const m = id.match(/(?:ADR-)?(\d+)$/i)
  if (!m) return null
  const numStr = m[1]
  if (numStr === undefined) return null
  return parseInt(numStr, 10)
}

function formatAdrNumber(n: number): string {
  return n.toString().padStart(4, '0')
}

function extractAdrIdFromFilename(fileName: string): string {
  const m = fileName.match(/^(ADR-\d{4})-/)
  if (!m) throw new Error(`filename "${fileName}" nao casa com ADR-NNNN-*.md`)
  const id = m[1]
  if (id === undefined) throw new Error(`filename "${fileName}" nao casa com ADR-NNNN-*.md`)
  return id
}

function extractSlugFromFilename(fileName: string): string {
  return fileName.replace(/^ADR-\d{4}-/, '').replace(/\.md$/, '')
}

function computeNextAdrNumber(designDocsDir: string): number {
  // 2026-05-12 (Luiz/dev): adr-writer.ts nao exporta computeNextAdrNumber — implementado aqui (GT-01)
  // noUncheckedIndexedAccess: m[1] guardado antes de usar
  const max = fs.readdirSync(designDocsDir)
    .filter((f) => /^ADR-\d{4}-/.test(f))
    .map((f) => {
      const m = f.match(/^ADR-(\d{4})-/)
      if (!m) return 0
      const numStr = m[1]
      if (numStr === undefined) return 0
      return parseInt(numStr, 10)
    })
    .reduce((a, b) => Math.max(a, b), 0)
  return max + 1
}

function renderSupersededTemplate(args: {
  supersedesId: string
  supersedesPath: string
  reason: string
}): string {
  return [
    `> **Supersedes:** [${args.supersedesId}](./${args.supersedesPath})`,
    '',
    '## Context',
    '',
    args.reason,
    '',
    '## Decision',
    '',
    '_TODO: descrever nova decisao que substitui a anterior._',
    '',
    '## Consequences',
    '',
    '_TODO: trade-offs e impactos._',
    '',
  ].join('\n')
}
