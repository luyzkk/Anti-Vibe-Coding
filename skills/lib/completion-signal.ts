// 2026-05-12 (Luiz/dev): completion signal helper — D33/S12/CA-47
// Emite bloco YAML machine-readable que skills incluem no final de seu output.
// extractCompletionSignal() permite que orquestradores e testes leiam o resultado sem parsing frágil.
import * as yaml from 'js-yaml'

/** Status da skill ao terminar sua execução */
export type CompletionStatus = 'complete' | 'blocked' | 'in_progress'

/** Sinal estruturado emitido ao final de cada skill */
export type CompletionSignal = {
  skill: string
  status: CompletionStatus
  outputs: string[]
  next_suggested: string | null
  blocks_for_user: string[]
}

const MAX_BLOCK_LEN = 80
const YAML_OPTS: yaml.DumpOptions = { flowLevel: -1, lineWidth: 120, noRefs: true }

/**
 * Serializa um CompletionSignal em bloco YAML fenced.
 *
 * @example
 * const block = renderCompletionSignal({ skill: 'grill-me', status: 'complete', outputs: [], next_suggested: null, blocks_for_user: [] })
 * // '```yaml\nskill: grill-me\n...\n```'
 */
export function renderCompletionSignal(opts: CompletionSignal): string {
  if (!opts.skill) throw new Error('skill é obrigatório')
  if (!opts.status) throw new Error('status é obrigatório')
  if (opts.status === 'complete' && opts.blocks_for_user.length > 0) {
    throw new Error('status=complete requer blocks_for_user vazio')
  }

  const truncated = opts.blocks_for_user.map((b) =>
    b.length > MAX_BLOCK_LEN ? b.slice(0, MAX_BLOCK_LEN - 3) + '...' : b
  )

  const signal: CompletionSignal = {
    skill: opts.skill,
    status: opts.status,
    outputs: opts.outputs,
    next_suggested: opts.next_suggested,
    blocks_for_user: truncated,
  }

  const dumped = yaml.dump(signal, YAML_OPTS)
  return '```yaml\n' + dumped + '```'
}

function isCompletionStatus(value: unknown): value is CompletionStatus {
  return value === 'complete' || value === 'blocked' || value === 'in_progress'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

function isCompletionSignal(value: unknown): value is CompletionSignal {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['skill'] === 'string' &&
    isCompletionStatus(obj['status']) &&
    isStringArray(obj['outputs']) &&
    (obj['next_suggested'] === null || typeof obj['next_suggested'] === 'string') &&
    isStringArray(obj['blocks_for_user'])
  )
}

/**
 * Extrai o último bloco YAML fenced de uma string de output e parseia como CompletionSignal.
 * Retorna null se ausente ou malformado.
 *
 * @example
 * const signal = extractCompletionSignal(skillOutput)
 * if (signal?.status === 'blocked') { ... }
 */
export function extractCompletionSignal(rawOutput: string): CompletionSignal | null {
  // Extrai TODOS os blocos ```yaml ... ``` e pega o último
  const regex = /```yaml\n([\s\S]*?)```/g
  let lastMatch: RegExpExecArray | null = null
  let match: RegExpExecArray | null

  while ((match = regex.exec(rawOutput)) !== null) {
    lastMatch = match
  }

  if (lastMatch === null) return null

  const yamlContent = lastMatch[1]
  if (yamlContent === undefined) return null

  try {
    const parsed = yaml.load(yamlContent)
    if (isCompletionSignal(parsed)) return parsed
    return null
  } catch {
    return null
  }
}
