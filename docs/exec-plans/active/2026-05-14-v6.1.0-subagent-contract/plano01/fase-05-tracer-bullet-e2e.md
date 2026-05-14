<!--
Princípio universal #5 — Comment Provenance.
Esta fase modifica prompt do security-auditor (humano, sem provenance inline) e adiciona
funcao TS parseAndDispatch (precisa de provenance no header).
-->

# Fase 05: Tracer Bullet End-to-End

**Plano:** 01 — Fundacao do Contrato
**Sizing:** 1h
**Depende de:** fase-04 (validator existe)
**Visual:** false

---

## O que esta fase entrega

**O tracer bullet do feature inteiro.** Migra `agents/security-auditor.md` para emitir JSON contrato v1 com `kind: audit`. Cria fixture `agents/__fixtures__/security-auditor/`. Adiciona `parseAndDispatch(output, kindHandlers)` em `skills/lib/subagent-contract.ts`. Teste E2E prova: schema → validator → 1 produtor real → 1 consumer real funcionam juntos. Slice fino ANTES de migrar os outros 12 agentes e 4 orquestradores.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/security-auditor.md` | Modify | Trocar "Formato de Saida" markdown por JSON contrato v1; adicionar `kind: audit` no frontmatter; instruir reasoning bom |
| `agents/__fixtures__/security-auditor/input.md` | Create | Snippet de codigo com vulnerabilidades obvias (MD5, SQL concatenado) — entrada do agente |
| `agents/__fixtures__/security-auditor/expected-output.json` | Create | Output JSON esperado (contrato v1 valido, `kind: audit`, `payload.issues[]` com 2 items, reasoning ~80 chars) |
| `skills/lib/subagent-contract.ts` | Modify | Adicionar `parseAndDispatch(output, kindHandlers)` — valida + roteia por kind |
| `skills/lib/subagent-contract.test.ts` | Modify | Adicionar teste E2E que usa fixture + `parseAndDispatch` com stub de consumer |

---

## Implementacao

### Passo 1: Migrar `agents/security-auditor.md`

Manter todo o conteudo de "O que verificar" (35 conceitos — valor preservado). Substituir apenas "Formato de Saida" e adicionar `kind` no frontmatter.

**Diff antes/depois:**

```markdown
# ANTES (linha 2-5 do frontmatter atual)
---
name: security-auditor
description: "Auditor de seguranca read-only..."
model: sonnet
tools: Read, Grep, Glob
---

# DEPOIS
---
name: security-auditor
description: "Auditor de seguranca read-only..."
model: sonnet
tools: Read, Grep, Glob
kind: audit
contract_version: "1.0"
---
```

**Diff da secao "Formato de Saida" (linhas ~83-114 do arquivo atual):**

```markdown
# ANTES
## Formato de Saida

\`\`\`
## Security Audit Report

**Status:** SECURE / VULNERABILITIES_FOUND / CRITICAL_ISSUES

### Vulnerabilidades Encontradas
| Severidade | Arquivo | Linha | Descricao |
...
\`\`\`

# DEPOIS
## Formato de Saida

Voce DEVE retornar JSON conforme contrato v1 (`docs/design-docs/subagent-contract-v1.md`).
Nada de markdown solto — apenas JSON valido. Sem code fences.

### Shape

\`\`\`json
{
  "contract_version": "1.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete",
  "reasoning": "<1-3 frases focadas em o que voce observou fora do schema esperado. Minimo 50 chars. Exemplo: 'Encontrei MD5 em src/auth.ts:42 e SQL concatenado em src/api.ts:15. Notei tambem que .env.example existe mas .env nao esta no .gitignore — fora do schema padrao.'>",
  "payload": {
    "domain_status": "secure | vulnerabilities_found | critical_issues",
    "issues": [
      { "severity": "critical | high | medium | low", "file": "src/...", "line": 42, "description": "MD5 usado para hash de senha" }
    ]
  },
  "human_readable": "<markdown opcional — mantem o relatorio antigo para apresentacao>"
}
\`\`\`

### Regras criticas
- `status` top-level e SEMPRE lifecycle (complete/needs_retry/needs_human/blocked). Enum de dominio (vulnerabilities_found) vai em `payload.domain_status` — NUNCA em `status` top-level. Validator rejeita.
- `reasoning` minimo 20 chars (validator rejeita). Recomendado 50+ (evita warning REASONING_LIKELY_WEAK).
- Nao incluir secrets crus (API_KEY=valor, SECRET=valor) — validator rejeita.
- `severity` enum: critical / high / medium / low.

### Exemplo completo de output

[Inserir aqui o JSON exemplo da fase-02 secao 5.1, COMPLETO. LLM copia o shape.]
```

### Passo 2: Criar fixture `agents/__fixtures__/security-auditor/`

```bash
mkdir -p agents/__fixtures__/security-auditor
```

**`input.md`** — entrada do agente (codigo com vulnerabilidades obvias):

