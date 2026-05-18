// 2026-05-18 (Luiz/dev): dry-run wiring global — MH-06 + D18 + foundation para CA-13 parity

import { WriteRecorder, makeWriter, type DryRunMode } from './dry-run'
import type { StepContext } from './steps/types'

const DRY_RUN_FLAG = 'dry-run'
const RECORDER_KEY = '__dryRunRecorder'

/**
 * Detecta se o init esta rodando em modo dry-run.
 * Lookups EXCLUSIVAMENTE em ctx.flags — args posicionais sao ignorados.
 */
export function isDryRun(ctx: StepContext): boolean {
  return ctx.flags[DRY_RUN_FLAG] === true
}

/**
 * Retorna o WriteRecorder propagado pelo dispatcher quando dry-run esta ativo,
 * ou undefined caso contrario.
 */
export function getRecorder(ctx: StepContext): WriteRecorder | undefined {
  // 2026-05-18 (Luiz/dev): cast minimo — recorder e instancia, nao primitive. Compatibilidade
  // com Record<string, boolean | string> via slot reservado __dryRunRecorder; runtime garante o tipo.
  const slot = (ctx.flags as Record<string, unknown>)[RECORDER_KEY]
  return slot instanceof WriteRecorder ? slot : undefined
}

/**
 * Conveniencia: monta um DryRunMode a partir do ctx para passar a makeWriter.
 */
export function getDryRunMode(ctx: StepContext): DryRunMode {
  if (!isDryRun(ctx)) return { dryRun: false }
  const recorder = getRecorder(ctx)
  if (recorder === undefined) return { dryRun: true, recorder: new WriteRecorder() }
  return { dryRun: true, recorder }
}

export type RenameRecord = { from: string; to: string }

export class RenameRecorder {
  private renames: RenameRecord[] = []
  record(from: string, to: string): void {
    this.renames.push({ from, to })
  }
  list(): readonly RenameRecord[] { return this.renames }
  count(): number { return this.renames.length }
}

export function makeRenamer(
  mode: DryRunMode & { renameRecorder?: RenameRecorder },
): (from: string, to: string) => Promise<void> {
  if (mode.dryRun && mode.renameRecorder !== undefined) {
    const rec = mode.renameRecorder
    return async (from, to) => { rec.record(from, to) }
  }
  return async (from, to) => {
    const { promises: fs } = await import('node:fs')
    await fs.rename(from, to)
  }
}

// Re-export para consumo direto pelos steps
export { makeWriter, WriteRecorder }
