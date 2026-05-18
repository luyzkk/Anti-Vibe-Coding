export type SecretKind =
  | 'aws-key'
  | 'stripe-live'
  | 'postgres-url'
  | 'email'
  | 'jwt'

export type SecretMatch = {
  readonly kind: SecretKind
  readonly lineNumber: number
  readonly redactedSample: string
}

// 2026-05-18 (Luiz/dev): regex literais do PRD SH-01 + D16. NAO usar lookbehind
// (compatibilidade com runtimes JS antigos). 'g' flag obrigatoria — scanSecrets
// itera matches.
const SECRET_PATTERNS: ReadonlyArray<{ kind: SecretKind; pattern: RegExp }> = [
  { kind: 'aws-key',      pattern: /AKIA[0-9A-Z]{16}/g },
  { kind: 'stripe-live',  pattern: /sk_live_[A-Za-z0-9]{24,}/g },
  { kind: 'postgres-url', pattern: /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@[^\s/]+/g },
  { kind: 'email',        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: 'jwt',          pattern: /eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/g },
]

export function scanSecrets(content: string): readonly SecretMatch[] {
  const matches: SecretMatch[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    // 2026-05-18 (Luiz/dev): rastrear intervalos usados para nao duplicar matches sobrepostos
    // (ex: email dentro de postgres-url). Padroes de maior prioridade vem primeiro no array.
    const usedRanges: Array<[number, number]> = []

    for (const { kind, pattern } of SECRET_PATTERNS) {
      // 2026-05-18 (Luiz/dev): clonar regex para nao compartilhar lastIndex entre linhas.
      const localPattern = new RegExp(pattern.source, pattern.flags)
      let m: RegExpExecArray | null
      while ((m = localPattern.exec(line)) !== null) {
        const start = m.index
        const end = start + m[0].length
        const overlaps = usedRanges.some(([s, e]) => start < e && end > s)
        if (overlaps) continue
        usedRanges.push([start, end])
        matches.push({
          kind,
          lineNumber: i + 1,
          redactedSample: redactSample(m[0]),
        })
      }
    }
  }

  return matches
}

function redactSample(rawMatch: string): string {
  const prefix = rawMatch.slice(0, 4)
  return `${prefix}***`
}
