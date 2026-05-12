// 2026-05-12 (Luiz/dev): compound note writer — emite frontmatter compativel com Plano 04 fase-02 (compound-check.ts)
// DI decisao: colocado em skills/lib/ (cross-skill), mesma razao que path-resolver-v6.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type CompoundNoteInput = {
  title: string
  body?: string
  category?: string
  tags?: string[]
  problem?: string
  solution?: string
  prevention?: string
  createdISO?: string
}

/**
 * Escreve um arquivo compound note com frontmatter completo e secoes Problem/Solution/Prevention.
 * Idempotente: colisao de slug = sufixo numerico -2, -3 (G5).
 * Tags default: [category ?? 'general'] para garantir >=1 tag (CA-29 ambiguity 04-A2).
 *
 * @example
 * const { filePath } = await writeCompoundNote('/project/docs/compound', { title: 'Bug encontrado' })
 */
export async function writeCompoundNote(
  compoundDir: string,
  input: CompoundNoteInput,
): Promise<{ filePath: string; created: boolean }> {
  const today = input.createdISO ?? new Date().toISOString().slice(0, 10)
  const slug = slugify(input.title)
  const baseName = `${today}-${slug}.md`
  const filePath = await resolveUniquePath(compoundDir, baseName)

  // 2026-05-12 (Luiz/dev): tags default — ao menos 1 string nao vazia (CA-29 ambiguity 04-A2)
  const tags = (input.tags && input.tags.length > 0)
    ? input.tags
    : [input.category ?? 'general']

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(input.title)}`,
    `category: ${input.category ?? 'general'}`,
    `tags: [${tags.map((t) => JSON.stringify(t)).join(', ')}]`,
    `created: ${today}`,
    '---',
    '',
  ].join('\n')

  const sections = [
    `# ${input.title}`,
    '',
    '## Problem',
    input.problem ?? (input.body ?? '(describe the problem here)'),
    '',
    '## Solution',
    input.solution ?? '(describe the solution here)',
    '',
    '## Prevention',
    input.prevention ?? '(describe how to prevent in future)',
    '',
  ].join('\n')

  await fs.mkdir(compoundDir, { recursive: true })
  await fs.writeFile(filePath, frontmatter + sections, 'utf-8')
  return { filePath, created: true }
}

function slugify(s: string): string {
  // 2026-05-12 (Luiz/dev): normaliza unicode, remove acentos, converte espacos em hifens, limita 60 chars
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled'
}

async function resolveUniquePath(dir: string, baseName: string): Promise<string> {
  // 2026-05-12 (Luiz/dev): collision policy G5 — sufixar com -2, -3 se ja existe
  let candidate = path.join(dir, baseName)
  let n = 2
  while (await pathExists(candidate)) {
    const [stem, ext] = splitExt(baseName)
    candidate = path.join(dir, `${stem}-${n}${ext}`)
    n++
  }
  return candidate
}

async function pathExists(p: string): Promise<boolean> {
  try { await fs.stat(p); return true } catch { return false }
}

function splitExt(name: string): [string, string] {
  const i = name.lastIndexOf('.')
  return i === -1 ? [name, ''] : [name.slice(0, i), name.slice(i)]
}
