// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'

// 2026-05-17 (Luiz/dev): ordem contratual — detect-legacy (gate) -> scaffold-full-tree (Step 1).
// G4 do plano02: ordem reflete flow atual do SKILL.md linha por linha.
export const registry: readonly Step[] = [detectLegacyStep, scaffoldFullTreeStep]
