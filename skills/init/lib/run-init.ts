// skills/init/lib/run-init.ts
import { AbortError } from './steps/abort-error'
import type { Step, StepContext, StepResult } from './steps/types'
import { parseFlags } from './parse-flags'
import { lazyImport } from './lazy-import'

export type RunInitOptions = {
  /** Permite injetar registry alternativo (tests). Default: registry global. */
  registry?: readonly Step[]
  /** Permite injetar cwd (tests). Default: process.cwd(). */
  cwd?: string
  /** Sink de log (tests podem capturar). Default: console.log. */
  log?: (line: string) => void
  /**
   * 2026-05-17 (Luiz/dev): Plano 03 fase-06 — injetado em ctx para steps interativos.
   * Em prod: liga em AskUserQuestion via wrapper. Em test: stub direto. PRD D3, CH-01.
   */
  askUser?: (prompt: string, options: readonly string[]) => Promise<string>
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
  const { registry: injectedRegistry, cwd, log = console.log, askUser } = opts
  // 2026-05-17 (Luiz/dev): lazyImport documenta DI-06/GT-04 — Windows safety boundary.
  // import dinamico apenas se nao houver injecao — evita carregar todos os steps em testes.
  const reg = injectedRegistry ?? (await lazyImport(() => import('./registry'))).registry

  const ctx: StepContext = (() => {
    const { args, flags } = parseFlags(argv)
    const base: StepContext = { cwd: cwd ?? process.cwd(), args, flags }
    if (askUser !== undefined) {
      return { ...base, askUser }
    }
    return base
  })()

  for (const step of reg) {
    try {
      let report = await step.run(ctx)

      // 2026-05-17 (Luiz/dev): contrato needsUser (PRD D3, CH-01, G6 do plano).
      // Ordem: checar needsUser PRIMEIRO (pode mudar o report), depois skipRemaining no report final.
      // Anti-loop guard: re-invoca step UMA UNICA VEZ. Se segunda chamada tambem retorna needsUser,
      // eh bug do step — lanca Error generica (NAO AbortError, pois nao eh comportamento esperado).
      if (report.needsUser !== undefined) {
        if (ctx.askUser !== undefined) {
          const answer = await ctx.askUser(report.needsUser.prompt, report.needsUser.options)
          // 2026-05-17 (Luiz/dev): propagar resposta via ctx.flags. Chave __interactiveAnswer reservada.
          // Cada step interativo le de ctx.flags['__interactiveAnswer'] na segunda invocacao.
          const ctxWithAnswer: StepContext = ctx.askUser !== undefined
            ? { ...ctx, flags: { ...ctx.flags, __interactiveAnswer: answer }, askUser: ctx.askUser }
            : { ...ctx, flags: { ...ctx.flags, __interactiveAnswer: answer } }
          report = await step.run(ctxWithAnswer)
          if (report.needsUser !== undefined) {
            throw new Error(`Step "${step.id}" returned needsUser twice — anti-loop guard tripped.`)
          }
        }
        // Se ctx.askUser nao estiver injetado: skip interacao (comportamento defensive em prod).
      }

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
