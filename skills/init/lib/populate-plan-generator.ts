// skills/init/lib/populate-plan-generator.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — renderer puro V3.
// Sem LLM, sem stack-awareness no renderer — recebe input pronto e emite markdown.
// CA-07 do PRD init-refactor-v7: as 10 secoes H2 nesta ORDEM EXATA.
// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — pipeline orquestrador generatePopulatePlans.
// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — output hierarquico (1 pasta, 16 fases).
// Adapter DocInstruction -> FasePlanInput v1. renderAndrePlan removido (substituido por renderFasePlan).

import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { DetectedStack } from './detect-stack'
import {
  POPULATE_INSTRUCTIONS_BY_DOC,
  buildWavesForDoc,
  docToSlug,
  type DocInstruction,
} from './populate-instructions-table'
import { LegacyManifestSchema, type LegacyManifest } from '../../_shared/legacy-manifest-schema'
import { renderFasePlan, type FasePlanInput, type Wave } from './render-fase-plan'
import { renderPopulateHarnessPRD } from './populate-harness-prd-template'
import { renderPopulateHarnessContext } from './populate-harness-context-template'
import { renderPopulateHarnessPlanOverview } from './populate-harness-plan-overview'

/** Extrai linhas H2 do markdown. Util para verificar secoes (CA-07). */
export function extractH2Sections(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.trim())
}

// =============================================================================
// Adapter: DocInstruction -> FasePlanInput v1 (Plano 02 fase-01)
// =============================================================================

// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — adapter puro. Converte DocInstruction
// (campos da tabela) em FasePlanInput v1 (schema do renderer renderFasePlan).
// Wave 1 vem de buildWavesForDoc (stack-aware). Wave 2 deriva de sectionsToWrite.
function toFasePlanInput(
  docPath: string,
  instr: DocInstruction,
  stackPrimary: NonNullable<DetectedStack['primary']>,
): FasePlanInput {
  const wavesFromTable = buildWavesForDoc(docPath, stackPrimary)
  const wave1 = wavesFromTable[0]! // garantido por buildWavesForDoc

  const wave2Items = instr.sectionsToWrite.map(s => `Write the H2 section: ${s}`)
  const waves: ReadonlyArray<Wave> = [
    wave1,
    { name: 'Wave 2 — Write sections', items: wave2Items },
  ]

  const base = {
    docPath,
    schemaVersion: 1 as const,
    goal: instr.goal,
    scope: { in: instr.scopeIn, out: instr.scopeOut },
    assumptions: instr.assumptions,
    risks: instr.risks,
    waves,
    reviewChecklist: instr.reviewChecklist,
    compoundOpportunity: instr.compoundOpportunity,
    exitCriteria: instr.exitCriteria,
    guidanceFile: instr.guidanceFile,
    detectionSignals: instr.detectionSignals,
    mustCover: instr.mustCover,
    linkTargets: instr.linkTargets,
    validationCommand: instr.validationCommand,
    dependsOn: instr.dependsOn,
  }
  // exactOptionalPropertyTypes: omit stackVariants entirely when undefined
  if (instr.stackVariants !== undefined) {
    return { ...base, stackVariants: instr.stackVariants }
  }
  return base
}

// =============================================================================
// Pipeline: generatePopulatePlans (Plano 02 fase-01 — hierarquia)
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

export type GeneratedFasePlan = {
  readonly dst: string         // ex: 'docs/SECURITY.md'
  readonly slug: string        // ex: 'docs-security-md'
  readonly faseNumber: number  // 1..16
  readonly relPath: string     // ex: 'docs/exec-plans/active/2026-05-21-populate-harness/fase-01-docs-security-md.md'
  readonly content: string
}

export type GenerateResultV2 = {
  readonly folderPath: string                          // pasta unica criada (relativa ao cwd, forward slashes)
  readonly prdPath: string
  readonly contextPath: string
  readonly planPath: string
  readonly fasePlans: ReadonlyArray<GeneratedFasePlan>
  readonly stackPrimary: NonNullable<DetectedStack['primary']>
  readonly legacyArtifactsFound: number
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

// 2026-05-21 (Luiz/dev): Plano 02 fase-01 — orquestrador hierarquico.
// Emite 1 pasta {date}-populate-harness/ com PRD.md, CONTEXT.md, PLAN.md e 16 fase-NN-*.md.
// Path do campo retornado usa path.posix para portabilidade (forward slashes no Windows).
export async function generatePopulatePlans(opts: GenerateOpts): Promise<GenerateResultV2> {
  const now = (opts.clock ?? (() => new Date()))()
  const dateSlug = now.toISOString().slice(0, 10)

  const manifest = await readManifestGraceful(opts.cwd)
  const legacyArtifactsFound = manifest?.legacy.filter(e => e.found).length ?? 0

  const stackPrimary = opts.stack.primary
  if (stackPrimary === null) {
    // Step 7 ja aborta antes — esta guarda eh defensiva
    throw new Error('stack.primary is null; Step 7 should have aborted earlier')
  }

  const folderName = `${dateSlug}-populate-harness`
  const folderRel = path.posix.join('docs', 'exec-plans', 'active', folderName)
  const folderAbs = path.join(opts.cwd, 'docs', 'exec-plans', 'active', folderName)

  await fs.mkdir(folderAbs, { recursive: true })

  // 1. PRD + CONTEXT (fixos por sessao)
  const prdContent = renderPopulateHarnessPRD({ dateSlug, stackPrimary, legacyArtifactsFound })
  const contextContent = renderPopulateHarnessContext({ dateSlug, stackPrimary, totalDocs: POPULATE_INSTRUCTIONS_BY_DOC.size })

  await fs.writeFile(path.join(folderAbs, 'PRD.md'), prdContent, 'utf-8')
  await fs.writeFile(path.join(folderAbs, 'CONTEXT.md'), contextContent, 'utf-8')

  // 2. 16 fases (1 por doc)
  const fasePlans: GeneratedFasePlan[] = []
  let i = 0
  for (const [dst, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
    i++
    const slug = docToSlug(dst)
    const faseNumber = i
    const faseFile = `fase-${String(faseNumber).padStart(2, '0')}-${slug}.md`
    const input = toFasePlanInput(dst, instr, stackPrimary)
    const content = renderFasePlan(input)
    const relPath = path.posix.join(folderRel, faseFile)
    const absPath = path.join(folderAbs, faseFile)
    // D10 NFR Idempotencia: SEMPRE sobrescreve (G7 do README).
    await fs.writeFile(absPath, content, 'utf-8')
    fasePlans.push({ dst, slug, faseNumber, relPath, content })
  }

  // 3. PLAN.md (overview com lista das 16 fases, gerado apos as fases existirem)
  const planContent = renderPopulateHarnessPlanOverview(fasePlans, { dateSlug, stackPrimary })
  const planAbs = path.join(folderAbs, 'PLAN.md')
  await fs.writeFile(planAbs, planContent, 'utf-8')

  return {
    folderPath: folderRel,
    prdPath: path.posix.join(folderRel, 'PRD.md'),
    contextPath: path.posix.join(folderRel, 'CONTEXT.md'),
    planPath: path.posix.join(folderRel, 'PLAN.md'),
    fasePlans,
    stackPrimary,
    legacyArtifactsFound,
    docsSkipped: [],
  }
}
