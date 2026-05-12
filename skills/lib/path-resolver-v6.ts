// 2026-05-12 (Luiz/dev): path resolver compartilhado por todas as 6 skills migradas (Plano 05)
// Detecta v6 vs v5 — referencia PRD secao "Estrutura de Pastas Final" e D10
// DI decisao: colocado em skills/lib/ (cross-skill) e nao em anti-vibe-coding/lib/ (inexistente)
// conforme convencao de helpers cross-skill ja estabelecida pelas libs existentes em skills/lib/
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ProjectLayout = 'v6' | 'v5' | 'cru'

export type ResolvedPaths = {
  layout: ProjectLayout
  projectRoot: string
  compoundDir: string
  designDocsDir: string
  execPlansActiveDir: string
  execPlansCompletedDir: string
  legacyLessonsFile: string
}

/**
 * Resolve paths absolutos para as pastas principais do projeto.
 * Detecta layout v6 via heuristica conjunta (G2): docs/compound/ AND docs/exec-plans/ ambos presentes.
 * Apenas um dos dois nao basta — evita falso-positivo em projetos com docs/ ad-hoc.
 *
 * Matriz de layouts:
 * - v6: docs/compound/ + docs/exec-plans/ presentes
 * - v5: lessons-learned.md presente (sem docs/compound/)
 * - cru: nenhum dos dois — projeto virgem, usa v5-default (D10)
 *
 * @example
 * const paths = await resolvePaths(process.cwd())
 * if (paths.layout === 'v6') { // escreve em paths.compoundDir }
 */
export async function resolvePaths(projectRoot: string): Promise<ResolvedPaths> {
  // 2026-05-12 (Luiz/dev): heuristica D10 — v6 = (docs/compound/ + docs/exec-plans/) ambos
  const compoundDir = path.join(projectRoot, 'docs', 'compound')
  const execPlansDir = path.join(projectRoot, 'docs', 'exec-plans')
  const legacyLessons = path.join(projectRoot, 'lessons-learned.md')

  const [hasCompound, hasExecPlans, hasLegacy] = await Promise.all([
    fs.stat(compoundDir).then(() => true).catch(() => false),
    fs.stat(execPlansDir).then(() => true).catch(() => false),
    fs.stat(legacyLessons).then(() => true).catch(() => false),
  ])

  const layout: ProjectLayout = hasCompound && hasExecPlans
    ? 'v6'
    : hasLegacy
      ? 'v5'
      : 'cru'

  return {
    layout,
    projectRoot,
    compoundDir,
    designDocsDir: path.join(projectRoot, 'docs', 'design-docs'),
    execPlansActiveDir: path.join(projectRoot, 'docs', 'exec-plans', 'active'),
    execPlansCompletedDir: path.join(projectRoot, 'docs', 'exec-plans', 'completed'),
    legacyLessonsFile: legacyLessons,
  }
}
