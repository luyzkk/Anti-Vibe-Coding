// skills/init/lib/registry.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — registry novo v7.
// Ordem D12 revisada (DV-1 + DV-3): 10 steps. Steps 1-2 reais, 8 stubs (Plano 02-05 implementam).
// G1 do README: este arquivo eh o ponto que isola os 15+ steps obsoletos antes do delete da fase-05.
// Apos esta fase, nenhum dos steps a deletar eh importado por codigo de producao.
import type { Step } from './steps/types'
import { reentryGateStep } from './steps/01-reentry-gate'
import { detectLegacyAndStackStep } from './steps/02-detect-legacy-and-stack'
import { secretsScanStep } from './steps/03-secrets-scan'
import { migratePlanningAndManifestStep } from './steps/04-migrate-planning-and-manifest'
import { scaffoldAndLinkStep } from './steps/05-scaffold-and-link'
import { installGhFilesStep } from './steps/06-install-gh-files'
import { generatePopulatePlansStep } from './steps/07-generate-populate-plans'
import { deliveryLoopStep } from './steps/08-delivery-loop'
import { copyKnowledgeStep } from './steps/09-copy-knowledge'
import { finalValidationStep } from './steps/10-final-validation'

export const registry: readonly Step[] = [
  reentryGateStep,                // Step 1 — REAL (Plano 01 fase-03, DV-3)
  detectLegacyAndStackStep,       // Step 2 — REAL (Plano 01 fase-02)
  secretsScanStep,                // Step 3 — STUB (Plano 02, DV-1)
  migratePlanningAndManifestStep, // Step 4 — STUB (Plano 02)
  scaffoldAndLinkStep,            // Step 5 — STUB (Plano 03)
  installGhFilesStep,             // Step 6 — STUB (Plano 03)
  generatePopulatePlansStep,      // Step 7 — STUB (Plano 04, CORE)
  deliveryLoopStep,               // Step 8 — STUB (Plano 05)
  copyKnowledgeStep,              // Step 9 — STUB (Plano 05)
  finalValidationStep,            // Step 10 — STUB (Plano 05)
]
