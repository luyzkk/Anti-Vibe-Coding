// 2026-05-14 (Luiz/dev): Tipos espelham agents/_contract/v1.schema.json — alinhado com PRD §Decisoes #5
import Ajv, { type AnySchema, type ValidateFunction } from 'ajv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Passo 1: Tipos TypeScript do contrato
// ---------------------------------------------------------------------------

export type ContractKind = 'audit' | 'mutation' | 'proposal' | 'verification'

export type LifecycleStatus = 'complete' | 'needs_retry' | 'needs_human' | 'blocked'

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low'

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unable_to_verify'

export interface SubagentContractBase {
  contract_version: '1.0'
  agent: string
  kind: ContractKind
  status: LifecycleStatus
  reasoning: string
  human_readable?: string
  metadata?: {
    run_id?: string
    duration_ms?: number
    model?: string
    cost_tokens?: number
  }
}

export interface AuditContract extends SubagentContractBase {
  kind: 'audit'
  payload: {
    domain_status?: string
    issues: Array<{
      severity: IssueSeverity
      file?: string
      line?: number
      description: string
    }>
  }
}

export interface VerificationContract extends SubagentContractBase {
  kind: 'verification'
  payload: {
    domain_status?: string
    checks: Array<{
      name: string
      status: CheckStatus
      detail?: string
    }>
    issues?: unknown[]
    suggestions?: unknown[]
  }
}

// 2026-05-14 (Luiz/dev): proposalVariant expanded — Plano 02 fase-02 BUG-P02-01
// payload.proposal com 6 campos estruturados para consumo automatico pelo /design-twice handler
export interface ProposalContract extends SubagentContractBase {
  kind: 'proposal'
  payload: {
    proposal: {
      title: string
      summary: string
      constraints: string[]
      tradeoffs: Array<{ axis: string; choice: string }>
      recommendation: string
      alternatives: Array<{ id: string; title: string; rejected_because: string }>
    }
  }
}

export interface MutationContract extends SubagentContractBase {
  kind: 'mutation'
  payload: Record<string, unknown> // stub v1 — PRD §Won't Have
}

export type SubagentContract =
  | AuditContract
  | VerificationContract
  | ProposalContract
  | MutationContract

// ---------------------------------------------------------------------------
// Passo 2: Codigos de erro e warning — alinhado com doc canonico §7
// 2026-05-14 (Luiz/dev): Codigos espelham doc canonico §7 — alinhado com PRD §Decisoes #10
// ---------------------------------------------------------------------------

export type ValidationErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_CONTRACT_VERSION'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_LIFECYCLE_STATUS' // CA-03: status com enum de dominio
  | 'REASONING_TOO_SHORT' // CA-02: <20 chars
  | 'INVALID_KIND'
  | 'PAYLOAD_SCHEMA_MISMATCH'
  | 'SECRET_PATTERN_DETECTED'

export type ValidationWarningCode =
  | 'REASONING_LIKELY_WEAK' // CA-02: 20-49 chars

export interface ValidationError {
  code: ValidationErrorCode
  message: string
  path?: string // ex: "payload.issues[0].severity"
  hint?: string // ex: "Mova para payload.domain_status"
}

export interface ValidationWarning {
  code: ValidationWarningCode
  message: string
  path?: string
}

export interface ValidationResult {
  valid: boolean
  contract?: SubagentContract // presente se valid
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

// ---------------------------------------------------------------------------
// Passo 3: Parser tolerante (G1 — JSON malformado)
// 2026-05-14 (Luiz/dev): Parser tolerante — Gotcha G1 do plano (LLM emite code fences/trailing commas)
// ---------------------------------------------------------------------------

export function parseLooseJSON(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  let cleaned = raw.trim()

  // Strip code fences ```json ... ``` ou ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fenceMatch?.[1] !== undefined) {
    cleaned = fenceMatch[1].trim()
  }

  // Tentar parse direto
  try {
    return { ok: true, value: JSON.parse(cleaned) }
  } catch (_e) {
    // Tentar remover trailing comma antes de } ou ]
    const withoutTrailingComma = cleaned.replace(/,(\s*[}\]])/g, '$1')
    try {
      return { ok: true, value: JSON.parse(withoutTrailingComma) }
    } catch (e2) {
      return { ok: false, error: e2 instanceof Error ? e2.message : String(e2) }
    }
  }
}

