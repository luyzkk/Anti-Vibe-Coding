// 2026-05-12 (Luiz/dev): formatter isolado para captura out-of-scope (CA-33)
// Referencia: G6 — paths relativos + forward slashes (Windows-safe)
//             07-A5 — file: se absolutePath presente, feature: se featureName presente
import { relative, sep } from 'path'
import { addLine } from './todo-utils'

export type CaptureInput = {
  projectRoot: string
  absolutePath: string | null
  lineNumber: number | null
  featureName: string | null
  description: string
  today?: Date
}

export function formatTodoLine(input: CaptureInput): string {
  // 2026-05-12 (Luiz/dev): UTC slice evita off-by-one em mudanças de fuso
  const date = (input.today ?? new Date()).toISOString().slice(0, 10)
  const classifier = buildClassifier(input)
  const cls = classifier !== null ? `{${classifier}} ` : ''
  return `- [ ] {${date}} ${cls}${input.description.trim()}`
}

function buildClassifier(input: CaptureInput): string | null {
  if (input.absolutePath !== null) {
    // 2026-05-12 (Luiz/dev): split/join converte \ para / — Windows path safe
    const rel = relative(input.projectRoot, input.absolutePath).split(sep).join('/')
    return input.lineNumber !== null ? `file:${rel}:${input.lineNumber}` : `file:${rel}`
  }
  if (input.featureName !== null) return `feature:${input.featureName}`
  return null
}

// 2026-05-12 (Luiz/dev): wrapper com I/O — skill chama APÓS confirmação do usuário
export function captureToTodoMd(todoMdPath: string, input: CaptureInput): void {
  const line = formatTodoLine(input)
  addLine(todoMdPath, line)
}