```markdown
# Input para security-auditor

Audite o seguinte snippet:

\`\`\`typescript
// src/auth.ts
import crypto from 'crypto'

export function hashPassword(pw: string): string {
  return crypto.createHash('md5').update(pw).digest('hex')  // linha 5
}
\`\`\`

\`\`\`typescript
// src/api.ts
export async function getUser(id: string) {
  const sql = `SELECT * FROM users WHERE id = ${id}`  // linha 3
  return db.query(sql)
}
\`\`\`
```

**`expected-output.json`** — output esperado (contrato v1 valido):

```json
{
  "contract_version": "1.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Encontrei MD5 usado para hash de senha em src/auth.ts:5 (algoritmo quebrado, criticamente inseguro) e SQL concatenado manualmente em src/api.ts:3 (injection). Ambos sao padroes claros documentados, sem nada fora do schema esperado.",
  "payload": {
    "domain_status": "critical_issues",
    "issues": [
      {
        "severity": "critical",
        "file": "src/auth.ts",
        "line": 5,
        "description": "MD5 usado para hash de senha — substituir por bcrypt/Argon2"
      },
      {
        "severity": "high",
        "file": "src/api.ts",
        "line": 3,
        "description": "SQL concatenado manualmente — usar prepared statement / parametrized query"
      }
    ]
  }
}
```

### Passo 3: Adicionar `parseAndDispatch` em `skills/lib/subagent-contract.ts`

Append no final do arquivo da fase-04:

```typescript
// 2026-05-14 (Luiz/dev): parseAndDispatch — handler generico por kind. PRD §Solucao "orquestrador escolhe handler por kind".
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
```

### Passo 4: Teste E2E em `subagent-contract.test.ts`

Append no final do arquivo de teste da fase-04:

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseAndDispatch, type AuditContract } from './subagent-contract'

test('E2E tracer bullet: security-auditor fixture → parseAndDispatch → consumer reads payload.issues', async () => {
  // 1. Carrega fixture (simula output real do security-auditor)
  const fixturePath = resolve(__dirname, '../../agents/__fixtures__/security-auditor/expected-output.json')
  const rawOutput = readFileSync(fixturePath, 'utf8')

  // 2. Consumer stub captura o que recebeu (sem regex, sem parsing custom)
  let captured: AuditContract | null = null
  const handlers = {
    audit: (contract: AuditContract) => {
      captured = contract
    },
  }

  // 3. parseAndDispatch valida + roteia
  const result = await parseAndDispatch(rawOutput, handlers)

  // 4. Asserts
  expect(result.validation.valid).toBe(true)
  expect(result.validation.errors).toEqual([])
  expect(result.dispatched).toBe(true)
  expect(result.handlerKind).toBe('audit')
  expect(captured).not.toBeNull()
  expect(captured!.agent).toBe('security-auditor')
  expect(captured!.kind).toBe('audit')
  expect(captured!.status).toBe('complete')
  expect(captured!.reasoning.length).toBeGreaterThanOrEqual(50)  // sem warning
  expect(captured!.payload.issues).toHaveLength(2)
  expect(captured!.payload.issues[0].severity).toBe('critical')
  expect(captured!.payload.issues[0].file).toBe('src/auth.ts')
  expect(captured!.payload.issues[1].severity).toBe('high')
})

test('parseAndDispatch reports dispatched=false when no handler matches kind', async () => {
  const rawOutput = readFileSync(
    resolve(__dirname, '../../agents/__fixtures__/security-auditor/expected-output.json'),
    'utf8'
  )
  const result = await parseAndDispatch(rawOutput, {})  // sem handler
  expect(result.validation.valid).toBe(true)
  expect(result.dispatched).toBe(false)
  expect(result.handlerKind).toBe('audit')
})
```

### Passo 5: Validar o ciclo completo

```bash
# 1. Schema valida o expected-output.json da fixture
bun -e "
const Ajv = require('ajv');
const schema = require('./agents/_contract/v1.schema.json');
const out = require('./agents/__fixtures__/security-auditor/expected-output.json');
const ajv = new Ajv({ allErrors: true });
console.log(ajv.validate(schema, out) ? 'SCHEMA OK' : ajv.errors);
"

# 2. Validator TS aceita o expected-output.json
bun -e "
const { parseContract } = require('./skills/lib/subagent-contract');
const raw = require('fs').readFileSync('./agents/__fixtures__/security-auditor/expected-output.json','utf8');
const r = parseContract(raw);
console.log('valid:', r.valid, 'errors:', r.errors, 'warnings:', r.warnings);
"

