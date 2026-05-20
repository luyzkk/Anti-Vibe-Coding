// 2026-05-19 (Luiz/dev): Plano 03 fase-03 — renderer v2. Sai template com {{TASKS_BLOCK}},
// entra geracao programatica com 4 blocos por doc canonico (MH-02 do PRD).
// Plano 03 fase-05: v1 (generatePopulatePlan + tipos v1) removida — Step 91 usa V2 diretamente.
// G3 do README: ZERO chamada de LLM aqui — apenas renderiza estrutura para subagent consumir.

import path from 'node:path'
import { promises as fs } from 'node:fs'
import { TEMPLATE_MANIFEST, type TemplateEntry } from './template-manifest'
import type { DiscoveryManifestEntry } from './discovery-manifest-light'
import type { StackAwareInputPaths, CanonicalDoc } from './stack-aware-input-paths'
// 2026-05-19 (Luiz/dev): Plano 02 fase-03 do PRD populate-plan-andre-port (MH-2) —
// renderer passa a ler tpls de assets/templates/exec-plan/. Step 91 continua PURO
// (apenas FS read + replace). G3 do README do Plano 02: ordem das 10 secoes base do
// PLAN.md.tpl deve casar com EXEC_PLAN_SECTIONS_FULL (validado em fase-04 via parity).
import { EXEC_PLAN_SECTIONS_FULL } from '../../lib/exec-plan-sections'

// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — leitura de tpl + injecao de vars.
// G1 do README do Plano 02: TEMPLATES_ROOT em template-manifest.ts:90 ja existe e aponta
// para skills/init/assets/templates/. Sub-pasta exec-plan/ foi criada em fase-01/fase-02.
// Por isso compomos o path aqui sem duplicar a constante.
const TPL_DIR = path.join(import.meta.dir, '..', 'assets', 'templates', 'exec-plan')

async function readTpl(filename: string): Promise<string> {
  return fs.readFile(path.join(TPL_DIR, filename), 'utf-8')
}

// 2026-05-19 (Luiz/dev): mustache-style replace. Sem regex — `replaceAll` literal evita
// colisao com `{` ou `}` no value. G5 do README do Plano 02.
function applyVars(tpl: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    tpl,
  )
}

