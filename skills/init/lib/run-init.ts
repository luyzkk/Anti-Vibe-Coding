// skills/init/lib/run-init.ts
import { AbortError } from './steps/abort-error'
import type { Step, StepResult } from './steps/types'
import { parseFlags } from './parse-flags'
import { lazyImport } from './lazy-import'

export type RunInitOptions = {
  /** Permite injetar registry alternativo (tests). Default: registry global. */
  registry?: readonly Step[]
  /** Permite injetar cwd (tests). Default: process.cwd(). */
  cwd?: string
  /** Sink de log (tests podem capturar). Default: console.log. */
  log?: (line: string) => void
}

/**
 * Executa todos os steps em sequencia. Para no primeiro AbortError.
 * Nao chama process.exit() — devolve `StepResult` para o caller decidir.
 *
 * @example
 * const result = await runInit(Bun.argv.slice(2))
 * if (result.kind === 'aborted') process.exit(result.code)
 */
export async function runInit(
  argv: readonly string[],
  opts: RunInitOptions = {},
): Promise<StepResult> {
  const { registry: injectedRegistry, cwd, log = console.log } = opts
  // 2026-05-17 (Luiz/dev): lazyImport documenta DI-06/GT-04 — Windows safety boundary.
  // import dinamico apenas se nao houver injecao — evita carregar todos os steps em testes.
  const reg = injectedRegistry ?? (await lazyImport(() => import('./registry'))).registry

  const ctx = (() => {
    const { args, flags } = parseFlags(argv)
    return { cwd: cwd ?? process.cwd(), args, flags }
  })()

  for (const step of reg) {
    try {
      const report = await step.run(ctx)
      log(`[${step.id}] ${report.summary}`)
      if (report.mutated) {
        // 2026-05-17 (Luiz/dev): log explicito de mutacao — alinhado com PRD SH-04 (rastreabilidade).
        log(`[${step.id}] (mutated disk)`)
      }
      // 2026-05-17 (Luiz/dev): Plano 02 fase-06 — early-exit para reuse-discovery cache-fresh.
      // Mapeia process.exit(0) do SKILL.md linha 550 sem usar AbortError (semantica de erro). PRD MH-04, CA-04.
      if (report.skipRemaining === true) {
        break
      }
    } catch (e) {
      if (e instanceof AbortError) {
        log(e.reason)
        return { kind: 'aborted', code: e.code, reason: e.reason }
      }
      throw e
    }
  }

  return { kind: 'ok', report: { mutated: false, summary: 'all steps completed' } }
}
