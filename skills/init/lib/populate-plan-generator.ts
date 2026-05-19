// 2026-05-18 (Luiz/dev): Plano 02 fase-02 GREEN — implementacao real do gerador.
// Logica de filtragem, rendering e montagem do PLAN.md de populacao do harness.
// 2026-05-19 (Luiz/dev): Plano 03 fase-03 — renderer v2. Sai template com {{TASKS_BLOCK}},
// entra geracao programatica com 4 blocos por doc canonico (MH-02 do PRD).
// G3 do README: ZERO chamada de LLM aqui — apenas renderiza estrutura para subagent consumir.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST, type TemplateEntry } from './template-manifest'
import type { DiscoveryManifestEntry } from './discovery-manifest-light'
import type { StackAwareInputPaths, CanonicalDoc } from './stack-aware-input-paths'

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

// =============================================================================
// v2: renderer programatico com 4 blocos por doc canonico (Plano 03 fase-03)
// =============================================================================

// --- Tipos publicos v2 ---

export type PopulatePlanPhase = {
  readonly fase: number
  readonly docCanonico: string
  readonly inputsDocs: ReadonlyArray<string>
  readonly inputsCode: ReadonlyArray<{ path: string; exists: boolean; note?: string }>
  readonly instrucaoLLM: string
  readonly criterioDone: string
}

export type PopulatePlanInputV2 = {
  readonly cwd: string
  readonly projectName: string
  /** Manifest leve de docs existentes (de fase-01). Undefined em greenfield. */
  readonly manifest?: ReadonlyArray<DiscoveryManifestEntry>
  /** Paths de codigo por doc canonico (de fase-02). Undefined em greenfield. */
  readonly stackPaths?: StackAwareInputPaths
  /** Injetavel em testes para determinismo. Default: () => new Date(). */
  readonly clock?: () => Date
}

export type PopulatePlanOutputV2 = {
  /** Indice (PLAN.md root) — sumario com glossario e link para cada fase. */
  readonly planIndexMarkdown: string
  /** Conteudo de cada fase — chave = nome do arquivo (ex: `fase-01-architecture.md`). */
  readonly phaseFiles: ReadonlyMap<string, string>
  /** Path relativo da pasta destino sem filename — `docs/exec-plans/active/{date}-populate-harness`. */
  readonly relativeFolderPath: string
  /** Fases emitidas — util para audit log e testes. */
  readonly phases: ReadonlyArray<PopulatePlanPhase>
}

// --- Filtro de populaveis (exportado para reuso em testes e callers) ---

