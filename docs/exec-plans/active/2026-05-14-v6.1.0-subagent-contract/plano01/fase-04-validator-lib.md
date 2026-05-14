<!--
Princípio universal #5 — Comment Provenance.
Codigo TS gerado nesta fase precisa de comentarios provenance: quem decidiu / quando /
por que (link para PRD ou ADR). Exemplo no snippet do Passo 2.
-->

# Fase 04: Validator + Parser TS

**Plano:** 01 — Fundacao do Contrato
**Sizing:** 1.5h
**Depende de:** fase-03 (schema existe; validator carrega schema)
**Visual:** false

---

## O que esta fase entrega

`skills/lib/subagent-contract.ts` — helper TS com parser tolerante, validador, retry mecanico em parse failure (separado do `needs_retry` semantico) e deteccao de patterns de secrets. Testes co-localizados em `subagent-contract.test.ts`. Cobre CA-02 (reasoning thresholds), CA-03 (rejeicao de lifecycle invalido).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/lib/subagent-contract.ts` | Create | Parser + validator + tipos do contrato v1 |
| `skills/lib/subagent-contract.test.ts` | Create | Testes co-localizados (cobrem CA-02, CA-03, retry mecanico, secret-pattern) |
| `skills/lib/__fixtures__/contract-v1/` | Create | Fixtures de teste (valid.json, invalid-status.json, short-reasoning.json, secret-in-payload.json, malformed.txt) |

---

## Implementacao

### Passo 1: Definir tipos TypeScript do contrato

Tipos refletem schema da fase-03 mas em TS estrito (sem `any`, sem `as`).

```typescript
// skills/lib/subagent-contract.ts

// 2026-05-14 (Luiz/dev): Tipos espelham agents/_contract/v1.schema.json — alinhado com PRD §Decisoes #5
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

export interface ProposalContract extends SubagentContractBase {
  kind: 'proposal'
  payload: {
    proposal_summary: string
    options?: unknown[]
    recommendation?: string
  }
}

export interface MutationContract extends SubagentContractBase {
  kind: 'mutation'
  payload: Record<string, unknown>  // stub v1 — PRD §Won't Have
}

export type SubagentContract =
  | AuditContract
  | VerificationContract
  | ProposalContract
  | MutationContract
```

### Passo 2: Codigos de erro e warning (G3 — distinguir niveis)

```typescript
// 2026-05-14 (Luiz/dev): Codigos espelham doc canonico §7 — alinhado com PRD §Decisoes #10
export type ValidationErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_CONTRACT_VERSION'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_LIFECYCLE_STATUS'  // CA-03: status com enum de dominio
  | 'REASONING_TOO_SHORT'        // CA-02: <20 chars
  | 'INVALID_KIND'
  | 'PAYLOAD_SCHEMA_MISMATCH'
  | 'SECRET_PATTERN_DETECTED'

export type ValidationWarningCode =
  | 'REASONING_LIKELY_WEAK'  // CA-02: 20-49 chars

export interface ValidationError {
  code: ValidationErrorCode
  message: string
  path?: string  // ex: "payload.issues[0].severity"
  hint?: string  // ex: "Mova para payload.domain_status"
}

export interface ValidationWarning {
  code: ValidationWarningCode
  message: string
  path?: string
}

