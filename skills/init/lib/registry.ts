// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'

// 2026-05-17 (Luiz/dev): ordem contratual — detect-legacy (gate) -> scaffold-full-tree (Step 1) -> link-claude-agents (Step 2).
// G4 do plano02: ordem reflete flow atual do SKILL.md linha por linha.
// link DEPOIS de scaffold — AGENTS.md precisa existir para o link/copia.
export const registry: readonly Step[] = [detectLegacyStep, scaffoldFullTreeStep, linkClaudeAgentsStep]
