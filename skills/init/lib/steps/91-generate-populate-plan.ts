// 2026-05-19 (Luiz/dev): Plano 03 fase-05 — Step 91 orquestra discovery + stack + render + write.
// MH-01 + CA-01 + CA-02 do PRD. G2 (LLM-hallucination) coberto via stackAwareInputPaths.
// G3 (zero LLM): este step PURO — apenas renderiza estrutura, LLM chamada acontece em /execute-plan.
// SH-07 do PRD / audit log: emite phaseCount + stackPrimary + discoveryEntries.

import { detectProjectName } from '../detect-project-name'
import { detectStack } from '../detect-stack'
import { discoveryManifestLight } from '../discovery-manifest-light'
import { stackAwareInputPaths } from '../stack-aware-input-paths'
import { generatePopulatePlanV2 } from '../populate-plan-generator'
import { writePopulatePlanFolder } from '../populate-plan-writer'
import type { Step } from './types'
import { isDryRun } from '../dry-run-mode'
import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'
import type { AuditLogWriter } from '../audit-log'

/** SH-07 do PRD — subagent_id canonico para Plano 06 fase-01 audit log padronizado. */
export const SUBAGENT_ID = 'init-populate-plan-gen' as const

/** Step 91: gera pasta `{date}-populate-harness/` em `docs/exec-plans/active/`. */
export const generatePopulatePlanStep: Step = {
  id: '91-generate-populate-plan',
  async run(ctx) {
    const startMs = performance.now()
    const projectName = detectProjectName(ctx.cwd)

    // Step 1: detect stack (multi-stack contract D22)
    const stack = await detectStack(ctx.cwd)

    // Step 2: discovery leve — apenas paths + 100 primeiras linhas, sem regex de classificacao
    const discovery = await discoveryManifestLight(ctx.cwd)

    // Step 3: paths candidatos por stack, validados via fs.access (G2 — mitiga LLM-hallucination)
    const stackPaths = await stackAwareInputPaths(ctx.cwd, stack.primary)

    // Step 4: render programatico — 1 fase por doc canonico com 4 blocos
    const plan = await generatePopulatePlanV2({
      cwd: ctx.cwd,
      projectName,
      manifest: discovery.entries,
      stackPaths,
    })

    // Assertion defensiva CA-01: >= 10 fases. Se falhar, indica TEMPLATE_MANIFEST incompleto
    // (ex: Plano 02 fase-01 com CODE_STYLE.md nao mergeada ainda).
    if (plan.phases.length < 10) {
      return {
        mutated: false,
        summary:
          `init-91: PLAN gerado com apenas ${plan.phases.length} fases (esperado >= 10). ` +
          `Verificar TEMPLATE_MANIFEST tem >= 10 entries populaveis. CA-01 falhou.`,
      }
    }

    // Dry-run: nao escreve, apenas preview
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary:
          `dry-run: would generate populate plan at ${plan.relativeFolderPath} ` +
          `with ${plan.phases.length} phases`,
      }
    }

    // Step 5: materializa pasta em disco
    const writeResult = await writePopulatePlanFolder(plan, ctx.cwd)

    // Audit log: registra evento com contagens (SH-07 + MH-01)
    const writer = ctx.flags['__auditLog'] as AuditLogWriter | undefined
    await writer?.append({
      subagent_id: INIT_SUBAGENT_IDS.populatePlanGen,
      input_paths: [ctx.cwd],
      output_struct: {
        planFolder: plan.relativeFolderPath,
        phaseCount: plan.phases.length,
        filesWritten: writeResult.writtenFiles.length,
        warnings: writeResult.warnings.length,
        stackPrimary: stack.primary ?? 'none',
        discoveryEntries: discovery.entries.length,
      },
      duration_ms: Math.round(performance.now() - startMs),
      retry_count: 0,
    })

    const summary = [
      `Plano de populacao gerado: ${plan.relativeFolderPath}`,
      `Fases emitidas: ${plan.phases.length} (1 por doc canonico).`,
      `Stack detectado: ${stack.primary ?? 'nenhum'} (${stack.signalSource}).`,
      `Discovery: ${discovery.entries.length} docs existentes amostrados.`,
      'Para popular o harness com analise do repo: /anti-vibe-coding:execute-plan ' +
        plan.relativeFolderPath,
    ].join('\n')

    return { mutated: true, summary }
  },
}
