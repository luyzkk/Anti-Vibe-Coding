// 2026-05-12 (Luiz/dev): renderer + writer compartilhado por /plan-feature (full) e /quick-plan (quick) — D18
// DI-03-01: colocado em skills/lib/ (cross-skill) conforme convencao DI-01-01/DI-02-01 de fases 01-02
// writer separado do renderer — permite dry-run e teste isolado (03-G3)
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  EXEC_PLAN_SECTIONS_FULL,
  EXEC_PLAN_SECTIONS_QUICK,
  type ExecPlanMode,
} from './exec-plan-sections'
import { resolvePaths } from './path-resolver-v6'
import { slugify } from '../init/lib/slugify'

export type ExecPlanInput = {
  title: string
  mode: ExecPlanMode
  goal?: string
  scope?: string
  assumptions?: string[]
  risks?: string[]
  executionSteps?: string[]
  reviewChecklist?: string[]
  // Validation Log, Compound Opportunity, Lessons Captured comecam vazios (preenchidos durante execucao)
  exitCriteria?: string[]
}

/**
 * Renderiza plano de execucao como string markdown com frontmatter + 10 secoes (full) ou 7 (quick).
 *
 * Secoes vazias usam HTML comment para evitar confusao com plano orfao (03-G1).
 * Validador pode aceitar <!-- preencher --> como estado legitimo de secao vazia.
 */
export function renderExecPlan(input: ExecPlanInput): string {
  const sections = input.mode === 'full' ? EXEC_PLAN_SECTIONS_FULL : EXEC_PLAN_SECTIONS_QUICK

  const today = new Date().toISOString().slice(0, 10)

  // 2026-05-12 (Luiz/dev): JSON.stringify em title — security audit: previne \n quebrando YAML (03-G2)
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(input.title)}`,
    `mode: ${input.mode}`,
    `status: active`,
    `created: ${today}`,
    '---',
    '',
  ].join('\n')

  const heading = `# Exec Plan: ${input.title}\n`

  // 2026-05-12 (Luiz/dev): hash map > switch-case (CLAUDE.md global)
  const body = sections.map((sec) => renderSection(sec, input)).join('\n')
  return frontmatter + heading + '\n' + body
}

function renderSection(name: string, input: ExecPlanInput): string {
  // 2026-05-12 (Luiz/dev): cada secao tem renderizador dedicado no hash map
  const renderers: Record<string, (i: ExecPlanInput) => string> = {
    'Goal':                 (i) => bulletOrEmpty(i.goal ? [i.goal] : undefined),
    'Scope':                (i) => bulletOrEmpty(i.scope ? [i.scope] : undefined),
    'Assumptions':          (i) => bulletOrEmpty(i.assumptions),
    'Risks':                (i) => bulletOrEmpty(i.risks),
    'Execution Steps':      (i) => bulletOrEmpty(i.executionSteps),
    'Review Checklist':     (i) => checkboxOrEmpty(i.reviewChecklist),
    'Validation Log':       () => '<!-- preencher durante execucao: comando + resultado -->\n',
    'Compound Opportunity': () => '<!-- preencher ao /iterate: o que merece virar compound note? -->\n',
    'Lessons Captured':     () => '<!-- preencher ao /iterate: links para docs/compound/ -->\n',
    'Exit Criteria':        (i) => checkboxOrEmpty(i.exitCriteria),
  }
  const renderer = renderers[name] ?? (() => '\n')
  return `## ${name}\n\n${renderer(input)}\n`
}

function bulletOrEmpty(items?: readonly string[]): string {
  if (!items || items.length === 0) return '<!-- preencher -->\n'
  return items.map((it) => `- ${it}`).join('\n') + '\n'
}

function checkboxOrEmpty(items?: readonly string[]): string {
  if (!items || items.length === 0) return '<!-- preencher -->\n'
  return items.map((it) => `- [ ] ${it}`).join('\n') + '\n'
}

/**
 * Escreve o plano no path v6 correto: docs/exec-plans/active/YYYY-MM-DD-{slug}.md
 *
 * Usa resolvePaths() para obter execPlansActiveDir — funciona em qualquer layout detectado.
 * Cria o diretorio recursivamente se nao existir.
 *
 * @param projectRoot - Raiz do projeto (process.cwd() em uso real)
 * @param input - Dados do plano
 */
export async function writeExecPlan(
  projectRoot: string,
  input: ExecPlanInput,
): Promise<{ filePath: string }> {
  const paths = await resolvePaths(projectRoot)
  const today = new Date().toISOString().slice(0, 10)
  const slug = slugify(input.title)
  const fileName = `${today}-${slug}.md`
  const filePath = path.join(paths.execPlansActiveDir, fileName)

  // 2026-05-12 (Luiz/dev): mkdir recursive — active/ pode nao existir em projeto recem-init
  await fs.mkdir(paths.execPlansActiveDir, { recursive: true })
  // 2026-05-12 (Luiz/dev): sem flag 'wx' intencionalmente — reruns de teste precisam sobrescrever
  // (adr-writer usa 'wx' porque numeracao monotonica previne colisao; aqui o nome inclui slug+data que ja e deterministico)
  await fs.writeFile(filePath, renderExecPlan(input), 'utf-8')
  return { filePath }
}