export interface ValidationResult {
  valid: boolean
  contract?: SubagentContract  // presente se valid
  errors: ValidationError[]
  warnings: ValidationWarning[]
}
```

### Passo 3: Parser tolerante (G1 — JSON malformado)

LLM costuma envelopar JSON em code fences ` ```json ... ``` `, adicionar trailing comma, espacos extras. Pre-processing antes de `JSON.parse`:

```typescript
// 2026-05-14 (Luiz/dev): Parser tolerante — Gotcha G1 do plano (LLM emite code fences/trailing commas)
export function parseLooseJSON(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  // 1. Strip code fences ```json ... ``` ou ``` ... ```
  let cleaned = raw.trim()
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  }

  // 2. Tentar parse direto
  try {
    return { ok: true, value: JSON.parse(cleaned) }
  } catch (e) {
    // 3. Tentar remover trailing comma antes de } ou ]
    const withoutTrailingComma = cleaned.replace(/,(\s*[}\]])/g, '$1')
    try {
      return { ok: true, value: JSON.parse(withoutTrailingComma) }
    } catch (e2) {
      return { ok: false, error: e2 instanceof Error ? e2.message : String(e2) }
    }
  }
}
```

### Passo 4: Secret pattern detection (G4 — falsos positivos)

Regex case-insensitive em `payload` serializado + `reasoning`. Detecta atribuicao literal, nao mencao em texto neutro:

```typescript
// 2026-05-14 (Luiz/dev): Secret patterns — PRD §Seguranca + §Riscos. Aceitar falsos positivos baixos.
const SECRET_PATTERNS: ReadonlyArray<RegExp> = [
  /API_KEY\s*=\s*['"`]?[A-Za-z0-9_\-]{8,}/i,
  /SECRET\s*=\s*['"`]?[A-Za-z0-9_\-]{8,}/i,
  /PASSWORD\s*=\s*['"`]?[^\s'"`]{4,}/i,
  /AKIA[0-9A-Z]{16}/,           // AWS access key id
  /sk-[A-Za-z0-9]{32,}/,         // OpenAI-style key
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
```

### Passo 5: Validator principal

```typescript
// 2026-05-14 (Luiz/dev): Validator usa ajv para schema + checks custom para PRD CA-02 e CA-03
import Ajv, { type ValidateFunction } from 'ajv'
import schemaJson from '../../agents/_contract/v1.schema.json' assert { type: 'json' }

const ajv = new Ajv({ allErrors: true })
const validateSchema: ValidateFunction = ajv.compile(schemaJson)

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

  const obj = parsed as Record<string, unknown>

  // CA-03: detectar enum de dominio em status ANTES do schema (mensagem custom melhor)
  if (typeof obj.status === 'string' && !['complete', 'needs_retry', 'needs_human', 'blocked'].includes(obj.status)) {
    errors.push({
      code: 'INVALID_LIFECYCLE_STATUS',
      message: `status="${obj.status}" nao e lifecycle valido`,
      path: 'status',
      hint: 'Use complete/needs_retry/needs_human/blocked. Enum de dominio vai em payload.domain_status.',
    })
  }

  // CA-02: reasoning thresholds antes do schema
  if (typeof obj.reasoning === 'string') {
    if (obj.reasoning.length < 20) {
      errors.push({
        code: 'REASONING_TOO_SHORT',
        message: `reasoning tem ${obj.reasoning.length} chars (minimo 20)`,
        path: 'reasoning',
        hint: 'Escrever 1-3 frases sobre o que voce observou fora do schema',
      })
    } else if (obj.reasoning.length < 50) {
      warnings.push({
        code: 'REASONING_LIKELY_WEAK',
        message: `reasoning tem ${obj.reasoning.length} chars — prompt do agente provavelmente subotimo`,
        path: 'reasoning',
      })
    }
  }

  // Schema validation (cobre os outros campos)
  const schemaOk = validateSchema(parsed)
  if (!schemaOk && validateSchema.errors) {
    for (const e of validateSchema.errors) {
      // Mapear erros do ajv para codigos do contrato (sem duplicar com INVALID_LIFECYCLE_STATUS / REASONING_TOO_SHORT acima)
      if (e.keyword === 'required') {
        errors.push({ code: 'MISSING_REQUIRED_FIELD', message: e.message ?? 'campo ausente', path: e.instancePath || e.params.missingProperty })
      } else if (e.instancePath === '/contract_version') {
        errors.push({ code: 'INVALID_CONTRACT_VERSION', message: 'contract_version deve ser "1.0"', path: 'contract_version' })
      } else if (e.instancePath === '/kind') {
        errors.push({ code: 'INVALID_KIND', message: e.message ?? 'kind invalido', path: 'kind' })
      } else if (e.keyword === 'oneOf' || e.instancePath.startsWith('/payload')) {
        errors.push({ code: 'PAYLOAD_SCHEMA_MISMATCH', message: e.message ?? 'payload nao casa com kind', path: e.instancePath })
      } else if (e.instancePath === '/reasoning' && e.keyword === 'minLength') {
        // ja capturamos acima, skip
      } else {
        errors.push({ code: 'PAYLOAD_SCHEMA_MISMATCH', message: e.message ?? 'erro de schema', path: e.instancePath })
      }
    }
  }

  // Secret detection (em payload + reasoning serializados)
  const serialized = JSON.stringify(obj.payload ?? {}) + ' ' + (typeof obj.reasoning === 'string' ? obj.reasoning : '')
  const secretErr = detectSecrets(serialized)
  if (secretErr) errors.push(secretErr)

  if (errors.length > 0) {
    return { valid: false, errors, warnings }
  }

  return { valid: true, contract: parsed as SubagentContract, errors: [], warnings }
}
```

### Passo 6: API publica — `parseContract` com retry mecanico

Distingue parse failure mecanico (retry) de `needs_retry` semantico (orquestrador responsabilidade):

```typescript
// 2026-05-14 (Luiz/dev): parseContract = parser + validator. Retry mecanico aqui; needs_retry semantico fica com orquestrador.
export function parseContract(raw: string): ValidationResult {
  const parsed = parseLooseJSON(raw)
  if (!parsed.ok) {
    return {
      valid: false,
      errors: [{ code: 'INVALID_JSON', message: parsed.error, hint: 'Retry mecanico: re-invocar agente com prompt enfatizando JSON valido' }],
      warnings: [],
    }
  }
  return validateContract(parsed.value)
}
```

### Passo 7: Testes co-localizados (`subagent-contract.test.ts`)

Cobre todos os criterios de aceite relevantes:

```typescript
// skills/lib/subagent-contract.test.ts
import { test, expect } from 'bun:test'
import { parseContract, parseLooseJSON } from './subagent-contract'

test('parseLooseJSON strips ```json code fence', () => {
  const raw = '```json\n{"a":1}\n```'
  const r = parseLooseJSON(raw)
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.value).toEqual({ a: 1 })
})

test('parseLooseJSON recovers from trailing comma', () => {
  const raw = '{"a":1,"b":2,}'
  const r = parseLooseJSON(raw)
  expect(r.ok).toBe(true)
})

test('parseLooseJSON returns ok=false for unrecoverable malformed JSON', () => {
  const r = parseLooseJSON('not json at all { broken')
  expect(r.ok).toBe(false)
})

test('rejects reasoning shorter than 20 chars with REASONING_TOO_SHORT (CA-02)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning: 'curto',
    payload: { issues: [] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(false)
  expect(r.errors.some(e => e.code === 'REASONING_TOO_SHORT')).toBe(true)
})

test('warns when reasoning is 20-49 chars (REASONING_LIKELY_WEAK)', () => {
  const reasoning = 'a'.repeat(30)  // 30 chars — passa o erro, dispara warning
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning,
    payload: { issues: [] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(true)
  expect(r.warnings.some(w => w.code === 'REASONING_LIKELY_WEAK')).toBe(true)
})

test('rejects domain enum in top-level status with INVALID_LIFECYCLE_STATUS (CA-03)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'VULNERABILITIES_FOUND',
    reasoning: 'texto suficientemente longo aqui para passar o threshold ok',
    payload: { issues: [] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(false)
  const err = r.errors.find(e => e.code === 'INVALID_LIFECYCLE_STATUS')
  expect(err).toBeDefined()
  expect(err?.hint).toContain('payload.domain_status')
})

test('detects API_KEY pattern in payload (SECRET_PATTERN_DETECTED)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning: 'texto suficientemente longo aqui para passar o threshold ok',
    payload: { issues: [{ severity: 'high', description: 'API_KEY=abc123def456ghi789 found' }] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(false)
  expect(r.errors.some(e => e.code === 'SECRET_PATTERN_DETECTED')).toBe(true)
})

test('accepts valid audit contract with reasoning >=50 chars (no warnings)', () => {
  const raw = JSON.stringify({
    contract_version: '1.0',
    agent: 'security-auditor',
    kind: 'audit',
    status: 'complete',
    reasoning: 'Encontrei MD5 em src/auth.ts:42 e SQL concatenado em src/api.ts:15. Nada fora do schema.',
    payload: { issues: [{ severity: 'critical', description: 'MD5 used' }] },
  })
  const r = parseContract(raw)
  expect(r.valid).toBe(true)
  expect(r.errors).toEqual([])
  expect(r.warnings).toEqual([])
})

test('mechanical retry signal: INVALID_JSON has hint to re-invoke', () => {
  const r = parseContract('not json at all')
  expect(r.valid).toBe(false)
  const err = r.errors.find(e => e.code === 'INVALID_JSON')
  expect(err?.hint).toContain('Retry mecanico')
})
```

---

## Gotchas

- **G1 (LLM malformed):** Parser tolerante cobre code fences + trailing comma. Casos mais exoticos (comentarios JS dentro do JSON, single quotes) **nao sao tratados** — viram retry mecanico via `INVALID_JSON`. Conscientemente nao implementamos json5 completo (PRD §Custo: dependencia zero importa).
- **G3 (2 niveis de reasoning):** Validator checa `<20` ANTES do schema para mensagem custom. Schema tambem rejeitaria (minLength), mas a mensagem do ajv e generica. Ordem importa.
- **G4 (secret false positives):** Patterns acionam em atribuicao (`API_KEY=`) com 8+ chars de valor. Comentarios tipo "ver variavel API_KEY no .env" **nao acionam** (sem `=` proximo). Aceitavel para v1; refinar se autores reclamarem.
- **G5 (contract_version fixo):** Validator nao tem logica de selecao de versao. Qualquer valor diferente de `"1.0"` rejeita. Schema-level (`const`).
- **Local:** `import schemaJson from ... assert { type: 'json' }` requer TS >= 5.3 / Bun atual. Se falhar, fallback: `JSON.parse(readFileSync(...))` em runtime — checar versao do Bun do projeto antes.
- **Local:** Os testes usam `bun:test`. Padrao do repo ja e esse (ver outros `.test.ts` em `skills/lib/`).

---

## Verificacao

### TDD

- [ ] **RED:** Escrever primeiro o teste `rejects reasoning shorter than 20 chars`; rodar sem o validator implementado — falha por funcao inexistente
  - Comando: `bun test skills/lib/subagent-contract.test.ts`
  - Resultado esperado: erro de import ou ReferenceError

- [ ] **GREEN:** Implementar `parseContract` minimo (so o check de reasoning); teste passa
  - Comando: `bun test skills/lib/subagent-contract.test.ts -t "REASONING_TOO_SHORT"`
  - Resultado esperado: 1 passed

- [ ] Repetir RED/GREEN por teste ate cobrir todos os 9 testes do Passo 7

### Checklist

- [ ] `skills/lib/subagent-contract.ts` criado e exporta `parseContract`, `parseLooseJSON`, `validateContract`, todos os tipos
- [ ] Zero uso de `any` (CLAUDE.md global)
- [ ] Zero uso de `as` exceto narrow apos validacao (`parsed.value as SubagentContract` no return path valido)
- [ ] Comentarios provenance nos pontos-chave (G8: quem/quando/por que com link para PRD)
- [ ] `skills/lib/subagent-contract.test.ts` tem os 9 testes do Passo 7
- [ ] Teste `REASONING_TOO_SHORT` passa (CA-02 erro)
- [ ] Teste `REASONING_LIKELY_WEAK` passa (CA-02 warning)
- [ ] Teste `INVALID_LIFECYCLE_STATUS` passa (CA-03) e error.hint menciona `payload.domain_status`
- [ ] Teste de secret pattern (`API_KEY=...`) passa
- [ ] Teste de code fence stripping passa
- [ ] Teste de trailing comma recovery passa
- [ ] Teste de retry mecanico (`INVALID_JSON` com hint) passa
- [ ] `bun test skills/lib/subagent-contract.test.ts` retorna 9 passed
- [ ] `bun run lint` limpo no arquivo
- [ ] `bun run typecheck` (se configurado) limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/lib/subagent-contract.test.ts` retorna `9 pass, 0 fail`
- `grep -c "any" skills/lib/subagent-contract.ts` retorna 0 (modulo nomes de propriedades tipo "anyOf" do JSON Schema)
- `grep -c "// 2026-05-14" skills/lib/subagent-contract.ts` retorna >= 4 (provenance comments)

**Por humano:**
- Revisor le os 9 testes e identifica 1:1 cada CA do PRD (CA-02 erro, CA-02 warning, CA-03, retry mecanico, secret detection)
- Revisor consegue prever (sem rodar) que adicionar `reasoning: "a".repeat(19)` retorna `valid: false` e `reasoning: "a".repeat(20)` retorna `valid: true` com warning

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
