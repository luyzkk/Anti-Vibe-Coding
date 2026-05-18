// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { reuseDiscoveryStep } from './steps/00_1-reuse-discovery'
import { migrate1BackupStep } from './steps/10-migrate-1-backup'
import { migrate2PlanningStep } from './steps/11-migrate-2-planning'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'
import { detectStackAndRegisterStep } from './steps/03-detect-stack-and-register'
import { persistStackKnowledgeStep } from './steps/03_1-persist-stack-and-knowledge'
import { customizeArchitectureStep } from './steps/04-customize-architecture'
import { installGhFilesStep } from './steps/05-install-gh-files'
import { finalValidationStep } from './steps/90-final-validation'

// 2026-05-17 (Luiz/dev): ordem contratual — detect-legacy (gate) -> reuse-discovery (early-exit)
// -> scaffold-full-tree (Step 1) -> link-claude-agents (Step 2).
// G4 do plano02: ordem reflete flow atual do SKILL.md linha por linha.
// reuseDiscovery ANTES do scaffold — se cache fresh, sai com skipRemaining sem executar steps adiante.
// link DEPOIS de scaffold — AGENTS.md precisa existir para o link/copia.
// Step 3 -> Step 3.1, sequencial.
// detect-stack-and-register escreve STATE.md; persist-stack-and-knowledge le STATE.md indireto via runStackKnowledgeInit.
// Step 4: customizeArchitecture re-detecta stack e customiza ARCHITECTURE.md (PRD CA-01).
// Step 5: installGhFiles — D14 sempre roda, apos customize-architecture (PRD CA-01).
// final-validation: ULTIMA — porta Step migrate.5, valida harness apos toda mutacao.
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,        // 2026-05-17 (Luiz/dev): early-exit via skipRemaining quando cache fresh (PRD MH-04, CA-04).
  // 2026-05-17 (Luiz/dev): G4 do plano03 — migrate-0/migrate-all inseridos em fase-05 (indices 2-3).
  // migrate1BackupStep em posicao provisoria (indice 2 agora, sera 4 apos fase-05 inserir migrate-0/all).
  migrate1BackupStep,
  migrate2PlanningStep,        // 2026-05-17 (Luiz/dev): G4 do plano03 fase-03 — apos migrate1BackupStep (provisorio, reordenado em fase-05).
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep,
  installGhFilesStep,        // 2026-05-17 (Luiz/dev): D14 — sempre apos customize-architecture (PRD CA-01).
  finalValidationStep,       // 2026-05-17 (Luiz/dev): Step migrate.5 — valida harness apos migracao completa (PRD CA-09).
]
