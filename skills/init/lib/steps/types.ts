// skills/init/lib/steps/types.ts

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
