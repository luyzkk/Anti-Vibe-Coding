<!--
Princípio universal #5 — Comment Provenance.
JSON Schema nao aceita comentarios em runtime — provenance vai no campo `description`
do schema raiz e nas decisoes do ADR-0002.
-->

# Fase 03: JSON Schema do Contrato v1

**Plano:** 01 — Fundacao do Contrato
**Sizing:** 1h
**Depende de:** fase-02 (doc canonico define o que o schema implementa)
**Visual:** false

---

## O que esta fase entrega

`agents/_contract/v1.schema.json` — JSON Schema draft-07 com `oneOf` por `kind` (PRD §Decisoes #5, G6). Schema valida shape completo: campos obrigatorios, enum de status lifecycle, payload por kind, threshold de reasoning, contract_version literal.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/_contract/v1.schema.json` | Create | JSON Schema do contrato v1 |
| `agents/_contract/README.md` | Create | Mini-readme explicando o que mora nesta pasta |

---

## Implementacao

### Passo 1: Criar pasta e README

```bash
mkdir -p agents/_contract
```

`agents/_contract/README.md`:

```markdown
# agents/_contract/

Schemas canonicos do contrato de subagentes.

- `v1.schema.json` — JSON Schema draft-07 do contrato v1 (ADR-0002).
- Versoes futuras (v2, v3) adicionam novos arquivos; v1 fica imutavel.

Para spec completa em prosa: `docs/design-docs/subagent-contract-v1.md`.
Para racional de design: `docs/design-docs/ADR-0002-subagent-contract.md`.
```

### Passo 2: Schema raiz com `oneOf` por kind (G6)

Discriminator em `kind`. Cada variante tem `kind` como `const` + payload shape proprio.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "anti-vibe-coding/agents/_contract/v1.schema.json",
  "title": "Subagent Contract v1",
  "description": "Canonical output shape for Anti-Vibe Coding subagents. See docs/design-docs/subagent-contract-v1.md. ADR-0002.",
  "type": "object",
  "required": ["contract_version", "agent", "kind", "status", "reasoning", "payload"],
  "properties": {
    "contract_version": {
      "type": "string",
      "const": "1.0",
      "description": "Literal fixo em v1 (PRD §Decisoes #7)."
    },
    "agent": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "Nome do subagente, igual ao filename sem .md."
    },
    "kind": {
      "type": "string",
      "enum": ["audit", "mutation", "proposal", "verification"]
    },
    "status": {
      "type": "string",
      "enum": ["complete", "needs_retry", "needs_human", "blocked"],
      "description": "Lifecycle padronizado. Dominio fica em payload.domain_status (PRD §Decisoes #2)."
    },
    "reasoning": {
      "type": "string",
      "minLength": 20,
      "description": "Prosa livre. Minimo 20 chars (rejeita). 20-49 chars emite warning REASONING_LIKELY_WEAK no validator (nao no schema)."
    },
    "payload": {
      "type": "object"
    },
    "human_readable": {
      "type": "string",
      "description": "Markdown opcional para apresentacao ao operador."
    },
    "metadata": {
      "type": "object",
      "properties": {
        "run_id": { "type": "string" },
        "duration_ms": { "type": "integer", "minimum": 0 },
        "model": { "type": "string" },
        "cost_tokens": { "type": "integer", "minimum": 0 }
      }
    }
  },
  "oneOf": [
    { "$ref": "#/definitions/auditVariant" },
    { "$ref": "#/definitions/verificationVariant" },
    { "$ref": "#/definitions/proposalVariant" },
    { "$ref": "#/definitions/mutationVariant" }
  ],
  "definitions": {
    "auditVariant": {
      "properties": {
        "kind": { "const": "audit" },
        "payload": {
          "type": "object",
          "required": ["issues"],
          "properties": {
            "domain_status": { "type": "string" },
            "issues": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["severity", "description"],
                "properties": {
                  "severity": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
                  "file": { "type": "string" },
                  "line": { "type": "integer", "minimum": 1 },
                  "description": { "type": "string", "minLength": 1 }
                }
              }
            }
          }
        }
      }
    },
    "verificationVariant": {
      "properties": {
        "kind": { "const": "verification" },
        "payload": {
          "type": "object",
          "required": ["checks"],
          "properties": {
            "domain_status": { "type": "string" },
            "checks": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "status"],
                "properties": {
                  "name": { "type": "string", "minLength": 1 },
                  "status": { "type": "string", "enum": ["pass", "warn", "fail", "unable_to_verify"] },
                  "detail": { "type": "string" }
                }
              }
            },
            "issues": { "type": "array" },
            "suggestions": { "type": "array" }
          }
        }
      }
    },
    "proposalVariant": {
      "properties": {
        "kind": { "const": "proposal" },
        "payload": {
          "type": "object",
          "required": ["proposal_summary"],
          "properties": {
            "proposal_summary": { "type": "string", "minLength": 1 },
            "options": { "type": "array" },
            "recommendation": { "type": "string" }
          }
        }
      }
    },
    "mutationVariant": {
      "properties": {
        "kind": { "const": "mutation" },
        "payload": {
          "type": "object",
          "description": "STUB em v1 — aceita qualquer shape. Spec real em v6.2 (PRD §Won't Have)."
        }
      }
    }
  }
}
```

### Passo 3: Validar schema contra os 4 exemplos da fase-02

Os 4 exemplos JSON da secao 5 do doc canonico **devem validar** contra este schema. Rodar validacao manual:

```bash
# Opcao A: ajv-cli (se disponivel)
bunx ajv-cli validate -s agents/_contract/v1.schema.json -d <(echo '{...exemplo audit...}')

