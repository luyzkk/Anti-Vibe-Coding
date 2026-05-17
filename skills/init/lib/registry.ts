// skills/init/lib/registry.ts
import type { Step } from './steps/types'

/**
 * Lista ORDENADA de steps que o dispatcher executa sequencialmente.
 * Cada plano (01/02/03) adiciona suas entradas. Manter a ordem deste array eh contratual:
 * altera = revisar SKILL.md (Plano 04 — cutover).
 */
export const registry: readonly Step[] = []
