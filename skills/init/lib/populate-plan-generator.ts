// skills/init/lib/populate-plan-generator.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — renderer puro V3.
// Sem LLM, sem stack-awareness no renderer — recebe input pronto e emite markdown.
// CA-07 do PRD init-refactor-v7: as 10 secoes H2 nesta ORDEM EXATA.
// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — pipeline orquestrador generatePopulatePlans.
// Itera 16 docs, monta AndrePlanInput, renderiza, escreve em disco. NFR Performance < 2s.

import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { DetectedStack, StackId } from './detect-stack'
import {
  POPULATE_INSTRUCTIONS_BY_DOC,
  buildWavesForDoc,
  docToSlug,
} from './populate-instructions-table'
import { LegacyManifestSchema, type LegacyManifest } from '../../_shared/legacy-manifest-schema'

// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — tipo estruturado mapeando 1:1 nas 10 secoes
// H2 do CA-07 do PRD init-refactor-v7. Cada campo vira uma secao no markdown gerado.
// Decisao DI-Plano04-fase01-input-shape: sem campos free-form para evitar drift.

export type Wave = {
  readonly name: string
  readonly items: ReadonlyArray<string>
}

export type RiskEntry = {
  readonly risk: string
  readonly mitigation: string
}

export type AndrePlanInput = {
  /** Path canonico do doc-alvo (ex: 'docs/SECURITY.md'). Usado no title H1. */
  readonly docPath: string
  /** Goal: 1-3 linhas descrevendo o que o doc deve conter ao final. */
  readonly goal: string
  /** Scope in (secoes a criar) / out (o que NAO fazer). */
  readonly scope: { readonly in: ReadonlyArray<string>; readonly out: ReadonlyArray<string> }
  /** Pressupostos: o que o plano assume existir. */
  readonly assumptions: ReadonlyArray<string>
  /** Riscos com mitigacao. */
  readonly risks: ReadonlyArray<RiskEntry>
  /** Execution Steps: minimo 2 Waves (CA-07 do PRD). */
  readonly waves: ReadonlyArray<Wave>
  /** Review Checklist: itens binarios verificaveis. */
  readonly reviewChecklist: ReadonlyArray<string>
  /** Compound Opportunity: o que merece virar compound note se aprender algo. */
  readonly compoundOpportunity: string
  /** Exit Criteria: harness-validate passa, zero placeholders, etc. */
  readonly exitCriteria: ReadonlyArray<string>
}

const SECTION_TITLES = [
  '## Goal',
  '## Scope',
  '## Assumptions',
  '## Risks',
  '## Execution Steps',
  '## Review Checklist',
  '## Validation Log',
  '## Compound Opportunity',
  '## Lessons Captured',
  '## Exit Criteria',
] as const

export function renderAndrePlan(input: AndrePlanInput): string {
  const lines: string[] = []

  lines.push(`# Populate: ${input.docPath}`)
  lines.push('')

  // ## Goal
  lines.push(SECTION_TITLES[0])
  lines.push('')
  lines.push(input.goal)
  lines.push('')

  // ## Scope
  lines.push(SECTION_TITLES[1])
  lines.push('')
  lines.push('**In:**')
  for (const s of input.scope.in) lines.push(`- ${s}`)
  lines.push('')
  lines.push('**Out:**')
  for (const s of input.scope.out) lines.push(`- ${s}`)
  lines.push('')

  // ## Assumptions
  lines.push(SECTION_TITLES[2])
  lines.push('')
  for (const a of input.assumptions) lines.push(`- ${a}`)
  lines.push('')

  // ## Risks
  lines.push(SECTION_TITLES[3])
  lines.push('')
  lines.push('| Risco | Mitigacao |')
  lines.push('|-------|-----------|')
  for (const r of input.risks) lines.push(`| ${r.risk} | ${r.mitigation} |`)
  lines.push('')

  // ## Execution Steps (Waves)
  lines.push(SECTION_TITLES[4])
  lines.push('')
  for (const w of input.waves) {
    lines.push(`### ${w.name}`)
    lines.push('')
    for (const item of w.items) lines.push(`- ${item}`)
    lines.push('')
  }

  // ## Review Checklist
  lines.push(SECTION_TITLES[5])
  lines.push('')
  for (const c of input.reviewChecklist) lines.push(`- [ ] ${c}`)
  lines.push('')

  // ## Validation Log
  lines.push(SECTION_TITLES[6])
  lines.push('')
  lines.push('<!-- preencher durante execucao: comando + resultado -->')
  lines.push('')

  // ## Compound Opportunity
  lines.push(SECTION_TITLES[7])
  lines.push('')
  lines.push(input.compoundOpportunity)
  lines.push('')

  // ## Lessons Captured
  lines.push(SECTION_TITLES[8])
  lines.push('')
  lines.push('<!-- preencher ao /iterate: links para docs/compound/ -->')
  lines.push('')

  // ## Exit Criteria
  lines.push(SECTION_TITLES[9])
  lines.push('')
  for (const e of input.exitCriteria) lines.push(`- [ ] ${e}`)
  lines.push('')

  return lines.join('\n')
}