// 2026-05-19 (Luiz/dev): Plano 03 fase-04 DI-Plano03-fase04-datepathsafe —
// Ajustado de `YYYY-MM-DDT...Z` para `YYYY-MM-DD` para compatibilidade com
// /execute-plan glob (docs/exec-plans/active/YYYY-MM-DD-*/).
// Slug antigo `2026-05-19T10-00-00Z-populate-harness` nao batia o glob.
// Slug novo `2026-05-19-populate-harness` bate.
function datePathSafe(now: Date): string {
  return now.toISOString().slice(0, 10)
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

// 2026-05-19 (Luiz/dev): D5 do PRD populate-plan-andre-port — reverte D14 do PRD anterior.
// PRODUCT_SENSE.md e README.md voltam para populate (Andre tem ambos ricos no harness).
// COMPOUND_ENGINEERING.md fica de fora: meta-doc filosofico do processo, sem codigo a referenciar.
// Build quebra (parity test, Plano 01 fase-02) se alguem readicionar entry — CA-04 do PRD.
// `export` adicionado para tests/e2e/populate-plan-parity.test.ts inspecionar (Plano 01 fase-02).
export const EXCLUDED_FROM_POPULATION_V2 = new Set<string>([
  'docs/COMPOUND_ENGINEERING.md',
])
const EXCLUDED_PATTERNS_V2: ReadonlyArray<RegExp> = [/^\.github\//, /^scripts\//]

export function isPopulatable(entry: TemplateEntry): boolean {
  if (!entry.dst.endsWith('.md')) return false
  if (EXCLUDED_FROM_POPULATION_V2.has(entry.dst)) return false
  if (EXCLUDED_PATTERNS_V2.some(rx => rx.test(entry.dst))) return false
  return true
}

// --- Mapa de instrucoes LLM por doc canonico ---

// 2026-05-19 (Luiz/dev): Plano 03 fase-01 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Schema imperativo: cada instrucao LLM exige fontes especificas + secoes obrigatorias +
// frase de honestidade. Sem brecha tipo "se nao houver, mantenha template".
export interface ImperativeInstruction {
  fontes: string[]
  secoes: string[]
  honestidade: string
}

// 2026-05-19 (Luiz/dev): renderer puro. NAO emite o heading `### Instrucao LLM` — esse
// heading e adicionado por `renderLLMInstructionBlock` (G1 do Plano 03). Esta funcao
// produz apenas o corpo: 3 blocos markdown.
export function formatImperativeInstruction(instr: ImperativeInstruction): string {
  const fontes = instr.fontes.map(f => `- ${f}`).join('\n')
  const secoes = instr.secoes.map(s => `- ${s}`).join('\n')
  return [
    '**Fontes:**',
    fontes,
    '',
    '**Secoes obrigatorias do output:**',
    secoes,
    '',
    instr.honestidade,
  ].join('\n')
}

// 2026-05-19 (Luiz/dev): runtime guard. Usado em fase-03 no parity test
// (`tests/e2e/populate-plan-parity.test.ts`) para assert CA-06 — toda entry do map
// `LLM_INSTRUCTIONS` deve satisfazer este predicado.
export function isImperativeInstruction(input: unknown): input is ImperativeInstruction {
  if (typeof input !== 'object' || input === null) return false
  const candidate = input as Record<string, unknown>

  const fontes = candidate.fontes
  if (!Array.isArray(fontes) || fontes.length === 0) return false
  if (!fontes.every(f => typeof f === 'string' && f.length > 0)) return false

  const secoes = candidate.secoes
  if (!Array.isArray(secoes) || secoes.length === 0) return false
  if (!secoes.every(s => typeof s === 'string' && s.length > 0)) return false

  const honestidade = candidate.honestidade
  if (typeof honestidade !== 'string' || honestidade.length === 0) return false

  return true
}

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

// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — antes: string literal hardcoded. Agora le
// fase.md.tpl e injeta {{INPUTS_DOCS_BLOCK}}, etc via applyVars. Ordem dos blocos
// preservada (G local da fase-02). renderPhase agora e async — caller (generatePopulatePlanV2)
// faz await; assinatura externa de generatePopulatePlanV2 inalterada.
async function renderPhase(phase: PopulatePlanPhase): Promise<string> {
  const tpl = await readTpl('fase.md.tpl')
  return applyVars(tpl, {
    FASE_NUM: String(phase.fase).padStart(2, '0'),
    DOC_CANONICO: phase.docCanonico,
    INPUTS_DOCS_BLOCK: renderInputsDocsBlock(phase.inputsDocs),
    INPUTS_CODE_BLOCK: renderInputsCodeBlock(phase.inputsCode),
    INSTRUCAO_LLM_BLOCK: renderLLMInstructionBlock(phase.instrucaoLLM),
    CRITERIO_DONE_BLOCK: renderDoneCriteriaBlock(),
  })
}

// --- Indice do plano ---

// 2026-05-19 (Luiz/dev): Plano 02 fase-03 — le PLAN.md.tpl e injeta:
//   {{PROJECT_NAME}}, {{DATE}}, {{PHASES_TABLE}}.
// Glossario e secao "Como executar" do output antigo NAO existem no tpl novo (canon Andre).
// Testes em populate-plan-generator.test.ts que checavam "Glossario" mudaram para
// asserts da tabela de fases + projectName (ver Passo 7 do fase-03 doc).
async function renderPlanIndex(
  phases: ReadonlyArray<PopulatePlanPhase>,
  projectName: string,
  dateStr: string,
): Promise<string> {
  const header = '| Fase | Doc canonico | Arquivo | Status |\n|------|--------------|---------|--------|'
  const rows = phases
    .map(p => {
      const file = `fase-${String(p.fase).padStart(2, '0')}-${docToSlug(p.docCanonico)}.md`
      return `| ${String(p.fase).padStart(2, '0')} | \`${p.docCanonico}\` | [${file}](./${file}) | aberta |`
    })
    .join('\n')
  const phasesTable = `${header}\n${rows}`

  const tpl = await readTpl('PLAN.md.tpl')

  // 2026-05-19 (Luiz/dev): Plano 02 fase-03 G3 — sanity check em runtime de que as 10 secoes
  // base do tpl batem com EXEC_PLAN_SECTIONS_FULL. NAO quebra build — apenas log. Parity test
  // (fase-04) e o gate real. Esse aviso ajuda o dev a perceber drift cedo, durante /init.
  for (const sec of EXEC_PLAN_SECTIONS_FULL) {
    if (!new RegExp(`^## ${sec}\\s*$`, 'm').test(tpl)) {
      console.warn(`[populate-plan-generator] PLAN.md.tpl missing canonical section: ${sec}`)
    }
  }

  return applyVars(tpl, {
    PROJECT_NAME: projectName,
    DATE: dateStr,
    PHASES_TABLE: phasesTable,
  })
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

  // 2026-05-19 (Luiz/dev): Plano 02 fase-03 — paraleliza leituras de fase.md.tpl (>= 12 reads).
  // readTpl e idempotente; FS cache do OS deduplica. Sem race em writes (apenas reads).
  const phaseFilesEntries = await Promise.all(
    phases.map(async phase => {
      const file = `fase-${String(phase.fase).padStart(2, '0')}-${docToSlug(phase.docCanonico)}.md`
      const content = await renderPhase(phase)
      return [file, content] as const
    }),
  )
  const phaseFiles = new Map<string, string>(phaseFilesEntries)

  const dateStr = now.toISOString().slice(0, 10)
  const planIndexMarkdown = await renderPlanIndex(phases, input.projectName, dateStr)

  const dateSafe = datePathSafe(now)
  const relativeFolderPath = `docs/exec-plans/active/${dateSafe}-populate-harness`

  return {
    planIndexMarkdown,
    phaseFiles,
    relativeFolderPath,
    phases,
  }
}
