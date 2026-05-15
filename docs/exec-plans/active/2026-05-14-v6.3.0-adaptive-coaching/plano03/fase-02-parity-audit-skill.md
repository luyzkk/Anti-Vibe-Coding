<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): kind: "audit" — alinhado com contrato v6.1.0 §subagent kinds`
-->

# Fase 02: /parity-audit — skill nova produz parity-gaps.json

**Plano:** 03 — /parity-audit + tool-registry-inspector ([README](./README.md))
**Sizing:** ~1.5h
**Depende de:** fase-01 (consome `inspectToolRegistry`)
**Visual:** false

---

## O que esta fase entrega

Skill nova `skills/parity-audit/SKILL.md` (declarativa, `kind: "audit"` conforme contrato v6.1.0 — RF-MH-03) que ao ser invocada: (1) recebe um `task_type` opcional do dev, (2) consome `inspectToolRegistry` para o snapshot, (3) cruza com `gap-rules.ts`, (4) escreve `discovery/parity-gaps.json` ranqueado por severity, (5) apresenta resumo ao dev com top 3 gaps críticos. Atende CA-05 (Stripe MCP gap example) e PRD §Decisão #5 (skill nova, não extender qa-visual).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/parity-audit/SKILL.md` | Create | Frontmatter (`kind: audit`, `user-invocable: true`) + 5 passos declarativos |
| `skills/parity-audit/lib/gap-rules.ts` | Create | Tabela inicial de regras `task_type → required_capability` (3-5 entradas) |
| `skills/parity-audit/lib/parity-gaps-writer.ts` | Create | Função pura `computeParityGaps(snapshot, taskType, rules)` + serialização do output |
| `skills/parity-audit/lib/__tests__/parity-gaps-writer.test.ts` | Create | 3 testes (registry vazio, registry com Stripe, ranqueamento por severity) |

---

## Pre-trabalho

1. **Confirmar shape do schema `parity-gaps-v1.schema.json`** (Plano 01 fase-02): rodar `Glob` por `discovery/_schemas/parity-gaps-v1.schema.json`. Se não existir, registrar em MEMORY.md (`DI-N`) e seguir com validação soft pulada — não bloquear fase.
2. **Confirmar que `tool-registry-inspector.ts` existe e exporta `inspectToolRegistry`** (fase-01). Se ainda não houver, criar import stub temporário e remover antes de mergear.
3. **Verificar `.gitignore`** (Plano 01 fase-02): `discovery/*.json` deve estar listado. Se ausente, registrar warning em MEMORY.md (não criar entry aqui — escopo de Plano 01).
4. **Conferir convenção de SKILL.md no codebase:** ler `skills/grill-me/SKILL.md` (skill user-invocable existente) para alinhar frontmatter + estrutura de passos.

---

## Implementacao

### Passo 1: `gap-rules.ts` — ruleset inicial

```typescript
// 2026-05-14 (Luiz/dev): ruleset mínimo — expansão futura via PRs separados, evita scope creep (PRD §Decisão #5)

export type Severity = 'critical' | 'important' | 'nice'

export type GapRule = {
  gap_id: string                  // ex: 'stripe-mcp'
  task_type: string               // ex: 'payment-debug'
  required_capability: string     // descrição humana do que falta
  detect: (snapshot: import('../../lib/tool-registry-inspector').ToolRegistrySnapshot) => boolean
  severity: Severity
  suggestion: string
}

export const GAP_RULES: GapRule[] = [
  {
    gap_id: 'stripe-mcp',
    task_type: 'payment-debug',
    required_capability: 'Stripe MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('stripe')),
    severity: 'critical',
    suggestion: 'Instalar mcp-stripe ou pular tasks de debug Stripe. PRD CA-05.',
  },
  {
    gap_id: 'playwright-mcp',
    task_type: 'browser-test',
    required_capability: 'Playwright MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('playwright')),
    severity: 'critical',
    suggestion: 'Instalar plugin Playwright MCP (qa-visual depende disso — CA-06).',
  },
  {
    gap_id: 'email-mcp',
    task_type: 'email-send',
    required_capability: 'Email provider MCP (SES, Sendgrid, etc)',
    detect: snap =>
      !snap.mcps.some(m =>
        ['ses', 'sendgrid', 'mailgun', 'resend'].some(p => m.name.toLowerCase().includes(p))
      ),
    severity: 'important',
    suggestion: 'Sem MCP de email, /security não consegue inspecionar templates ou rate limits de envio.',
  },
  {
    gap_id: 'github-mcp',
    task_type: 'pr-review',
    required_capability: 'GitHub MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('github')),
    severity: 'nice',
    suggestion: 'Sem GitHub MCP, /pr-review cai em CLI gh — funciona, mas com mais latência.',
  },
]
```

Notas:
- `detect` é função pura sobre o snapshot — sem I/O. Permite testar regra sem fixture de filesystem.
- 4 regras inicias cobrem 3 severities. Expansão futura via PRs separados (sem scope creep nesta fase).
- `task_type` é livre (string). Não enum fechado — permite consumers passarem qualquer label.