/** Extrai linhas H2 do markdown. Util para verificar secoes (CA-07). */
export function extractH2Sections(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.trim())
}

// =============================================================================
// Pipeline: generatePopulatePlans (Plano 04 fase-03)
// =============================================================================

// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — tipos publicos do pipeline orquestrador.
// G6 do README: date capturada UMA VEZ no inicio do run via opts.clock para evitar
// virada de meia-noite. G7: plans SEMPRE sobrescrevem (D10 NFR Idempotencia).

export type GenerateOpts = {
  /** Injetavel pra testes determinism. Default: () => new Date(). */
  readonly clock?: () => Date
  /** Stack detectada. Vem de ctx.stack no Step 7. */
  readonly stack: DetectedStack
  /** cwd do projeto-alvo. */
  readonly cwd: string
}

export type GeneratedPlan = {
  /** Path canonico do doc-alvo (ex: 'docs/SECURITY.md'). */
  readonly dst: string
  /** Slug do doc (ex: 'docs-security-md'). */
  readonly slug: string
  /** Path relativo do PLAN.md gerado — forward slashes (portavel). */
  readonly path: string
  /** Conteudo markdown completo. */
  readonly content: string
}

export type GenerateResult = {
  readonly plans: ReadonlyArray<GeneratedPlan>
  readonly stackPrimary: StackId | null
  readonly legacyArtifactsFound: number
  /** Docs que existem em D18 mas foram excluidos desta geracao (reservado para uso futuro). */
  readonly docsSkipped: ReadonlyArray<string>
}

// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — leitura graceful do manifest (G10 do README).
// ENOENT retorna null silencioso (greenfield). JSON malformado ou Zod invalido: log warning + null.
// NAO aborta — stack=null aborta hard no Step 7 (DR-2), manifest ausente nao.
async function readManifestGraceful(cwd: string): Promise<LegacyManifest | null> {
  const manifestPath = path.join(cwd, '.claude', 'legacy-manifest.json')
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    return LegacyManifestSchema.parse(parsed)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    console.warn(`[generate-populate-plans] manifest malformed at ${manifestPath} — proceeding without legacy context`)
    return null
  }
}

// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — orquestrador principal.
// Itera os 16 docs do POPULATE_INSTRUCTIONS_BY_DOC, monta AndrePlanInput com Waves
// stack-aware (Wave 1 da tabela + Wave 2 a partir de sectionsToWrite), renderiza e grava.
// Path do campo retornado usa path.posix.join para portabilidade (forward slashes no Windows).
export async function generatePopulatePlans(opts: GenerateOpts): Promise<GenerateResult> {
  const now = (opts.clock ?? (() => new Date()))()
  const dateSlug = now.toISOString().slice(0, 10)

  const manifest = await readManifestGraceful(opts.cwd)
  const legacyArtifactsFound = manifest?.legacy.filter(e => e.found).length ?? 0

  const plans: GeneratedPlan[] = []

  for (const [dst, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
    const slug = docToSlug(dst)
    const waves = buildWavesForDoc(dst, opts.stack.primary)

    // Wave 2: items derivados de sectionsToWrite da instrucao (substitui Wave 2 generica de fase-02)
    const wave2Items = instr.sectionsToWrite.map(s => `Write the H2 section: ${s}`)
    const wavesFull: ReadonlyArray<Wave> = [
      waves[0]!, // Wave 1 (Discovery, stack-aware) — garantida por buildWavesForDoc
      { name: 'Wave 2 — Write sections', items: wave2Items },
    ]

    const input: AndrePlanInput = {
      docPath: dst,
      goal: instr.goal,
      scope: { in: instr.scopeIn, out: instr.scopeOut },
      assumptions: instr.assumptions,
      risks: instr.risks,
      waves: wavesFull,
      reviewChecklist: instr.reviewChecklist,
      compoundOpportunity: instr.compoundOpportunity,
      exitCriteria: instr.exitCriteria,
    }

    const content = renderAndrePlan(input)
    const relPath = path.posix.join(
      'docs',
      'exec-plans',
      'active',
      `${dateSlug}-populate-${slug}`,
      'PLAN.md',
    )

    const absPath = path.join(opts.cwd, ...relPath.split('/'))
    await fs.mkdir(path.dirname(absPath), { recursive: true })
    // D10 NFR Idempotencia: SEMPRE sobrescreve plans gerados (G7 do README).
    await fs.writeFile(absPath, content, 'utf-8')

    plans.push({ dst, slug, path: relPath, content })
  }

  return {
    plans,
    stackPrimary: opts.stack.primary,
    legacyArtifactsFound,
    docsSkipped: [],
  }
}