// 2026-05-19 (Luiz/dev): preservado do gerador v1 — D14 do PRD mantem filosoficos sem populate.
const EXCLUDED_FROM_POPULATION_V2 = new Set<string>([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])
const EXCLUDED_PATTERNS_V2: ReadonlyArray<RegExp> = [/^\.github\//, /^scripts\//]

export function isPopulatable(entry: TemplateEntry): boolean {
  if (!entry.dst.endsWith('.md')) return false
  if (EXCLUDED_FROM_POPULATION_V2.has(entry.dst)) return false
  if (EXCLUDED_PATTERNS_V2.some(rx => rx.test(entry.dst))) return false
  return true
}

// --- Mapa de instrucoes LLM por doc canonico ---

// 2026-05-19 (Luiz/dev): instrucoes LLM por doc canonico. Adicionar entry quando novo doc
// for adicionado ao TEMPLATE_MANIFEST. Default cobre docs nao mapeados.
// CLAUDE.md global rule: preferir hash maps sobre switch-case.
const LLM_INSTRUCTIONS: Record<string, string> = {
  'ARCHITECTURE.md':
    'Leia os inputs (docs candidatos + codigo). Sintetize a arquitetura REAL do projeto: ' +
    'dominios, modulos compartilhados, integracoes externas. Cada afirmacao deve apontar para ' +
    'um arquivo/pasta do repo. Zero placeholder generico. Se um input nao tem destino obvio ' +
    'neste doc, sugira consolidacao em outro canonico e marque `needsUser` (DQ2 do CONTEXT).',
  'docs/FRONTEND.md':
    'Documente a arquitetura de UI real: rotas, layouts, componentes compartilhados, sistema de ' +
    'design vivo. Referencie cada componente por path. Se houver Tailwind config, extraia tokens ' +
    'principais (cores, spacing, typography) e cite o arquivo.',
  'docs/SECURITY.md':
    'Auth (provider, fluxo), CORS, secrets (onde, como gerenciar), RLS / authz. Cada item deve ' +
    'citar arquivo (middleware, policy, env.example). Se Supabase: enumere policies de migrations. ' +
    'Se algum aspecto critico (auth, secrets) nao tem evidencia no codigo, marque `needsUser`.',
  'docs/RELIABILITY.md':
    'Error boundaries, retries, observabilidade (logs, traces, metrics), backups. Cite arquivos de ' +
    'config e libs. Sem speculation — apenas o que esta no codigo. Para edge functions ou jobs, ' +
    'enumere com path + responsabilidade.',
  'docs/DESIGN.md':
    'Design System visual: tokens (cores, tipografia, spacing), componentes base, padroes de ' +
    'composicao. Extrair de tailwind.config + globals.css + components/ui. NAO documentar regras ' +
    'de codigo aqui (vao em CODE_STYLE.md).',
  'docs/CODE_STYLE.md':
    'Regras de estilo de codigo: convencoes de nomes, organizacao de arquivos, padroes que o time ' +
    'segue. Inputs: snippets `akita-*.md` (se existirem), `.eslintrc`/`eslint.config`, `.prettierrc`. ' +
    'Codigo real do projeto e a fonte da verdade — extrair padroes implicitos.',
  'docs/QUALITY_SCORE.md':
    'Rubrica de score de PR review. Pode comecar do template canonico + adaptar pesos para a ' +
    'realidade do time. Se nao houver historico de PR review, mantenha o template e adicione ' +
    'TODO `// preencher apos 5 PR reviews`.',
  'docs/PLANS.md':
    'Indice de planos exec ativos + estado de cada um. Listar pastas em `docs/exec-plans/active/`. ' +
    'Sem speculation — so o que esta no FS.',
  'docs/STATE.md':
    'Snapshot do estado atual: versao do plugin, ultima init rodada, stack detectado. Maior parte ' +
    'preenchida pelo Step 03 (detect-stack-and-register) — esta fase confirma e amplia se houver ' +
    'contexto novo (ex: PRD ativo, plano em execucao).',
  'docs/design-docs/core-beliefs.md':
    'Principios senior do projeto: arquitetura padrao, seguranca por default, qualidade nao-negociavel. ' +
    'Se progress.txt tem gotchas que ascendem a principios, promover (DQ5 do CONTEXT). Caso contrario, ' +
    'usar templates do plugin + adaptar nomes ao time.',
  'AGENTS.md':
    'Index do que cada agente/skill lendo este projeto deve saber. Listar docs canonicos com 1 linha ' +
    'cada explicando quando ler. CLAUDE.md mirror este conteudo.',
  'CLAUDE.md':
    'Mirror canonico de AGENTS.md (alguns agents leem CLAUDE.md, outros AGENTS.md). Mesmo conteudo, ' +
    'mesmo formato. Em alteracoes futuras: atualizar AMBOS.',
}

const DEFAULT_INSTRUCTION =
  'Leia os inputs (docs candidatos + codigo). Sintetize o conteudo deste doc canonico com base na ' +
  'verdade do projeto. Zero placeholder. Se nao houver evidencia suficiente, marque `needsUser` e ' +
  'pergunte ao dev no PR.'

function llmInstructionFor(dst: string): string {
  return LLM_INSTRUCTIONS[dst] ?? DEFAULT_INSTRUCTION
}

// --- Heuristica docs-candidatos -> doc-canonico ---

function suggestCandidateDocsFor(
  dst: string,
  manifest: ReadonlyArray<DiscoveryManifestEntry>,
): string[] {
  const baseName = dst.split('/').pop()?.replace(/\.md$/, '').toLowerCase() ?? ''
  if (!baseName) return manifest.map(e => e.path)
  // Match por substring no path; se 0 matches, retorna TODOS (LLM filtra)
  const matches = manifest
    .filter(e => e.path.toLowerCase().includes(baseName))
    .map(e => e.path)
  return matches.length > 0 ? matches : manifest.map(e => e.path)
}

// --- Helpers de render por bloco ---

function renderInputsDocsBlock(paths: ReadonlyArray<string>): string {
  if (paths.length === 0) {
    return '### Inputs (docs candidatos)\n\n_(Nenhum doc existente detectado. LLM gera do zero a partir do codigo.)_\n'
  }
  const list = paths.map(p => `- \`${p}\``).join('\n')
  return `### Inputs (docs candidatos)\n\n${list}\n\n_(LLM confirma associacao no momento do /execute-plan — pode pular itens irrelevantes.)_\n`
}

function renderInputsCodeBlock(
  entries: ReadonlyArray<{ path: string; exists: boolean; note?: string }>,
): string {
  if (entries.length === 0) {
    return '### Inputs (codigo)\n\n_(Nenhum path candidato para este doc no stack detectado.)_\n'
  }
  const list = entries
    .map(e => {
      if (e.exists) return `- \`${e.path}\``
      return `- \`${e.path}\` _(${e.note ?? 'nao encontrado'})_`
    })
    .join('\n')
  return `### Inputs (codigo)\n\n${list}\n`
}

function renderLLMInstructionBlock(instruction: string): string {
  return `### Instrucao LLM\n\n${instruction}\n`
}

function renderDoneCriteriaBlock(): string {
  return (
    '### Criterio de done\n\nHumano valida via PR review. Validador Step 90 emite warnings ' +
    'nao bloqueantes — qualidade real e avaliada por leitura humana do output. DQ3 do CONTEXT.\n'
  )
}

function docToSlug(dst: string): string {
  return dst
    .replace(/\.md$/, '')
    .replace(/[\/_]/g, '-')
    .toLowerCase()
}

function renderPhase(phase: PopulatePlanPhase): string {
  return [
    `# Fase ${String(phase.fase).padStart(2, '0')}: Popular \`${phase.docCanonico}\``,
    '',
    `**Doc canonico:** \`${phase.docCanonico}\``,
    `**Subagente:** harness-populator`,
    '',
    '---',
    '',
    renderInputsDocsBlock(phase.inputsDocs),
    '',
    renderInputsCodeBlock(phase.inputsCode),
    '',
    renderLLMInstructionBlock(phase.instrucaoLLM),
    '',
    renderDoneCriteriaBlock(),
  ].join('\n')
}

// --- Glossario e indice ---

function renderGlossarioV2(): string {
  return [
    '## Glossario de Instrucoes LLM',
    '',
    '- **`needsUser`**: subagent encontrou ambiguidade que humano deve resolver (ex: doc orfao ' +
      'sem destino canonico obvio). Emite mensagem no PR, nao quebra build.',
    '- **`Inputs (docs candidatos)`**: lista heuristica de paths do `discovery-manifest`. ' +
      'Subagent CONFIRMA relevancia antes de usar — pode pular irrelevantes.',
    '- **`Inputs (codigo)`**: paths reais validados via `fs.access`. Paths marcados como ' +
      '_nao encontrado_ podem ter sido movidos/renomeados; verificar antes de citar no doc final.',
    '- **`Criterio done`**: humano valida via PR review. Sem gate automatico bloqueante.',
    '',
  ].join('\n')
}

function renderPlanIndex(
  phases: ReadonlyArray<PopulatePlanPhase>,
  projectName: string,
  dateStr: string,
): string {
  const rows = phases
    .map(p => {
      const file = `fase-${String(p.fase).padStart(2, '0')}-${docToSlug(p.docCanonico)}.md`
      return `| ${String(p.fase).padStart(2, '0')} | \`${p.docCanonico}\` | [${file}](./${file}) | aberta |`
    })
    .join('\n')
  return [
    `# Plan: Populate Harness — ${projectName}`,
    '',
    `**Generated by:** /anti-vibe-coding:init (Step 91-generate-populate-plan)`,
    `**Date:** ${dateStr}`,
    `**Status:** active`,
    '',
    '---',
    '',
    renderGlossarioV2(),
    '---',
    '',
    '## Fases',
    '',
    '| Fase | Doc canonico | Arquivo | Status |',
    '|------|--------------|---------|--------|',
    rows,
    '',
    '---',
    '',
    '## Como executar',
    '',
    '`/anti-vibe-coding:execute-plan` despacha 1 subagent por fase (paralelo).',
    'Cada subagent le inputs declarados, gera conteudo do doc canonico, e escreve.',
    'Revise via diff/PR. Aprove ou rejeite por fase.',
    '',
  ].join('\n')
}

// --- Funcao publica v2 ---

export async function generatePopulatePlanV2(
  input: PopulatePlanInputV2,
): Promise<PopulatePlanOutputV2> {
  const now = input.clock !== undefined ? input.clock() : new Date()
  const manifest = input.manifest ?? []
  // `new Map()` satisfaz `StackAwareInputPaths` (ReadonlyMap) — cast seguro via atribuicao.
  const stackPaths: StackAwareInputPaths = input.stackPaths ?? new Map()

  const populatable = TEMPLATE_MANIFEST.filter(isPopulatable)
  const phases: PopulatePlanPhase[] = populatable.map((entry, idx) => {
    // `entry.dst as CanonicalDoc` — dst e string, CanonicalDoc e union restrita. O mapa
    // retorna undefined para docs nao cobertos pelo stack, o que e o comportamento correto
    // (renderer emite "nenhum path candidato"). Aceitavel conforme nota da task.
    const inputsCode = stackPaths.get(entry.dst as CanonicalDoc) ?? []
    return {
      fase: idx + 1,
      docCanonico: entry.dst,
      inputsDocs: suggestCandidateDocsFor(entry.dst, manifest),
      inputsCode,
      instrucaoLLM: llmInstructionFor(entry.dst),
      criterioDone: 'humano valida via PR review',
    }
  })

  const phaseFiles = new Map<string, string>()
  for (const phase of phases) {
    const file = `fase-${String(phase.fase).padStart(2, '0')}-${docToSlug(phase.docCanonico)}.md`
    phaseFiles.set(file, renderPhase(phase))
  }

  const dateStr = now.toISOString().slice(0, 10)
  const planIndexMarkdown = renderPlanIndex(phases, input.projectName, dateStr)

  const dateSafe = datePathSafe(now)
  const relativeFolderPath = `docs/exec-plans/active/${dateSafe}-populate-harness`

  return {
    planIndexMarkdown,
    phaseFiles,
    relativeFolderPath,
    phases,
  }
}
