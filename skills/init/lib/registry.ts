// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { reuseDiscoveryStep } from './steps/00_1-reuse-discovery'
import { secretsScanStep } from './steps/06-secrets-scan'
import { classifyBlocksHybridStep } from './steps/08-classify-blocks-hybrid'
import { proposeMergeBatchStep } from './steps/09-propose-merge-batch'
import { applyMergeDestructiveStep } from './steps/10-apply-merge-destructive'
import { moveDocsWithStubStep } from './steps/11-move-docs-with-stub'
import { detectDriftIncrementalStep } from './steps/12-detect-drift-incremental'
import { migrate0ParseDryRunStep } from './steps/09-migrate-0-parse-dry-run'
import { migrateAllOrchestrateStep } from './steps/09_1-migrate-all-orchestrate'
import { migrate1BackupStep } from './steps/10-migrate-1-backup'
import { migrate2PlanningStep } from './steps/11-migrate-2-planning'
import { migrate3LessonsStep } from './steps/12-migrate-3-lessons'
import { migrate4DecisionsStep } from './steps/13-migrate-4-decisions'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'
import { detectStackAndRegisterStep } from './steps/03-detect-stack-and-register'
import { persistStackKnowledgeStep } from './steps/03_1-persist-stack-and-knowledge'
import { customizeArchitectureStep } from './steps/04-customize-architecture'
import { installGhFilesStep } from './steps/05-install-gh-files'
import { deliveryLoopStep } from './steps/14-delivery-loop'
import { capabilitiesDiscoveryStep } from './steps/15-capabilities-discovery'
import { finalValidationStep } from './steps/90-final-validation'
import { generatePopulatePlanStep } from './steps/91-generate-populate-plan'

// 2026-05-17 (Luiz/dev): ordem contratual — detect-legacy (gate) -> reuse-discovery (early-exit)
// -> migrate-0 (parse --dry-run flag) -> migrate-all (dry-run orchestrate, skipRemaining em dry-run)
// -> migrate.1/2/3/4 (real mode) -> scaffold-full-tree (Step 1) -> link-claude-agents (Step 2).
// G4 do plano02+03: ordem reflete flow atual do SKILL.md linha por linha.
// reuseDiscovery ANTES do scaffold — se cache fresh, sai com skipRemaining sem executar steps adiante.
// migrate-all: em --dry-run retorna skipRemaining=true (mapeia process.exit(0) SKILL.md linha 74, DI-5-1).
//   Em real mode: NO-OP — migrate.1/2/3/4 individuais fazem o trabalho.
// link DEPOIS de scaffold — AGENTS.md precisa existir para o link/copia.
// Step 3 -> Step 3.1, sequencial.
// detect-stack-and-register escreve STATE.md; persist-stack-and-knowledge le STATE.md indireto via runStackKnowledgeInit.
// Step 4: customizeArchitecture re-detecta stack e customiza ARCHITECTURE.md (PRD CA-01).
// Step 5: installGhFiles — D14 sempre roda, apos customize-architecture (PRD CA-01).
// 2026-05-19 (Luiz/dev): MH-01 do PRD novo — Step 91 (generate-populate-plan) ANTES de
// Step 90 (final-validation). PLAN.md sai mesmo se Step 90 emitir warning (Bug C resolvido).
// Step 90 continua sendo ultima execucao (diagnostico nao-bloqueante).
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,           // 2026-05-17 (Luiz/dev): early-exit via skipRemaining quando cache fresh (PRD MH-04, CA-04).
  secretsScanStep,              // 2026-05-18 (Luiz/dev): Plano 03 fase-02 — varre secrets ANTES de qualquer move (D16, SH-01, CA-04).
  // 2026-05-19 (Luiz/dev): Plano 01 fase-02 — Step 07 (discover-existing-docs) removido.
  // MH-04 PRD novo: discovery semantico vira responsabilidade do Step 91 LLM-driven (Plano 03 fase-01).
  classifyBlocksHybridStep,     // 2026-05-18 (Luiz/dev): Plano 03 fase-06 — classifica heuristica + flagga pendingLlm para Plano 04 fase-02 (D8, SH-03, SH-04).
  proposeMergeBatchStep,        // 2026-05-18 (Luiz/dev): Plano 04 fase-02 — Step 09 agrega JSONs de discovery e emite needsUser com diff (PRD MH-04, D4, G2, G8, G9, G12, G13).
  moveDocsWithStubStep,         // 2026-05-18 (Luiz/dev): Plano 04 fase-05 — Step 11 itera MoveAction[], chama moveDocWithStub, skipa READMEs e secrets (G3, SH-01, D16).
  detectDriftIncrementalStep,   // 2026-05-18 (Luiz/dev): Plano 05 fase-03 — Step 12 drift detection (already-initiated only, D7, SH-05, CA-05).
  migrate0ParseDryRunStep,      // 2026-05-17 (Luiz/dev): plano03 fase-05 — parse --dry-run flag (SKILL.md linha 50, G1).
  migrateAllOrchestrateStep,    // 2026-05-17 (Luiz/dev): plano03 fase-05 — DI-5-1: skipRemaining em dry-run; NO-OP em real mode (PRD CA-03, CA-10).
  migrate1BackupStep,           // 2026-05-17 (Luiz/dev): G4 do plano03 fase-02 — apos migrate-all (agora indice 4).
  migrate2PlanningStep,         // 2026-05-17 (Luiz/dev): G4 do plano03 fase-03 — apos migrate1BackupStep.
  migrate3LessonsStep,          // 2026-05-17 (Luiz/dev): G4 do plano03 fase-04 — best-effort, sem AbortError.
  migrate4DecisionsStep,        // 2026-05-17 (Luiz/dev): G4 do plano03 fase-04 — best-effort, sem AbortError.
  scaffoldFullTreeStep,
  // 2026-05-18 (Luiz/dev): D23 — apply-merge-destructive BEFORE link-claude-agents. CLAUDE.md
  // already transformed to mirror <=40 lines when Step 02 creates symlink/hardlink/copy.
  applyMergeDestructiveStep,   // 2026-05-18 (Luiz/dev): Plano 04 fase-06 (D23) — Step 10 backup + transforma CLAUDE.md + gera docs/DESIGN.md ANTES do link-claude-agents (G1, G8, G9, DI-1).
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep,
  installGhFilesStep,           // 2026-05-17 (Luiz/dev): D14 — sempre apos customize-architecture (PRD CA-01).
  deliveryLoopStep,             // 2026-05-17 (Luiz/dev): plano03 fase-06 — Step 6 interativo via needsUser (PRD D3, CH-01, CA-05).
  capabilitiesDiscoveryStep,    // 2026-05-17 (Luiz/dev): plano03 fase-06 — Step 7 soft-fail (PRD CA-06, G7).
  // 2026-05-19 (Luiz/dev): MH-01 / CA-07 do PRD init-llm-driven-harness-population —
  // Step 91 ANTES do Step 90. Bug C: Step 90 abortando deixava Step 91 sem rodar.
  // PLAN.md e output principal da init; validation e diagnostico nao-bloqueante.
  generatePopulatePlanStep,     // 2026-05-19 (Luiz/dev): '91-generate-populate-plan' — emite PLAN.md antes do validator.
  finalValidationStep,          // 2026-05-19 (Luiz/dev): Step 90 — agora ULTIMA posicao, modo warning sera Plano 04 fase-04.
]
