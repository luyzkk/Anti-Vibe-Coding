// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'
import { detectStackAndRegisterStep } from './steps/03-detect-stack-and-register'
import { persistStackKnowledgeStep } from './steps/03_1-persist-stack-and-knowledge'
import { customizeArchitectureStep } from './steps/04-customize-architecture'
import { installGhFilesStep } from './steps/05-install-gh-files'

// 2026-05-17 (Luiz/dev): ordem contratual — detect-legacy (gate) -> scaffold-full-tree (Step 1) -> link-claude-agents (Step 2).
// G4 do plano02: ordem reflete flow atual do SKILL.md linha por linha.
// link DEPOIS de scaffold — AGENTS.md precisa existir para o link/copia.
// Step 3 -> Step 3.1, sequencial.
// detect-stack-and-register escreve STATE.md; persist-stack-and-knowledge le STATE.md indireto via runStackKnowledgeInit.
// Step 4: customizeArchitecture re-detecta stack e customiza ARCHITECTURE.md (PRD CA-01).
// Step 5: installGhFiles — D14 sempre roda, apos customize-architecture (PRD CA-01).
export const registry: readonly Step[] = [
  detectLegacyStep,
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep,
  installGhFilesStep, // 2026-05-17 (Luiz/dev): D14 — sempre apos customize-architecture (PRD CA-01).
]
