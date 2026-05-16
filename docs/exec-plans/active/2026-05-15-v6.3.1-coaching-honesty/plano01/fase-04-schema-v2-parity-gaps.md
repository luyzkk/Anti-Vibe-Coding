<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: Schema v2 + parity-gaps-writer migration

**Plano:** 01 — Honesty & Wire-up Core
**Sizing:** 2h
**Depende de:** fase-03 (writer e script já consomem shape rico; agora schema reflete isso)
**Visual:** false

---

## O que esta fase entrega

`discovery/_schemas/parity-gaps-v2.schema.json` valida o runtime real (shapes ricos em `mcps`, `builtin_tools`, `subagents`). `parity-gaps-writer.ts` escreve `schema_version: '2.0'`. v1 schema permanece como referência histórica até v6.4 com header de deprecation — RF-MH-04 do PRD v6.3.1, CA-06 + CA-13.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `discovery/_schemas/parity-gaps-v2.schema.json` | Create | Schema v2 com objetos ricos em 3 campos drifted (`mcps`, `builtin_tools`, `subagents`) |
| `discovery/_schemas/parity-gaps-v1.schema.json` | Modify | Adicionar header `description` com nota de deprecation referenciando v2 |
| `skills/parity-audit/lib/parity-gaps-writer.ts` | Modify | Tipo `ParityGapsOutput.schema_version` muda de `'1.0'` para `'2.0'`. Função `computeParityGaps` escreve `'2.0'` |
| `tests/unit/parity-gaps-schema-v2.test.ts` | Create | 2 testes RED→GREEN: writer output valida contra v2; v1 fixture deprecated não-breaking |
| `tests/fixtures/parity-gaps-v1-legacy.json` | Create | Fixture v1 antigo (shape `mcps: string[]`) para teste de regressão CA-13 |

---

## Implementacao

