// 2026-05-11 (Luiz/dev): parser inline simples de YAML frontmatter — Plano 04 fase-02.
// Decisao registrada em MEMORY DI-02-G4: nao dependemos de `gray-matter` para evitar dependencia
// (gray-matter nao esta no package.json do submodule).
// Esquema fixo para compound notes (D19 — navegacao por IA). Resposta a Ambiguity 04-A1 (estrito).

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type CompoundFrontmatter = {
  title: string
  category: string
  tags: ReadonlyArray<string>
  created: string
}

export type FrontmatterResult =
  | { ok: true; data: CompoundFrontmatter }
  | { ok: false; errors: ReadonlyArray<string> }

/**
 * Parse YAML frontmatter de uma compound note.
 *
 * Esquema rigido (Ambiguity 04-A1/A2 resolvidas conservadoras — DI-02-A1, DI-02-A2):
 * - `title`: string nao-vazia
 * - `category`: string nao-vazia
 * - `tags`: array com >=1 string nao-vazia
 * - `created`: string no formato YYYY-MM-DD
 *
 * Campos extras sao permitidos (forward-compat com `applies-to`, `updated`, `status` etc.).
 * Erros sao acumulados — uma chamada reporta TODOS os campos invalidos, nao apenas o primeiro.
 *
 * @example
 * const r = parseFrontmatter(fileContent)
 * if (!r.ok) { console.error(r.errors); process.exit(1) }
 * console.log(r.data.title)
 */
export function parseFrontmatter(body: string): FrontmatterResult {
  const match = body.match(FRONTMATTER_RE)
  if (!match) {
    if (body.trimStart().startsWith('---')) {
      return { ok: false, errors: ['frontmatter delimiter "---" found but never closed'] }
    }
    return { ok: false, errors: ['missing frontmatter (expected `---` on line 1)'] }
  }

  const raw = match[1] ?? ''
  const parsed = parseSimpleYaml(raw)
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors }
  }

  const errors: string[] = []
  const data = parsed.data

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
  } else if (!data.tags.every((t) => typeof t === 'string' && t.trim() !== '')) {
    errors.push('frontmatter.tags must contain non-empty strings only')
  }
  if (typeof data.created !== 'string' || !DATE_RE.test(data.created)) {
    errors.push('frontmatter.created must be a string in YYYY-MM-DD format')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: {
      title: data.title as string,
      category: data.category as string,
      tags: data.tags as ReadonlyArray<string>,
      created: data.created as string,
    },
  }
}

// Parser YAML minimo — cobre apenas o subset usado em compound frontmatter:
// chaves planas (`key: value`), listas inline (`tags: [a, b]`), listas YAML
// (`tags:\n  - a\n  - b`). NAO suporta nested objects. Suficiente para D19.
type ParseYamlResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: ReadonlyArray<string> }

function parseSimpleYaml(raw: string): ParseYamlResult {
  const data: Record<string, unknown> = {}
  const errors: string[] = []
  const lines = raw.split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i += 1
      continue
    }

    const keyValueMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
    if (!keyValueMatch) {
      errors.push(`unparseable line: "${line}"`)
      i += 1
      continue
    }

    const key = keyValueMatch[1] ?? ''
    const rest = (keyValueMatch[2] ?? '').trim()

    if (rest === '') {
      // Block list — expect `  - item` lines next
      const items: string[] = []
      i += 1
      while (i < lines.length && /^\s+-\s+/.test(lines[i] ?? '')) {
        const itemMatch = (lines[i] ?? '').match(/^\s+-\s+(.+)$/)
        if (itemMatch) items.push(stripQuotes((itemMatch[1] ?? '').trim()))
        i += 1
      }
      data[key] = items
      continue
    }

    if (rest.startsWith('[') && rest.endsWith(']')) {
      // Inline list
      const inner = rest.slice(1, -1)
      const items = inner === '' ? [] : inner.split(',').map((s) => stripQuotes(s.trim()))
      data[key] = items
    } else {
      data[key] = stripQuotes(rest)
    }
    i += 1
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, data }
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

/**
 * Valida que body do compound note contem as 3 H2 obrigatorias.
 * Resposta a Ambiguity 04-A1 (DI-02-A1): match estrito H2 exato `## (Problem|Solution|Prevention)\s*$`
 * (case-sensitive, sem trailing content na linha).
 *
 * @example
 * const missing = findMissingRequiredSections(body)
 * if (missing.length > 0) { console.error('Missing:', missing) }
 */
export function findMissingRequiredSections(body: string): ReadonlyArray<string> {
  const required = ['Problem', 'Solution', 'Prevention'] as const
  const missing: string[] = []
  for (const section of required) {
    const re = new RegExp(`^## ${section}\\s*$`, 'm')
    if (!re.test(body)) {
      missing.push(`## ${section}`)
    }
  }
  return missing
}
