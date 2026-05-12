// 2026-05-11 (Luiz/dev): nome do projeto = basename(cwd) — heuristica minima
// para o tracer bullet. Plano 02 fase-03 expande para ler package.json/Gemfile.

import path from 'node:path'

export function detectProjectName(cwd: string): string {
  return path.basename(cwd)
}
