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
 */
export type StepReport = {
  mutated: boolean
  summary: string
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