# 3. Teste E2E passa
bun test skills/lib/subagent-contract.test.ts -t "E2E tracer bullet"
```

---

## Gotchas

- **G1 do plano (LLM malformed):** O `expected-output.json` da fixture e JSON limpo (sem code fence). Em producao, o LLM PODE envolver em ` ```json `. `parseAndDispatch` chama `parseLooseJSON` da fase-04 que ja strip — testado na fase-04. Nao precisa testar de novo aqui.
- **G2 do plano (lifecycle vs domain):** `expected-output.json` modela o uso correto — `status: "complete"` + `payload.domain_status: "critical_issues"`. Prompt do security-auditor (Passo 1) explicita a regra com "NUNCA" maiusculo.
- **G3 do plano (reasoning bom):** Reasoning da fixture tem ~210 chars — passa o threshold com folga e modela uso bom (menciona algo "fora do schema" mesmo que sutil — "ambos sao padroes claros documentados").
- **G6 do plano (oneOf):** Schema discriminador funciona via `kind: { const: "audit" }` na variante. Se algum autor de subagente futuro errar o `kind`, validator retorna `PAYLOAD_SCHEMA_MISMATCH` e nao `INVALID_KIND` — diferenca confunde. Documentado na fase-02 secao 7.
- **Local:** Type narrowing manual em `parseAndDispatch` (Passo 3 final). TS nao infere `contract.kind === 'audit'` -> `contract is AuditContract` automaticamente com generics no map. O bloco `if/else if` resolve. Alternativa (discriminated union switch) tambem funcionaria — escolhemos `if` para alinhar com CLAUDE.md "hash maps sobre switch-case".
- **Local:** `import.meta.dirname` nao funciona em Bun test antigo. Usar `__dirname` (CommonJS-style) ou `new URL(...)` — checar versao.

---

## Verificacao

### TDD

- [ ] **RED:** Escrever teste E2E ANTES de migrar o prompt do security-auditor; rodar — falha por fixture nao existir
  - Comando: `bun test skills/lib/subagent-contract.test.ts -t "E2E tracer bullet"`
  - Resultado esperado: `ENOENT: no such file or directory` em `expected-output.json`

- [ ] **GREEN:** Criar fixture com `expected-output.json` valido + implementar `parseAndDispatch`; teste passa
  - Comando: `bun test skills/lib/subagent-contract.test.ts -t "E2E tracer bullet"`
  - Resultado esperado: `1 pass, 0 fail`

### Checklist

- [ ] `agents/security-auditor.md` frontmatter contem `kind: audit` e `contract_version: "1.0"`
- [ ] `agents/security-auditor.md` secao "Formato de Saida" instrui emissao de JSON contrato v1 (nao markdown table)
- [ ] Prompt menciona explicitamente: `status` top-level e lifecycle, domain enum vai em `payload.domain_status`
- [ ] Prompt menciona threshold de reasoning (>=50 chars recomendado)
- [ ] Prompt menciona regra de secrets (nao incluir crus)
- [ ] `agents/__fixtures__/security-auditor/input.md` criado com snippet de codigo com 2 vulnerabilidades obvias (MD5 + SQL)
- [ ] `agents/__fixtures__/security-auditor/expected-output.json` criado e e JSON valido
- [ ] `expected-output.json` **valida contra schema** (`bun run` do Passo 5 retorna SCHEMA OK)
- [ ] `expected-output.json` **passa pelo validator TS** (`parseContract` retorna `valid: true`, sem warnings)
- [ ] `expected-output.json` tem `reasoning` >=50 chars (sem warning)
- [ ] `expected-output.json` tem `payload.issues` com exatamente 2 items
- [ ] `skills/lib/subagent-contract.ts` exporta `parseAndDispatch`, `KindHandlers`, `DispatchResult`
- [ ] `parseAndDispatch` retorna `{ validation, dispatched, handlerKind }` tipado
- [ ] Teste E2E em `subagent-contract.test.ts` carrega fixture, invoca `parseAndDispatch`, asserta que consumer recebeu `payload.issues` com 2 items
- [ ] Teste secundario E2E: `parseAndDispatch({})` retorna `dispatched: false` com `handlerKind: 'audit'`
- [ ] `bun test skills/lib/subagent-contract.test.ts` retorna `11 pass, 0 fail` (9 da fase-04 + 2 novos)
- [ ] `bun run lint` limpo
- [ ] `bun run harness:validate` passa (se ja checa frontmatter de agents)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/lib/subagent-contract.test.ts` retorna `11 pass, 0 fail`
- `test -f agents/__fixtures__/security-auditor/expected-output.json` retorna 0
- `bun -e "const s=require('./agents/_contract/v1.schema.json');const o=require('./agents/__fixtures__/security-auditor/expected-output.json');const Ajv=require('ajv');console.log(new Ajv().validate(s,o));"` imprime `true`
- `grep -q "kind: audit" agents/security-auditor.md` retorna 0
- `grep -q "contract_version" agents/security-auditor.md` retorna 0

**Por humano:**
- Revisor le os 2 testes E2E e confirma: "security-auditor emite contrato v1; consumer stub leu `payload.issues[]` sem regex; o ciclo schema → validator → produtor → consumer funciona ponta a ponta"
- Revisor consegue prever que migrar os outros 12 auditores seguira **o mesmo padrao mecanico** (substitui Formato de Saida + adiciona frontmatter + cria fixture) — i.e., o tracer bullet validou o caminho de migracao em escala (Plano 02 e 03 podem comecar)

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
