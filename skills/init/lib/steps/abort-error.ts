// skills/init/lib/steps/abort-error.ts

export type AbortPayload = {
  /** Codigo de saida que o dispatcher devolvera ao processo. 1=needs-migration, 2=conflict. */
  code: number
  /** Mensagem ja formatada para stdout. Wording byte-identico ao bloco inline original (PRD R1). */
  reason: string
}

/**
 * Sinaliza parada controlada do dispatcher.
 * Use em gates (validacoes que precisam interromper) em vez de process.exit() — PRD D4.
 *
 * @example
 * throw new AbortError({ code: 1, reason: 'Detected v5.x artifacts: planning-dir' })
 */
export class AbortError extends Error {
  readonly code: number
  readonly reason: string

  constructor(payload: AbortPayload) {
    super(payload.reason)
    this.name = 'AbortError'
    this.code = payload.code
    this.reason = payload.reason
    // Preserva stack em runtimes V8.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, AbortError)
    }
  }
}
