/**
 * Conforme D19 + SH-07 do PRD refactor-init-harness-populate-merge (2026-05-18):
 * subagent_id canonicos para entries no agents-log.json emitidas pelos novos steps
 * e pelo comando --rollback. Fonte unica de verdade — steps NUNCA usam string literal.
 *
 * Adicionar uma nova entrada aqui SEMPRE acompanhada de:
 *   1. Atualizar tipo `InitSubagentId` (derivado via `typeof`)
 *   2. Adicionar teste em `init-subagent-ids.test.ts`
 *   3. Citar onde o step consumidor vive (Plano X fase-Y)
 */
export const INIT_SUBAGENT_IDS = {
  secretsScan: 'init-secrets-scan',           // Plano 03 fase-02 (Step 06)
  discoverDocs: 'init-discover-existing-docs', // Plano 03 fase-04 (Step 07)
  classifyBlocks: 'init-classify-blocks',      // Plano 03 fase-06 (Step 08)
  proposeMerge: 'init-propose-merge',          // Plano 04 fase-02 (Step 09)
  applyMerge: 'init-apply-merge',              // Plano 04 fase-03 (Step 10)
  moveDocs: 'init-move-docs',                  // Plano 04 fase-05 (Step 11)
  detectDrift: 'init-drift-detect',            // Plano 05 fase-03 (Step 12) — literal CONFIRMADO 2026-05-18
  populatePlanGen: 'init-populate-plan-gen',   // Plano 02 fase-03 (Step 91)
  rollback: 'init-rollback',                   // Plano 05 fase-04 (comando --rollback)
} as const

export type InitSubagentId = (typeof INIT_SUBAGENT_IDS)[keyof typeof INIT_SUBAGENT_IDS]