### Passo 1 — Criar `discovery/_schemas/parity-gaps-v2.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "parity-gaps-v2",
  "title": "ParityGaps v2",
  "description": "v2 alinha schema ao runtime (v6.3.1 RF-MH-04). v1 deprecated — remover em v6.4. Mudanças vs. v1: mcps/builtin_tools/subagents passam de string[] para objetos ricos refletindo skills/lib/tool-registry-inspector.ts.",
  "type": "object",
  "required": ["gaps", "tool_registry_snapshot", "generated_at", "schema_version"],
  "properties": {
    "gaps": {
      "type": "array",
      "description": "Lista de gaps ranqueados por severity (critical > important > nice).",
      "items": {
        "type": "object",
        "required": ["gap_id", "task_type", "missing_capability", "severity", "suggestion"],
        "properties": {
          "gap_id": { "type": "string" },
          "task_type": { "type": "string" },
          "missing_capability": { "type": "string" },
          "severity": {
            "type": "string",
            "enum": ["critical", "important", "nice"]
          },
          "suggestion": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "tool_registry_snapshot": {
      "type": "object",
      "required": ["mcps", "builtin_tools", "subagents", "generated_at", "source"],
      "properties": {
        "mcps": {
          "type": "array",
          "description": "MCPs conectados, com lista de tools expostas. Espelha MCPDescriptor em tool-registry-inspector.ts:11.",
          "items": {
            "type": "object",
            "required": ["name", "tools"],
            "properties": {
              "name": { "type": "string" },
              "tools": {
                "type": "array",
                "items": { "type": "string" }
              }
            },
            "additionalProperties": false
          }
        },
        "builtin_tools": {
          "type": "array",
          "description": "Tools nativas do agente. Objeto envelope permite extensão futura (versão, scope) sem outro bump. Espelha BuiltinToolDescriptor em tool-registry-inspector.ts:15.",
          "items": {
            "type": "object",
            "required": ["name"],
            "properties": {
              "name": { "type": "string" }
            },
            "additionalProperties": false
          }
        },
        "subagents": {
          "type": "array",
          "description": "Skills/subagentes disponíveis, com description e allowed_tools. Espelha SubagentDescriptor em tool-registry-inspector.ts:20.",
          "items": {
            "type": "object",
            "required": ["name", "description", "allowed_tools"],
            "properties": {
              "name": { "type": "string" },
              "description": { "type": "string" },
              "allowed_tools": {
                "type": "array",
                "items": { "type": "string" }
              }
            },
            "additionalProperties": false
          }
        },
        "generated_at": {
          "type": "string",
          "format": "date-time"
        },
        "source": {
          "type": "string",
          "enum": ["manifest", "partial"]
        }
      },
      "additionalProperties": false
    },
    "generated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp de quando o arquivo foi gerado."
    },
    "schema_version": {
      "type": "string",
      "const": "2.0",
      "description": "Versão do schema. v2 introduz objetos ricos nos 3 campos drifted (v6.3.1)."
    },
    "task_type_audited": {
      "type": ["string", "null"],
      "description": "task_type passado ao audit() ou null (audita ruleset completo). Campo opcional aditivo vs. v1."
    }
  },
  "additionalProperties": false
}
```

### Passo 2 — Adicionar nota de deprecation em `parity-gaps-v1.schema.json`

Editar o campo `description` (linha 5 atual):

```json
{
  "$id": "parity-gaps-v1",
  "title": "ParityGaps (DEPRECATED)",
  "description": "DEPRECATED em v6.3.1 — use parity-gaps-v2 (./parity-gaps-v2.schema.json). v1 permanece como referência histórica até v6.4 (D5 do PRD v6.3.1). Shapes string[] em mcps/builtin_tools/subagents não refletem o runtime — bug fechado em v2.",
  ...
}
```

Resto do v1 intacto (não quebrar fixtures que referenciam `$id: parity-gaps-v1`).

### Passo 3 — Migrar `parity-gaps-writer.ts` para v2

Substituir tipo (linha 21 atual: `schema_version: '1.0'`):

```typescript
// 2026-05-15 (Luiz/dev): schema bump v1→v2 — alinha runtime com schema (D4 do PRD v6.3.1).
// parity-gaps.json é gitignored (D8 v6.3.0); sem consumidor externo persistido, bump é livre.
export type ParityGapsOutput = {
  gaps: ParityGap[]
  tool_registry_snapshot: ToolRegistrySnapshot
  generated_at: string
  schema_version: '2.0'
}
```

E em `computeParityGaps` (linha 47 atual: `schema_version: '1.0'`):

```typescript
return {
  gaps,
  tool_registry_snapshot: snapshot,
  generated_at: new Date().toISOString(),
  schema_version: '2.0',
}
```

### Passo 4 — Fixture v1 legacy para teste de regressão

**`tests/fixtures/parity-gaps-v1-legacy.json`:**
```json
{
  "gaps": [],
  "tool_registry_snapshot": {
    "mcps": ["playwright"],
    "builtin_tools": ["Bash", "Read"],
    "subagents": ["security-auditor"]
  },
  "generated_at": "2026-05-13T10:00:00.000Z",
  "schema_version": "1.0"
}
```

Shape antigo (`mcps: string[]`) para confirmar que v1 schema ainda valida-o (deprecação não é remoção).

### Passo 5 — Testes em `tests/unit/parity-gaps-schema-v2.test.ts`

```typescript
// 2026-05-15 (Luiz/dev): RED→GREEN RF-MH-04 (CA-06 + CA-13 do PRD v6.3.1)
import { describe, expect, test } from 'bun:test'
import { computeParityGaps } from '../../skills/parity-audit/lib/parity-gaps-writer'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SCHEMA_V2_PATH = path.join(
  import.meta.dir, '..', '..',
  'discovery', '_schemas', 'parity-gaps-v2.schema.json',
)
const SCHEMA_V1_PATH = path.join(
  import.meta.dir, '..', '..',
  'discovery', '_schemas', 'parity-gaps-v1.schema.json',
)
const V1_FIXTURE = path.join(
  import.meta.dir, '..', 'fixtures', 'parity-gaps-v1-legacy.json',
)

// 2026-05-15 (Luiz/dev): assert estrutural sem ajv — match shapes top-level + tipos campo a campo.
// PRD aceita "match estrutural via parse + assert" como suficiente (CA-05 nota explícita).
function assertMatchesV2(output: unknown, schema: { properties: Record<string, unknown>, required: string[] }): void {
  expect(typeof output).toBe('object')
  const obj = output as Record<string, unknown>
  for (const req of schema.required) {
    expect(Object.prototype.hasOwnProperty.call(obj, req)).toBe(true)
  }
  expect(obj['schema_version']).toBe('2.0')
  const snap = obj['tool_registry_snapshot'] as Record<string, unknown>
  expect(Array.isArray(snap['mcps'])).toBe(true)
  for (const m of snap['mcps'] as unknown[]) {
    const mcp = m as Record<string, unknown>
    expect(typeof mcp['name']).toBe('string')
    expect(Array.isArray(mcp['tools'])).toBe(true)
  }
  expect(Array.isArray(snap['subagents'])).toBe(true)
  for (const s of snap['subagents'] as unknown[]) {
    const sub = s as Record<string, unknown>
    expect(typeof sub['name']).toBe('string')
    expect(typeof sub['description']).toBe('string')
    expect(Array.isArray(sub['allowed_tools'])).toBe(true)
  }
}

describe('parity-gaps schema v2', () => {
  test('writer output matches v2 schema (CA-06)', async () => {
    const schema = JSON.parse(await readFile(SCHEMA_V2_PATH, 'utf-8'))
    const output = computeParityGaps(
      {
        mcps: [{ name: 'playwright', tools: ['browser_navigate'] }],
        builtin_tools: [{ name: 'Bash' }],
        subagents: [{ name: 'security-auditor', description: 'Auditor', allowed_tools: ['Read', 'Grep'] }],
        generated_at: new Date().toISOString(),
        source: 'manifest',
      },
      null,
    )
    assertMatchesV2(output, schema)
  })

  test('v1 fixture remains valid against v1 schema (CA-13 regression)', async () => {
    const schemaV1 = JSON.parse(await readFile(SCHEMA_V1_PATH, 'utf-8'))
    const fixture = JSON.parse(await readFile(V1_FIXTURE, 'utf-8'))
    // 2026-05-15 (Luiz/dev): v1 deprecated mas não-breaking — fixture antigo permanece
    // estruturalmente válido contra v1 schema (D5 do PRD v6.3.1). v1 sai em v6.4.
    expect(fixture.schema_version).toBe('1.0')
    expect(schemaV1.title).toContain('DEPRECATED') // header atualizado no Passo 2
    expect(Array.isArray(fixture.tool_registry_snapshot.mcps)).toBe(true)
    expect(typeof fixture.tool_registry_snapshot.mcps[0]).toBe('string')
  })
})
```

---

## Gotchas

- **G4 do plano:** `discovery/parity-gaps.json` é gitignored — bump v1→v2 não afeta projetos cliente (regen via `/init --refresh`). Mas v1 schema PERMANECE em disco até v6.4 (D5 do PRD).
- **Local — Sem `ajv`:** PRD CA-05 e CA-06 aceitam "match estrutural via parse + assert" como validação. Adicionar `ajv` é opcional (devDep). Recomendado pular em v6.3.1 e adicionar em v6.4 se múltiplos schemas v2/v3 emergirem.
- **Local — Tipos TS sincronizados:** `ParityGapsOutput.schema_version` precisa ser `'2.0'` literal (não `string`). Sem isso, o compilador permite valores arbitrários e o invariante quebra silenciosamente.
- **Local — Aditivo `task_type_audited`:** v2 adiciona campo opcional em metadata. Não é obrigatório no writer atual (v6.3.1) — `computeParityGaps` pode opcionalmente popular se task_type passado. Documentar para Plano 02 fase-05 (consumidor que terá contexto).
- **Local — v1 fixture path:** se já houver fixtures antigos no repo gerando regressão, o teste CA-13 catches. Caso contrário, fixture novo do Passo 4 serve como canário.

---

## Verificacao

### TDD

- [ ] **RED:** 2 testes escritos antes do schema v2 existir e do writer ser migrado. `parity-gaps-v2.schema.json` ausente → primeiro teste falha por `ENOENT`. Após criar schema vazio `{}`, falha por `properties` undefined.
  - Comando: `bun run test -- --test-name-pattern "parity-gaps schema v2"`
  - Resultado esperado: `2 fail, 0 pass` (assertion errors)

- [ ] **GREEN:** Após criar schema v2 completo + migrar writer + atualizar header v1, ambos passam.
  - Comando: `bun run test -- --test-name-pattern "parity-gaps schema v2"`
  - Resultado esperado: `2 pass, 0 fail`

### Checklist

- [ ] `bun run typecheck` limpo (literal `'2.0'` aceito pelo tipo)
- [ ] `bun run parity:audit` (depende de fase-03) escreve `discovery/parity-gaps.json` com `schema_version: '2.0'`
- [ ] Inspeção manual: `cat discovery/parity-gaps.json | jq .tool_registry_snapshot.mcps` mostra array de objetos (não strings)
- [ ] `discovery/_schemas/parity-gaps-v1.schema.json` description começa com `DEPRECATED`
- [ ] `discovery/_schemas/parity-gaps-v2.schema.json` tem `$id: parity-gaps-v2` e `schema_version.const: "2.0"`
- [ ] `bun run harness:validate` não regride
- [ ] Smoke contra v6.3.0 fixtures (se existirem): nenhum teste antigo quebra (CA-13)

---

## Criterio de Aceite

Mapeia para **CA-06** + **CA-13** do PRD v6.3.1.

**Por maquina:**
- `bun run test -- --test-name-pattern "parity-gaps schema v2"` → `2 pass, 0 fail`
- `bun run parity:audit` (depende de fase-03) → output JSON valida contra v2 (objects in `mcps`, `subagents`, `builtin_tools`)
- `grep -l "DEPRECATED" discovery/_schemas/parity-gaps-v1.schema.json` retorna match (header atualizado)

**Por humano:**
- N/A (sem UI).

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