# Opcao B: bun inline
bun -e "
const Ajv = require('ajv');
const schema = require('./agents/_contract/v1.schema.json');
const example = { /* cole exemplo da fase-02 secao 5.1 */ };
const ajv = new Ajv({ allErrors: true });
const valid = ajv.validate(schema, example);
console.log(valid ? 'OK' : ajv.errors);
"
```

Se algum exemplo nao valida, ajustar **schema OU exemplo** (qual estiver errado) ate convergir.

### Passo 4: Validar rejeicao dos casos negativos

```bash
# Caso 1: status com enum de dominio (CA-03)
echo '{"contract_version":"1.0","agent":"x","kind":"audit","status":"VULNERABILITIES_FOUND","reasoning":"texto suficientemente longo aqui ok","payload":{"issues":[]}}' | bunx ajv-cli validate -s agents/_contract/v1.schema.json -d /dev/stdin
# Esperado: invalid (status nao esta no enum)

# Caso 2: reasoning <20 chars (CA-02)
echo '{"contract_version":"1.0","agent":"x","kind":"audit","status":"complete","reasoning":"curto","payload":{"issues":[]}}' | bunx ajv-cli validate -s agents/_contract/v1.schema.json -d /dev/stdin
# Esperado: invalid (minLength 20)

# Caso 3: contract_version errado (G5)
echo '{"contract_version":"2.0","agent":"x","kind":"audit","status":"complete","reasoning":"texto suficientemente longo aqui ok","payload":{"issues":[]}}' | bunx ajv-cli validate -s agents/_contract/v1.schema.json -d /dev/stdin
# Esperado: invalid (const violado)

# Caso 4: kind audit sem issues[]
echo '{"contract_version":"1.0","agent":"x","kind":"audit","status":"complete","reasoning":"texto suficientemente longo aqui ok","payload":{}}' | bunx ajv-cli validate -s agents/_contract/v1.schema.json -d /dev/stdin
# Esperado: invalid (issues obrigatorio em audit variant)
```

---

## Gotchas

- **G2 do plano (status lifecycle vs domain):** Schema rejeita enum de dominio em `status` top-level via `enum` lifecycle. Validator (fase-04) ainda precisa de mensagem custom `INVALID_LIFECYCLE_STATUS` — o erro do ajv generico nao basta.
- **G5 do plano (contract_version literal):** Usar `const: "1.0"` nao `enum: ["1.0"]`. Mensagem de erro mais clara, mais facil estender em v2.
- **G6 do plano (oneOf estrito):** Sem `kind` como `const` em cada variante, o ajv tenta validar contra todas e da erro confuso. Cada variante DEVE ter `kind: { const: "audit" }` (ou correspondente) para discriminador funcionar.
- **Local:** Mutation variant tem payload livre (stub v1). Isso e **intencional** — PRD §Won't Have. Nao apertar agora.
- **Local:** `pattern` em `agent` (`^[a-z][a-z0-9-]*$`) casa os filenames atuais (security-auditor, plan-verifier, etc). Se alguem usar underscore, schema rejeita — alinhado com convencao do repo.

---

## Verificacao

### TDD

- [ ] **RED:** Antes de criar schema, escrever um teste em `skills/lib/subagent-contract.test.ts` (esqueleto) que tenta carregar `agents/_contract/v1.schema.json` e falha por arquivo nao existir
  - Comando: `bun test skills/lib/subagent-contract.test.ts`
  - Resultado esperado: erro `ENOENT` no `require`

- [ ] **GREEN:** Criar `agents/_contract/v1.schema.json` com shape do Passo 2; teste passa por arquivo existir e ser JSON valido
  - Comando: `bun test skills/lib/subagent-contract.test.ts`
  - Resultado esperado: 1 passed

(Os testes de validacao real ficam na fase-04 quando o validator existir.)

### Checklist

- [ ] Arquivo `agents/_contract/v1.schema.json` criado e e JSON valido
- [ ] Arquivo `agents/_contract/README.md` criado apontando para ADR e doc canonica
- [ ] Schema tem **6 campos obrigatorios** no `required`: `contract_version`, `agent`, `kind`, `status`, `reasoning`, `payload`
- [ ] Schema usa `oneOf` com **4 variantes** (audit, verification, proposal, mutation)
- [ ] Cada variante usa `kind: { const: "..." }` para discriminador
- [ ] `audit` variant exige `payload.issues[]`
- [ ] `verification` variant exige `payload.checks[]`
- [ ] `proposal` variant exige `payload.proposal_summary`
- [ ] `mutation` variant tem `payload` sem `required` (stub v1)
- [ ] `status` top-level e enum lifecycle (`complete/needs_retry/needs_human/blocked`)
- [ ] `reasoning` tem `minLength: 20`
- [ ] `contract_version` e `const: "1.0"`
- [ ] **Validacao manual (Passo 3):** Os 4 exemplos da fase-02 validam contra o schema (sem erros)
- [ ] **Validacao manual (Passo 4):** 4 casos negativos sao rejeitados pelo schema com erro
- [ ] `bun run harness:validate` passa (se ja inspeciona `agents/_contract/`)

---

## Criterio de Aceite

**Por maquina:**
- `test -f agents/_contract/v1.schema.json` retorna 0
- `bun -e "JSON.parse(require('fs').readFileSync('agents/_contract/v1.schema.json','utf8'))"` nao lanca erro
- Validacao via ajv: 4 exemplos da fase-02 → todos validos; 4 casos negativos → todos invalidos

**Por humano:**
- Revisor inspeciona schema e identifica imediatamente os 4 variants e seus discriminadores
- Revisor consegue prever (sem rodar) que `status: "PASSED"` sera rejeitado e por que

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->
