// 2026-05-18 (Luiz/dev): Plano 02 fase-02 GREEN — implementacao real do gerador.
// Logica de filtragem, rendering e montagem do PLAN.md de populacao do harness.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST } from './template-manifest'

/**
 * 2026-05-18 (Luiz/dev): D13+MH-02 do PRD — uma task por arquivo populavel.
 * Wave = 1 (paralelo) para tasks de populacao, Wave = 2 (barreira) para validate.
 */
export type PopulatePlanTask = {
  readonly targetPath: string
  readonly wave: 1 | 2
  readonly subagentRole: 'harness-populator' | 'harness-validator'
}

/**
 * 2026-05-18 (Luiz/dev): D1+D14+CH-03 do PRD — input do gerador.
 * `cwd` = projeto alvo; `clock` injetavel em testes; `sharedGlossary` opcional v1.
 */
export type PopulatePlanInput = {
  readonly cwd: string
  readonly projectName: string
  /** Injetavel em testes para determinismo. Default: () => new Date(). */
  readonly clock?: () => Date
  /** CH-03: terminologia compartilhada extraida do projeto (Planos 03+). Undefined em greenfield. */
  readonly sharedGlossary?: string
}

/**
 * 2026-05-18 (Luiz/dev): MH-01+G5 do plano02 — caminho do PLAN.md de populacao
 * em formato path-safe (Windows G5: sem `:`).
 */
export type PopulatePlanOutput = {
  /** Conteudo Markdown final, pronto para fs.writeFile. */
  readonly planMarkdown: string
  /** Caminho relativo ao cwd onde o Step 91 escrevera: `docs/exec-plans/active/{date}-populate-harness/PLAN.md`. */
  readonly relativePath: string
  /** Lista de tasks renderizadas (uteis para audit log + assertions de teste). */
  readonly tasks: ReadonlyArray<PopulatePlanTask>
}

// Arquivos excluidos por DST exato (D14 do PRD — arquivos filosoficos)
const EXCLUDED_FROM_POPULATION = new Set([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])

// Prefixos excluidos por padrao
const EXCLUDED_PATTERNS = [/^\.github\//, /^scripts\//]

/**
 * Converte Date para string path-safe (sem `:`, sem milissegundos).
 * Ex: 2026-05-18T14:30:00.000Z -> 2026-05-18T14-30-00Z
 */
function datePathSafe(now: Date): string {
  return now.toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z')
}

/**
 * Renderiza o bloco markdown de uma task de populacao individual.
 */
function renderTaskMarkdown(dst: string): string {
  return `### Task: Populate \`${dst}\`

**Subagente:** harness-populator
**Wave:** 1

Ler o arquivo instalado em \`${dst}\` e popular com conteudo real do repositorio.
`
}

/**
 * Bloco fixo da task de validacao (wave 2, sempre a ultima).
 */
const VALIDATE_TASK_BLOCK = `### Task: Validate Harness

**Subagente:** harness-validator
**Wave:** 2

Executar validacao completa do harness apos populacao:

\`\`\`bash
bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts
\`\`\`

Falha trava o plano em status \`awaiting-fix\` (SH-06).
`

/**
 * Renderiza a secao de glossario compartilhado, se presente.
 */
function renderGlossarySection(glossary: string): string {
  return `## Glossario Compartilhado

> Subagentes da wave 1 devem usar esta terminologia ao popular os arquivos.

${glossary}

---

`
}

/**
 * Gera o PLAN.md de populacao do harness a partir do TEMPLATE_MANIFEST e do
 * template canonico em `assets/snippets/populate-plan-template.md`.
 */
export async function generatePopulatePlan(input: PopulatePlanInput): Promise<PopulatePlanOutput> {
  const now = input.clock !== undefined ? input.clock() : new Date()
  const templatePath = path.join(import.meta.dir, '..', 'assets', 'snippets', 'populate-plan-template.md')
  const templateContent = await fs.readFile(templatePath, 'utf-8')

  // Filtrar entradas populaveis
  const populatableEntries = TEMPLATE_MANIFEST.filter(entry => {
    if (!entry.dst.endsWith('.md')) return false
    if (EXCLUDED_FROM_POPULATION.has(entry.dst)) return false
    if (EXCLUDED_PATTERNS.some(rx => rx.test(entry.dst))) return false
    return true
  })

  // Montar tasks estruturadas
  const populateTasks: PopulatePlanTask[] = populatableEntries.map(entry => ({
    targetPath: entry.dst,
    wave: 1,
    subagentRole: 'harness-populator',
  }))

  const validateTask: PopulatePlanTask = {
    targetPath: 'harness-validate',
    wave: 2,
    subagentRole: 'harness-validator',
  }

  const tasks: ReadonlyArray<PopulatePlanTask> = [...populateTasks, validateTask]

  // Renderizar blocos de tasks
  const tasksBlock = populatableEntries.map(entry => renderTaskMarkdown(entry.dst)).join('\n')

  // Renderizar bloco de glossario (ou string vazia)
  const glossaryBlock = input.sharedGlossary !== undefined
    ? renderGlossarySection(input.sharedGlossary)
    : ''

  // Substituir placeholders no template
  const dateStr = now.toISOString().slice(0, 10)
  const planMarkdown = templateContent
    .replace('{{PROJECT_NAME}}', input.projectName)
    .replace('{{DATE}}', dateStr)
    .replace('{{SHARED_GLOSSARY_BLOCK}}', glossaryBlock)
    .replace('{{TASKS_BLOCK}}', tasksBlock)
    .replace('{{VALIDATE_TASK}}', VALIDATE_TASK_BLOCK)

  // Caminho relativo usando posix (Windows-safe)
  const dateSafe = datePathSafe(now)
  const relativePath = path.posix.join(
    'docs',
    'exec-plans',
    'active',
    `${dateSafe}-populate-harness`,
    'PLAN.md',
  )

  return { planMarkdown, relativePath, tasks }
}
