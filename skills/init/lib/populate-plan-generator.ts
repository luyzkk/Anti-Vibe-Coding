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
  // 2026-05-19 (Luiz/dev): Plano 03 fase-02 — tipo mudou de string para ImperativeInstruction
  // (MH-3 / CA-06). renderLLMInstructionBlock chama formatImperativeInstruction internamente.
  readonly instrucaoLLM: ImperativeInstruction
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
// 2026-05-19 (Luiz/dev): Plano 03 fase-02 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Cada entry exige `ImperativeInstruction` — TS error guia a refatoracao das 12 entries.
export const LLM_INSTRUCTIONS: Record<string, ImperativeInstruction> = {
  // 2026-05-19 (Luiz/dev): exemplo canonico de PRD MH-3. As `secoes` espelham o ARCHITECTURE.md
  // real deste plugin (secao "Convencao: docs/ vs Runtime Assets" foi o gabarito).
  'ARCHITECTURE.md': {
    fontes: [
      'docs/ARCHITECTURE.md candidato (se existir)',
      'package.json (entry points, scripts)',
      'tsconfig.json (paths, includes)',
      'src/** ou skills/** (modulos principais)',
      'README.md (visao macro do projeto)',
    ],
    secoes: [
      'Convencao docs/ vs Runtime Assets',
      'Modulos compartilhados',
      'Integracoes externas',
      'Decisoes obrigatorias (ADRs ativas)',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/FRONTEND.md': {
    fontes: [
      'app/**',
      'src/components/**',
      'tailwind.config.{ts,js}',
      'globals.css',
      'src/lib/design-tokens.ts (se existir)',
      'src/styles/**',
    ],
    secoes: [
      'Rotas e layouts',
      'Componentes compartilhados',
      'Sistema de design (tokens)',
      'Convencoes de estilo (Tailwind / CSS-in-JS)',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/SECURITY.md': {
    fontes: [
      'middleware.ts',
      'src/lib/auth/**',
      'supabase/migrations/**',
      '.env.example',
      'next.config.{ts,js} (CORS / headers)',
      'policies de RLS',
    ],
    secoes: [
      'Autenticacao (provider, fluxo)',
      'Autorizacao (RBAC / RLS)',
      'Secrets',
      'CORS / headers',
      'Auditoria',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/RELIABILITY.md': {
    fontes: [
      'error-boundaries/**',
      'src/lib/observability/**',
      '*.config.{ts,js} de logger (Pino/Winston)',
      'vercel.json / wrangler.toml (jobs/crons)',
      'src/app/api/** para retries',
    ],
    secoes: [
      'Error boundaries (UI + API)',
      'Observabilidade (logs / traces / metricas)',
      'Retries e timeouts',
      'Backups e recovery',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/DESIGN.md': {
    fontes: [
      'tailwind.config.{ts,js}',
      'globals.css',
      'components/ui/**',
      'src/styles/tokens.css',
      'figma-export.json (se existir)',
    ],
    secoes: [
      'Tokens (cores, tipografia, spacing)',
      'Componentes base',
      'Padroes de composicao',
      'Regras visuais (NAO regras de codigo — codigo vai em CODE_STYLE.md)',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/CODE_STYLE.md': {
    fontes: [
      '.eslintrc* / eslint.config.{ts,js}',
      '.prettierrc*',
      'tsconfig.json',
      'snippets/akita-*.md (se existirem)',
      'src/** (padroes implicitos)',
    ],
    secoes: [
      'Convencoes de nomes',
      'Organizacao de arquivos',
      'Padroes de codigo (do ESLint + implicitos)',
      'Anti-patterns proibidos',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/QUALITY_SCORE.md': {
    fontes: [
      'docs/QUALITY_SCORE.md candidato (se existir)',
      'historico de PR review em .git/',
      'docs/exec-plans/completed/** (lessons)',
      'docs/compound/**',
    ],
    secoes: [
      'Strengths',
      'Gaps',
      'Priorities',
      'TODOs com contexto rastreavel',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/PLANS.md': {
    fontes: [
      'docs/exec-plans/active/**',
      'docs/exec-plans/completed/**',
      'docs/exec-plans/*.md (indices)',
      'package.json (scripts harness/compound)',
    ],
    secoes: [
      'Planos ativos (status + ETA)',
      'Planos completos recentes',
      'Bloqueios atuais',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/STATE.md': {
    fontes: [
      'package.json (versao do plugin)',
      'docs/exec-plans/active/** (plano em execucao)',
      'tests/fixtures/v6-state-fixture/docs/STATE.md (template)',
      'output do Step 03 (detect-stack-and-register)',
    ],
    secoes: [
      'Versao do plugin',
      'Stack detectado',
      'Ultima init',
      'Planos ativos relevantes',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'docs/design-docs/core-beliefs.md': {
    fontes: [
      'docs/design-docs/core-beliefs.md candidato',
      'progress.txt (gotchas elevaveis)',
      'docs/compound/**',
      'CLAUDE.md global do dev',
    ],
    secoes: [
      'Arquitetura padrao',
      'Seguranca por default',
      'Qualidade nao-negociavel',
      'Anti-patterns proibidos',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'AGENTS.md': {
    fontes: [
      'lista canonica de docs em docs/',
      'CLAUDE.md candidato',
      '.claude/agents/** (se houver subagentes registrados)',
      'package.json (skills declaradas no manifest)',
    ],
    secoes: [
      'Index de docs canonicos (com 1 linha cada)',
      'Quando ler cada um',
      'Subagentes / skills declarados',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
  'CLAUDE.md': {
    fontes: [
      'AGENTS.md recem-gerado (mirror)',
      'mesma lista canonica de docs',
    ],
    secoes: [
      'Mirror canonico de AGENTS.md (mesmo conteudo, mesmo formato)',
      'Em alteracoes futuras: atualizar AMBOS (AGENTS.md + CLAUDE.md)',
    ],
    honestidade:
      'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
      'Honestidade > marketing.',
  },
}

// 2026-05-19 (Luiz/dev): Plano 03 fase-03 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Default conservador: aplicado quando o doc canonico NAO tem entry no map. `fontes` minimos
// universais; `secoes` no formato Andre canonico (Goal / Inputs / Output); honestidade
// padrao. NAO ha brecha tipo "se nao houver evidencia, marque needsUser e siga" — `needsUser`
// e sinal de bloqueio + `TODO(<contexto>):` obrigatorio na saida.
export const DEFAULT_INSTRUCTION: ImperativeInstruction = {
  fontes: [
    'package.json',
    'README.md (se existir)',
    'docs/** (qualquer doc candidato relacionado ao destino)',
    'src/** ou skills/** (codigo principal)',
  ],
  secoes: [
    'Goal',
    'Inputs',
    'Output',
  ],
  honestidade:
    'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
    'Sem evidencia suficiente: flag `needsUser` + nao gerar conteudo especulativo. ' +
    'Honestidade > marketing.',
}

function llmInstructionFor(dst: string): ImperativeInstruction {
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

// 2026-05-19 (Luiz/dev): chama `formatImperativeInstruction` (fase-01) para renderizar o
// corpo. O heading `### Instrucao LLM` continua aqui — G1 do Plano 03.
function renderLLMInstructionBlock(instruction: ImperativeInstruction): string {
  return `### Instrucao LLM\n\n${formatImperativeInstruction(instruction)}\n`
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
