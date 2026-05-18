// 2026-05-18 (Luiz/dev): tipos compartilhados entre Step 09 (propose) e Step 10/11 (apply) — PRD MH-04, D4
// Mantidos em arquivo separado para evitar import circular entre os 3 steps.

export type TransformAction = {
  readonly kind: 'transform'
  readonly source: string       // Path relativo ao cwd. Tipicamente 'CLAUDE.md'.
  readonly target: 'CLAUDE_MD_MIRROR'
  readonly blocks: ReadonlyArray<{
    readonly heading: string
    readonly destination: string  // ex: 'docs/DESIGN.md', 'docs/SECURITY.md'
  }>
}

export type MoveAction = {
  readonly kind: 'move'
  readonly source: string
  readonly target: string
  readonly orphan: boolean
}

export type BlockedAction = {
  readonly kind: 'blocked'
  readonly source: string
  readonly reason: 'secret-detected'
  readonly secretKind: string
}

export type MergeProposal = {
  readonly transforms: ReadonlyArray<TransformAction>
  readonly moves: ReadonlyArray<MoveAction>
  readonly blocked: ReadonlyArray<BlockedAction>
}