// ---------------------------------------------------------------------------
// Passo 4: Secret pattern detection (G4 — falsos positivos aceitos em v1)
// 2026-05-14 (Luiz/dev): Secret patterns — PRD §Seguranca + §Riscos. Aceitar falsos positivos baixos.
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: ReadonlyArray<RegExp> = [
  /API_KEY\s*=\s*['"`]?[A-Za-z0-9_-]{8,}/i,
  /SECRET\s*=\s*['"`]?[A-Za-z0-9_-]{8,}/i,
  /PASSWORD\s*=\s*['"`]?[^\s'"`]{4,}/i,
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /sk-[A-Za-z0-9]{32,}/, // OpenAI-style key
]

function detectSecrets(text: string): ValidationError | null {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      return {
        code: 'SECRET_PATTERN_DETECTED',
        message: `Pattern de secret detectado (regex: ${pattern.source})`,
        hint: 'Remover valor cru; usar referencia ou redacted',
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Passo 5: Validator principal com ajv + checks custom pre-schema
// ---------------------------------------------------------------------------

// 2026-05-14 (Luiz/dev): Validator usa ajv para schema + checks custom para PRD CA-02 e CA-03
// Import com fallback para readFileSync (compat com ambientes sem import attributes)
let schemaJson: unknown
try {
  // Bun suporta import attributes com TS 5.3+, mas carregar em runtime via readFileSync e mais seguro
  const schemaPath = resolve(import.meta.dir, '../../agents/_contract/v1.schema.json')
  schemaJson = JSON.parse(readFileSync(schemaPath, 'utf8'))
} catch (e) {
  throw new Error(`Failed to load subagent contract schema: ${e instanceof Error ? e.message : String(e)}`)
}

const ajv = new Ajv({ allErrors: true })
const validateSchema: ValidateFunction = ajv.compile(schemaJson as AnySchema)

const VALID_LIFECYCLE_STATUSES: ReadonlySet<string> = new Set(['complete', 'needs_retry', 'needs_human', 'blocked'])

export function validateContract(parsed: unknown): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      valid: false,
      errors: [{ code: 'INVALID_JSON', message: 'Output nao e objeto JSON' }],
      warnings: [],
    }
  }

  // narrow via type guard — evita `as` desnecessario
  const obj = parsed as Record<string, unknown>

  // CA-03: detectar enum de dominio em status ANTES do schema (mensagem custom melhor)
  if (typeof obj['status'] === 'string' && !VALID_LIFECYCLE_STATUSES.has(obj['status'])) {
    errors.push({
      code: 'INVALID_LIFECYCLE_STATUS',
      message: `status="${obj['status']}" nao e lifecycle valido`,
      path: 'status',
      hint: 'Use complete/needs_retry/needs_human/blocked. Enum de dominio vai em payload.domain_status.',
    })
  }

  // CA-02: reasoning thresholds antes do schema para mensagem customizada
  if (typeof obj['reasoning'] === 'string') {
    if (obj['reasoning'].length < 20) {
      errors.push({
        code: 'REASONING_TOO_SHORT',
        message: `reasoning tem ${obj['reasoning'].length} chars (minimo 20)`,
        path: 'reasoning',
        hint: 'Escrever 1-3 frases sobre o que voce observou fora do schema',
      })
    } else if (obj['reasoning'].length < 50) {
      warnings.push({
        code: 'REASONING_LIKELY_WEAK',
        message: `reasoning tem ${obj['reasoning'].length} chars — prompt do agente provavelmente subotimo`,
        path: 'reasoning',
      })
    }
  }

  // Schema validation via ajv (cobre os outros campos obrigatorios e payload shape)
  const schemaOk = validateSchema(parsed)
  if (!schemaOk && validateSchema.errors) {
    for (const e of validateSchema.errors) {
      const instancePath = e.instancePath ?? ''
      const keyword = e.keyword ?? ''

      if (keyword === 'required') {
        const missingProp = typeof e.params === 'object' && e.params !== null
          ? (e.params as Record<string, unknown>)['missingProperty']
          : undefined
        const resolvedPath = instancePath || (typeof missingProp === 'string' ? missingProp : '')
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: e.message ?? 'campo ausente',
          ...(resolvedPath ? { path: resolvedPath } : {}),
        })
      } else if (instancePath === '/contract_version') {
        errors.push({ code: 'INVALID_CONTRACT_VERSION', message: 'contract_version deve ser "1.0"', path: 'contract_version' })
      } else if (instancePath === '/kind') {
        errors.push({ code: 'INVALID_KIND', message: e.message ?? 'kind invalido', path: 'kind' })
      } else if (keyword === 'oneOf' || instancePath.startsWith('/payload')) {
        errors.push({ code: 'PAYLOAD_SCHEMA_MISMATCH', message: e.message ?? 'payload nao casa com kind', path: instancePath })
      } else if (instancePath === '/reasoning' && keyword === 'minLength') {
        // ja capturamos acima com mensagem custom — skip ajv generic
      } else if (instancePath === '/status' && keyword === 'enum') {
        // ja capturamos com INVALID_LIFECYCLE_STATUS — skip ajv generic
      } else {
        errors.push({ code: 'PAYLOAD_SCHEMA_MISMATCH', message: e.message ?? 'erro de schema', path: instancePath })
      }
    }
  }

  // Secret detection (em payload + reasoning serializados)
  const serialized =
    JSON.stringify(obj['payload'] ?? {}) + ' ' + (typeof obj['reasoning'] === 'string' ? obj['reasoning'] : '')
  const secretErr = detectSecrets(serialized)
  if (secretErr) errors.push(secretErr)

  if (errors.length > 0) {
    return { valid: false, errors, warnings }
  }

  // Cast e seguro pois ajv validou o schema completo acima
  return { valid: true, contract: parsed as SubagentContract, errors: [], warnings }
}