### Passo 2: `parity-gaps-writer.ts` — função pura

```typescript
// 2026-05-14 (Luiz/dev): writer separa cómputo (puro) de escrita (I/O) — testável sem tmpdir

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { GAP_RULES, type GapRule, type Severity } from './gap-rules'
import type { ToolRegistrySnapshot } from '../../lib/tool-registry-inspector'

export type ParityGap = {
  gap_id: string
  task_type: string
  missing_capability: string
  severity: Severity
  suggestion: string
}

export type ParityGapsOutput = {
  gaps: ParityGap[]
  tool_registry_snapshot: ToolRegistrySnapshot
  generated_at: string
  schema_version: '1.0'
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, important: 1, nice: 2 }

export function computeParityGaps(
  snapshot: ToolRegistrySnapshot,
  taskType: string | null,
  rules: GapRule[] = GAP_RULES
): ParityGapsOutput {
  const filtered = taskType ? rules.filter(r => r.task_type === taskType) : rules

  const gaps: ParityGap[] = filtered
    .filter(rule => rule.detect(snapshot))
    .map(rule => ({
      gap_id: rule.gap_id,
      task_type: rule.task_type,
      missing_capability: rule.required_capability,
      severity: rule.severity,
      suggestion: rule.suggestion,
    }))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  return {
    gaps,
    tool_registry_snapshot: snapshot,
    generated_at: new Date().toISOString(),
    schema_version: '1.0',
  }
}

export async function writeParityGaps(output: ParityGapsOutput, projectRoot: string): Promise<string> {
  const discoveryDir = path.join(projectRoot, 'discovery')
  await mkdir(discoveryDir, { recursive: true }).catch(() => {})
  const outPath = path.join(discoveryDir, 'parity-gaps.json')
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf-8')
  return outPath
}
```

Notas:
- `computeParityGaps` é puro — sem I/O. Recebe snapshot pré-coletado.
- `writeParityGaps` faz I/O: cria `discovery/` se ausente (graceful), escreve JSON formatado.
- `schema_version: '1.0'` como string (mesma convenção do Plano 02 fase-01 — JSON Schema espera string).

### Passo 3: SKILL.md declarativa

