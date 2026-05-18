// 2026-05-18 (Luiz/dev): renderer compartilhado entre --dry-run e needsUser — CA-07 + CA-13 + D18

export type MergePreview = {
  readonly claudeMd: {
    readonly originalLines: number
    readonly finalLines: number
    readonly akitaBlocks: ReadonlyArray<{
      readonly title: string
      readonly target: string
    }>
  }
  readonly docMoves: ReadonlyArray<{
    readonly from: string
    readonly to: string
    readonly action: 'move' | 'reference'
  }>
  readonly blockedBySecrets: ReadonlyArray<{
    readonly path: string
    readonly reason: string
  }>
  readonly backupTimestamp: string
}

// 2026-05-18 (Luiz/dev): output deve ser DETERMINISTICO para snapshot test passar — ordem das entries
// vem do input, nao re-ordenar internamente. CA-13 dry-run parity depende disso.
export function renderMergePreview(input: MergePreview): string {
  const lines: string[] = []
  lines.push('PROPOSTA DE TRANSFORMACAO (revise antes de aprovar)')
  lines.push('')
  lines.push(`CLAUDE.md (existente, ${input.claudeMd.originalLines} linhas):`)
  for (const block of input.claudeMd.akitaBlocks) {
    lines.push(`  [Bloco: ${block.title}] -> ${block.target}`)
  }
  lines.push(`CLAUDE.md final: indice ${input.claudeMd.finalLines} linhas espelhado de AGENTS.md`)
  lines.push(`Backup: .anti-vibe/backup/${input.backupTimestamp}/CLAUDE.md`)
  lines.push('')

  if (input.docMoves.length > 0) {
    lines.push(`Docs existentes (${input.docMoves.length} arquivos):`)
    for (const move of input.docMoves) {
      const tag = move.action === 'reference' ? ' (orfao -> references)' : ''
      lines.push(`  ${move.from} -> ${move.to}${tag}`)
    }
    lines.push('')
  }

  lines.push('README.md: intocavel (read-only)')
  lines.push('')

  if (input.blockedBySecrets.length > 0) {
    lines.push('Secrets detectados:')
    for (const blocked of input.blockedBySecrets) {
      lines.push(`  WARN ${blocked.path} ${blocked.reason}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