// ---------------------------------------------------------------------------
// Passo 6: API publica — parseContract com retry mecanico
// 2026-05-14 (Luiz/dev): parseContract = parser + validator. Retry mecanico aqui; needs_retry semantico fica com orquestrador.
// ---------------------------------------------------------------------------

export function parseContract(raw: string): ValidationResult {
  const parsed = parseLooseJSON(raw)
  if (!parsed.ok) {
    return {
      valid: false,
      errors: [
        {
          code: 'INVALID_JSON',
          message: parsed.error,
          hint: 'Retry mecanico: re-invocar agente com prompt enfatizando JSON valido',
        },
      ],
      warnings: [],
    }
  }
  return validateContract(parsed.value)
}

// ---------------------------------------------------------------------------
// Passo 7: withRetry — helper semantico para status: "needs_retry" (D9)
// 2026-05-14 (Luiz/dev): retry helper para status: "needs_retry" — PRD §Decisoes #9 (D9)
// max=1 default, escala para needs_human apos segundo needs_retry (sem loop infinito).
// Retry de JSON.parse failure vive em parseContract() — esse e SEMANTICO.
// ---------------------------------------------------------------------------

export type RetryOpts = {
  max?: number // default 1, cap absoluto em v6.1.0 — RF-SH-03 fica para v6.2
}

export type InvokeFn<T extends SubagentContractBase = SubagentContract> = () => Promise<T>

export async function withRetry<T extends SubagentContractBase>(
  invoke: InvokeFn<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const max = opts.max ?? 1
  let attempt = 0
  let result = await invoke()

  while (result.status === 'needs_retry' && attempt < max) {
    attempt += 1
    result = await invoke()
  }

  if (result.status === 'needs_retry') {
    // 2026-05-14 (Luiz/dev): segundo needs_retry vira needs_human — D9 escalation
    return {
      ...result,
      status: 'needs_human' as const,
      reasoning:
        result.reasoning +
        ` [withRetry: ${max} retries esgotados, escalando para humano]`,
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Passo 8: parseAndDispatch — handler generico por kind
// 2026-05-14 (Luiz/dev): parseAndDispatch — handler generico por kind. PRD §Solucao "orquestrador escolhe handler por kind".
// ---------------------------------------------------------------------------

export type KindHandler<T extends SubagentContract = SubagentContract> = (contract: T) => void | Promise<void>

export interface KindHandlers {
  audit?: KindHandler<AuditContract>
  verification?: KindHandler<VerificationContract>
  proposal?: KindHandler<ProposalContract>
  mutation?: KindHandler<MutationContract>
}

export interface DispatchResult {
  validation: ValidationResult
  dispatched: boolean
  handlerKind?: ContractKind
}

export async function parseAndDispatch(rawOutput: string, handlers: KindHandlers): Promise<DispatchResult> {
  const validation = parseContract(rawOutput)
  if (!validation.valid || !validation.contract) {
    return { validation, dispatched: false }
  }

  const contract = validation.contract
  const handler = handlers[contract.kind]
  if (!handler) {
    return { validation, dispatched: false, handlerKind: contract.kind }
  }

  // Type narrowing manual — TS nao discrimina cross-kind handler map automaticamente
  if (contract.kind === 'audit' && handlers.audit) {
    await handlers.audit(contract)
  } else if (contract.kind === 'verification' && handlers.verification) {
    await handlers.verification(contract)
  } else if (contract.kind === 'proposal' && handlers.proposal) {
    await handlers.proposal(contract)
  } else if (contract.kind === 'mutation' && handlers.mutation) {
    await handlers.mutation(contract)
  }

  return { validation, dispatched: true, handlerKind: contract.kind }
}
