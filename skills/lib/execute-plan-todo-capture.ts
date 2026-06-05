// 2026-05-12 (Luiz/dev): formatter isolado para captura out-of-scope (CA-33)
// Referencia: G6 — paths relativos + forward slashes (Windows-safe)
//             07-A5 — file: se absolutePath presente, feature: se featureName presente
import * as fs from 'fs'
import { posix } from 'path'

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
    // 2026-05-12 (Luiz/dev): normaliza \ -> / SEMPRE (determinístico cross-platform),
    // depois usa posix.relative para que o resultado independa do path.sep do OS.
    // Antes usava relative()+split(sep): platform-dependent, quebrava no Linux CI (G6).
    const root = input.projectRoot.replace(/\\/g, '/')
    const abs = input.absolutePath.replace(/\\/g, '/')
    const rel = posix.relative(root, abs)
    return input.lineNumber !== null ? `file:${rel}:${input.lineNumber}` : `file:${rel}`
  }
  if (input.featureName !== null) return `feature:${input.featureName}`
  return null
}

// 2026-05-12 (Luiz/dev): wrapper com I/O — skill chama APÓS confirmação do usuário
// Bypassa addLine pois formatTodoLine já produz linha completa incluindo '- [ ]'
// addLine adicionaria outro '- [ ] ' causando duplicação de prefixo
export function captureToTodoMd(todoMdPath: string, input: CaptureInput): void {
  const line = formatTodoLine(input)
  if (!fs.existsSync(todoMdPath)) {
    fs.writeFileSync(todoMdPath, `# TODO\n\n${line}\n`, 'utf-8')
    return
  }
  const content = fs.readFileSync(todoMdPath, 'utf-8')
  const sep2 = content.endsWith('\n') ? '' : '\n'
  fs.writeFileSync(todoMdPath, content + sep2 + line + '\n', 'utf-8')
}