```markdown
---
name: parity-audit
description: Audita capabilities do agente (MCPs, tools, subagentes) e produz parity-gaps.json com gaps ranqueados por severity. Use quando quiser revisar se o agente tem ferramentas para o task_type que você vai pedir.
kind: audit
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion
argument-hint: "[task_type opcional, ex: payment-debug, browser-test]"
---

<!-- 2026-05-14 (Luiz/dev): kind:"audit" — contrato v6.1.0 (RF-MH-03). Frontmatter NUNCA alterado em runtime. -->

# /parity-audit — Audita capabilities do agente

## Passo 1 — Resolver task_type

Se o usuário passou argumento, use como `task_type`. Caso contrário, pergunte via `AskUserQuestion`:

> "Qual task_type você quer auditar? (deixe vazio para auditar TODAS as regras conhecidas)"

Aceite resposta vazia → `task_type = null` (audita ruleset completo).

## Passo 2 — Snapshot via tool-registry-inspector

Importe `inspectToolRegistry` de `skills/lib/tool-registry-inspector.ts` e chame com `process.cwd()` como `projectRoot`.

Se `snapshot.source === 'partial'`, emita warning ANTES de prosseguir:
> "Tool registry incompleto (manifest ou agents/ ausente). Resultado será best-effort."

## Passo 3 — Cruzar com gap-rules

Importe `computeParityGaps` de `skills/parity-audit/lib/parity-gaps-writer.ts` e chame:
`const output = computeParityGaps(snapshot, taskType)`.

## Passo 4 — Escrever discovery/parity-gaps.json

Chame `writeParityGaps(output, process.cwd())`. O arquivo é gitignored por default (PRD Decisão #8) — confirme que `.gitignore` cobre `discovery/*.json` (Plano 01 fase-02).

## Passo 5 — Apresentar resumo ao dev

Mostre top 3 gaps por severity (critical primeiro):

```
Parity Audit — N gap(s) encontrado(s)

CRITICAL (X):
  - gap_id: ... | missing: ... | suggestion: ...

IMPORTANT (Y):
  - ...

NICE (Z):
  - ...

Output completo: discovery/parity-gaps.json
```

Se 0 gaps: "Nenhum gap detectado para task_type=`<taskType>`. O agente tem todas as capabilities mapeadas no ruleset atual."
```

Notas:
- Sem código TypeScript inline no SKILL.md (esta skill é declarativa — o EXECUTOR-LLM segue os passos chamando as libs via Read+Bash).
- `AskUserQuestion` apenas se `argument-hint` não foi preenchido.
- Mensagem de saída segue o pattern de `/architecture` (PRD §Mecanismo passo 5).

---

## Gotchas

- **G3 do plano:** `discovery/parity-gaps.json` é gitignored (Plano 01 fase-02). Não precisa adicionar entry — apenas escrever no path.
- **G4 do plano:** schema `parity-gaps-v1.schema.json` vem do Plano 01 fase-02. Validação SOFT — se inválido, emitir warning, NUNCA throw.
- **G5 do plano:** `kind: audit` no frontmatter é obrigatório (contrato v6.1.0). Harness do contrato valida — sem isso, skill não é registrada como audit.
- **G7 do plano:** severity é enum fechado `'critical' | 'important' | 'nice'`. Union type em TS garante. Não aceitar outros valores em rules futuras.
- **Local — ruleset mínimo:** 4 regras nesta fase. Não adicionar mais aqui — expansão é PR separado (PRD §Won't Have implícito: "expansão do ruleset não é big-bang").
- **Local — `task_type` é string livre:** não enum. Permite consumers passarem qualquer label (`'payment-debug'`, `'audit-foo-bar'`, etc). Filtragem é por string equality.

---

## Verificacao

### TDD

Comando para rodar: `bun test skills/parity-audit/lib/__tests__/parity-gaps-writer.test.ts`

### Setup do arquivo de teste

```typescript
import { describe, it, expect } from 'bun:test'
import { computeParityGaps } from '../parity-gaps-writer'
import type { ToolRegistrySnapshot } from '../../../lib/tool-registry-inspector'

const emptySnapshot: ToolRegistrySnapshot = {
  mcps: [],
  builtin_tools: [],
  subagents: [],
  generated_at: '2026-05-14T00:00:00.000Z',
  source: 'manifest',
}

const stripeSnapshot: ToolRegistrySnapshot = {
  ...emptySnapshot,
  mcps: [{ name: 'mcp-stripe', tools: ['create_payment_intent'] }],
}
```

### Caso 1: "returns all rules as gaps when registry is empty"

Input: `emptySnapshot`, `taskType: null`.

Assertions:
- `output.gaps.length` === 4 (todas as rules de GAP_RULES)
- Primeiro gap tem `severity: 'critical'`
- Último gap tem `severity: 'nice'`
- `output.schema_version` === `'1.0'`
- `!isNaN(Date.parse(output.generated_at))`

### Caso 2: "returns zero gaps when Stripe MCP is installed and task_type is payment-debug"

Input: `stripeSnapshot`, `taskType: 'payment-debug'`.

Assertions:
- `output.gaps.length` === 0
- `output.tool_registry_snapshot.mcps[0].name` === `'mcp-stripe'` (snapshot incluído no output)

### Caso 3: "sorts gaps by severity rank: critical first, then important, then nice"

Input: snapshot mistura — Stripe instalado mas SEM Playwright/Email/GitHub. `taskType: null`.

```typescript
const partial: ToolRegistrySnapshot = {
  ...emptySnapshot,
  mcps: [{ name: 'mcp-stripe', tools: [] }],
}
```

Assertions:
- `output.gaps.length` === 3 (stripe não aparece)
- `output.gaps[0].severity` === `'critical'` (playwright-mcp)
- `output.gaps[1].severity` === `'important'` (email-mcp)
- `output.gaps[2].severity` === `'nice'` (github-mcp)

### Checklist

- [ ] Os 3 testes acima passam: `bun test skills/parity-audit/lib/__tests__/parity-gaps-writer.test.ts` → `3 pass, 0 fail`
- [ ] `bun run test` global: continua verde
- [ ] Typecheck limpo: `bun run typecheck` (se configurado)
- [ ] Frontmatter de `skills/parity-audit/SKILL.md` contém `kind: audit` e `user-invocable: true`
- [ ] `gap-rules.ts` exporta `Severity` como union type `'critical' | 'important' | 'nice'`
- [ ] `writeParityGaps` cria `discovery/` se ausente sem throw

### Smoke manual

- [ ] Invocar `/anti-vibe-coding:parity-audit payment-debug` no plugin — confirmar criação de `discovery/parity-gaps.json` (gitignored), output contém `gaps`, `tool_registry_snapshot`, `generated_at`, `schema_version`.
- [ ] Se schema `parity-gaps-v1.schema.json` existir (Plano 01 fase-02), validar manual: JSON gerado bate com schema.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/parity-audit/lib/__tests__/parity-gaps-writer.test.ts` retorna `3 pass, 0 fail`.
- Após smoke, `cat discovery/parity-gaps.json | jq '.schema_version'` retorna `"1.0"`.
- `cat discovery/parity-gaps.json | jq '.gaps | map(.severity) | .[0]'` retorna `"critical"` (quando há gaps).

**Por humano:**
- Output JSON contém as 4 chaves: `gaps`, `tool_registry_snapshot`, `generated_at`, `schema_version`.
- Quando `task_type: 'payment-debug'` E projeto SEM Stripe MCP, gap `'stripe-mcp'` aparece com severity `'critical'` (CA-05).

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
