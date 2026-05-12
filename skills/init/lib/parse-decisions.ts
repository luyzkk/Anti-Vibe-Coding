// 2026-05-11 (Luiz/dev): parser de decisions.md → DecisionEntry[].
// Formato esperado:
//   ### [Nome]: [Opcao Escolhida]
//   **Data:** YYYY-MM-DD
//   **Alternativas consideradas:** ...
//   **Justificativa:** ...
//   **Risco conhecido:** ...
//   **Reversibilidade:** Reversivel | Irreversivel

export type DecisionEntry = {
  title: string
  chosen: string  // opcao escolhida (depois do colon no header)
  date: string
  alternatives: string
  justification: string
  risk: string
  reversibility: string
  /** Body completo do bloco para fallback. */
  rawBody: string
}

const RE_H3_DECISION = /^### \[([^\]]+)\]\s*:?\s*(.*)$/
const RE_H3_DECISION_SIMPLE = /^### (.+):\s*(.+)$/

export function parseDecisions(body: string): DecisionEntry[] {
  const lines = body.split(/\r?\n/)
  const entries: DecisionEntry[] = []
  let currentLines: string[] = []
  let currentTitle: string | null = null
  let currentChosen: string | null = null

  const flush = (): void => {
    if (currentTitle && currentLines.length > 0) {
      const raw = currentLines.join('\n')
      entries.push({
        title: currentTitle,
        chosen: currentChosen ?? '',
        date: extract(raw, /\*\*Data:?\*\*\s*([0-9-]+)/i),
        alternatives: extract(raw, /\*\*Alternativas[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i),
        justification: extract(raw, /\*\*Justificativa:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i),
        risk: extract(raw, /\*\*Risco[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i),
        reversibility: extract(raw, /\*\*Reversibilidade:?\*\*([\s\S]*?)(?=\n\n|$)/i),
        rawBody: raw.trim(),
      })
    }
    currentLines = []
    currentTitle = null
    currentChosen = null
  }

  for (const line of lines) {
    let m = RE_H3_DECISION.exec(line)
    if (m) {
      flush()
      currentTitle = m[1]!.trim()
      currentChosen = m[2]!.trim()
      continue
    }
    m = RE_H3_DECISION_SIMPLE.exec(line)
    if (m && currentTitle === null) {  // so se nao matchou bracket form
      flush()
      currentTitle = m[1]!.trim()
      currentChosen = m[2]!.trim()
      continue
    }
    if (currentTitle !== null) {
      currentLines.push(line)
    }
  }
  flush()

  return entries
}

function extract(body: string, re: RegExp): string {
  const m = re.exec(body)
  return m ? m[1]!.trim() : ''
}
