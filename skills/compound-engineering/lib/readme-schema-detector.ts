// 2026-05-24 (Luiz/dev): detecta schema legacy via co-ocorrencia — PRD RF-07
// Heuristica: bloco de exemplo com 2+ dos 3 campos legacy (date/author/decision)
// dentro de um fence ```yaml ou bloco frontmatter ---

const LEGACY_FIELDS = ['date:', 'author:', 'decision:']

/**
 * Detecta se o README usa schema legado (date/author/decision) no bloco de exemplo de frontmatter.
 *
 * Heuristica conservadora: co-ocorrencia de >= 2 campos legacy dentro de blocos ```yaml``` ou
 * frontmatter ---. Retorna false para README canônico (title/category/tags/created).
 *
 * @param readmeContent - Conteúdo do README.md como string
 * @returns true se schema legado detectado, false caso contrário
 */
export function detectLegacySchema(readmeContent: string): boolean {
  // 2026-05-24 (Luiz/dev): escaneia blocos yaml/frontmatter no README
  const yamlBlocks = [...readmeContent.matchAll(/```yaml\s*\n([\s\S]*?)\n```/g)]
  const frontmatterBlocks = [...readmeContent.matchAll(/^---\s*\n([\s\S]*?)\n---/gm)]
  const allBlocks = [...yamlBlocks, ...frontmatterBlocks].map((m) => m[1] ?? '')

  for (const block of allBlocks) {
    const matches = LEGACY_FIELDS.filter((field) => block.includes(field))
    // 2026-05-24 (Luiz/dev): co-ocorrencia >= 2 legacy fields = schema antigo
    if (matches.length >= 2) return true
  }
  return false
}
