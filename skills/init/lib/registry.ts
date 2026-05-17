// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'

// 2026-05-17 (Luiz/dev): ordem contratual — detect-legacy SEMPRE primeiro (PRD: gate inicial).
export const registry: readonly Step[] = [detectLegacyStep]
