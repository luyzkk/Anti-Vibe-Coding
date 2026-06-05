// skills/init/lib/steps/types.ts
import type { DetectedStack } from '../detect-stack'
import type { LegacyState } from '../detect-v5-legacy'

/**
 * Contexto compartilhado entregue a todo step pelo dispatcher.
 * Mantido minimo de propria — steps que precisam de mais consomem helpers diretos.
 */
export type StepContext = {
  /** Diretorio do projeto-alvo. Equivalente a process.cwd() ao tempo do dispatcher. */
  cwd: string
  /** Args brutos passados ao dispatcher (apos parse). Inclui flags como '--dry-run'. */
  args: readonly string[]
  /** Flags parseadas em formato declarativo. Dispatcher decide o shape final. */
  flags: Readonly<Record<string, boolean | string>>
  /**
   * 2026-05-17 (Luiz/dev): injetado pelo dispatcher para steps interativos.
   * Steps NAO chamam askUser diretamente — eles RETORNAM `needsUser` no report.
   * O dispatcher faz a chamada e re-invoca o step com a resposta. PRD D3, CH-01.
   * Default: undefined (testes podem stubar).
   */
  askUser?: (prompt: string, options: readonly string[]) => Promise<string>
  /**
   * 2026-05-21 (Luiz/dev): Plano 01 fase-02 — populados pelo Step 2 (detect-legacy-and-stack).
   * Opcionais nesta fase para nao quebrar stubs dos outros 8 steps (DV-4).
   * Plano 02 endurece para obrigatorios apos Step 4 escrever o manifest.
   * ctx.legacy: resultado de detectV5Legacy() — isLegacy, artifacts, paths.
   * ctx.stack: resultado de detectStack() — primary, secondary, signalSource, anchorFiles.
   */
  legacy?: LegacyState
  stack?: DetectedStack
}

/**
 * Resultado de um step executado com sucesso (sem abort).
 * `mutated`: true se o step escreveu/alterou disco. Steps read-only retornam false.
 * `summary`: string curta para o log do dispatcher (uma linha).
 * `skipRemaining`: quando true, o dispatcher interrompe o loop do registry APOS este step (early-exit).
 * 2026-05-17 (Luiz/dev): introduzido para mapear `process.exit(0)` do reuse-discovery.0
 * (SKILL.md linha 550) sem usar AbortError (que carrega semantica de erro). PRD MH-04, CA-04.
 * Default: undefined (falsy) — comportamento anterior preservado.
 */
export type StepReport = {
  mutated: boolean
  summary: string
  skipRemaining?: boolean
  /**
   * 2026-05-17 (Luiz/dev): contrato `needs-user` (PRD D3, CH-01).
   * Step sinaliza ao dispatcher que precisa de input do usuario. Dispatcher pausa,
   * chama ctx.askUser, popula ctx.flags['__interactiveAnswer'] e re-invoca o step.
   * NUNCA setar AMBOS needsUser E skipRemaining (G6 do plano).
   */
  needsUser?: {
    readonly prompt: string
    readonly options: readonly string[]
  }
  /**
   * 2026-06-05 (Luiz/dev): CA-11 — caminho relativo do PLAN.md populate gerado pelo Step 7.
   * O dispatcher captura este valor apos o loop para emitir a mensagem final sugestiva
   * (Harness scaffold criado + /execute-plan). Substitui o canal antigo via ctx.flags
   * (`__populatePlanPath`), que dependia de mutar flags Readonly e foi perdido num refactor.
   * Opcional/additive — steps que nao geram plano simplesmente nao setam.
   */
  populatePlanPath?: string
}

/**
 * Contrato canonico de um step. Toda celula de execucao do /init implementa isto.
 * `id`: identificador estavel (usado em manifest/registry e em logs).
 * `run`: funcao async que recebe o contexto e retorna um report. Pode lancar AbortError.
 */
export type Step = {
  readonly id: string
  run(ctx: StepContext): Promise<StepReport>
}

/**
 * Tipo auxiliar para teste/mock: resultado de uma execucao do dispatcher,
 * exposto para os Planos 02/03 escreverem suas proprias suites.
 */
export type StepResult =
  | { kind: 'ok'; report: StepReport }
  | { kind: 'aborted'; code: number; reason: string }
