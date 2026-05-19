// skills/init/lib/progress-txt-parser.ts

/**
 * Entrada compound extraida de `.claude/progress.txt`.
 * - `index`: ordem 1-based no arquivo (estabiliza prefixo `{nnnn}-` no writer).
 * - `sourceLineNumber`: linha 1-based onde o heading `### ` aparece.
 * - `category`: extraida do prefixo `[Categoria]` quando presente (ex: `[Armadilha]`, `[Processo]`).
 *                Default `'gotcha'` quando ausente.
 * - `title`: heading sem o prefixo `### ` e sem o `[Categoria]`.
 * - `body`: linhas entre este heading e o proximo `### ` (ou EOF), preservando markdown bruto.
 * - `slug`: kebab-case do title, truncado a 60 chars.
 */
export type ProgressEntry = {
  index: number
  sourceLineNumber: number
  category: string
  title: string
  body: string
  slug: string
}

// 2026-05-19 (Luiz/dev): heading detector — formato Licitar/Dashboard Comu.
// Aceita "### [Categoria] Title" e "### N. Title" e "### Title".
const HEADING_RE = /^###\s+(?:\[([^\]]+)\]\s+)?(?:\d+\.\s+)?(.+?)\s*$/

function kebab(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

/**
 * Parseia o conteudo bruto de `.claude/progress.txt` em entradas estruturadas.
 * Tolerante: blocos sem `**Contexto/Erro/Solucao**` ainda viram entrada (body preservado).
 * Headings de nivel diferente (## ou #) NAO sao tratados — apenas `### ` no inicio da linha.
 */
export function parseProgressTxt(content: string): ProgressEntry[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/)
  const entries: ProgressEntry[] = []

  let current: { lineNo: number; category: string; title: string; bodyLines: string[] } | null = null
  let index = 0

  const flush = (): void => {
    if (current === null) return
    index += 1
    entries.push({
      index,
      sourceLineNumber: current.lineNo,
      category: current.category,
      title: current.title,
      body: current.bodyLines.join('\n').replace(/\s+$/g, ''),
      slug: kebab(current.title) || `entry-${String(index).padStart(4, '0')}`,
    })
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const match = HEADING_RE.exec(line)
    if (match !== null) {
      flush()
      current = {
        lineNo: i + 1,
        category: (match[1] ?? 'gotcha').toLowerCase(),
        title: (match[2] ?? '').trim(),
        bodyLines: [],
      }
      continue
    }
    if (current !== null) {
      current.bodyLines.push(line)
    }
  }
  flush()

  return entries
}
