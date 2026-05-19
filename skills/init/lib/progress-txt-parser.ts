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

export function parseProgressTxt(_content: string): ProgressEntry[] {
  throw new Error('not implemented')
}
