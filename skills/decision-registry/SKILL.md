---
name: decision-registry
description: "This skill should be used when the user asks to 'register a decision', 'log an architectural choice', 'add ADR', 'list decisions', 'query past decisions', or wants to track Architecture Decision Records (ADRs) for the project. Manages the project's decision history with alternatives and justifications."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit
argument-hint: "add|list|query [decision or search term]"
---

<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-02 — profile-aware-preface (PRD §RF-SH-05).
// Mesmo pattern de /security (fase-01); per-skill lookup; fallback v6.2 quando profile null.

import { readPrefaceContext } from '../lib/preface-context'
import { DECISION_REGISTRY_PREFACE_BY_PROFILE, DEFAULT_DECISION_REGISTRY_PREFACE } from './lib/decision-registry-prefaces'

const ctx = readPrefaceContext(process.cwd())
const preface = ctx.profile
  ? (DECISION_REGISTRY_PREFACE_BY_PROFILE[ctx.profile] ?? DEFAULT_DECISION_REGISTRY_PREFACE)
  : DEFAULT_DECISION_REGISTRY_PREFACE
```

Se `preface` for não-vazio, prepend ao corpo da skill (inicie sua resposta com o preface e prossiga com a operação normal).
Se vazio (profile null), comportamento v6.2 intacto — sem preface (CA-02).
<!-- profile-aware-preface:end -->

<!-- stale-capabilities-check:start -->
```typescript
// 2026-05-15 (Luiz/dev): wire-up CA-09 v6.3.0 (closed em v6.3.1 RF-SH-02) — non-blocking warning.
// G2 do plano02: NUNCA bloqueia execução — alinhado com stale-detector.ts:8-10.
// G6 do plano02: capabilities.json AUSENTE NÃO emite warning falso (silently null).
// G7 do plano02: shape atual de capabilities.json não tem `storedChecksums` — check direto por age.
// SYNC: logica espelhada em skills/lib/__tests__/stale-warning.test.ts:checkStaleCapabilities.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const __STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h — CA-09 PRD v6.3.1

function __readCapabilitiesGeneratedAt(projectRoot: string): string | null {
  try {
    const raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { generated_at?: unknown }
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  } catch {
    return null
  }
}

const __caps_generated_at = __readCapabilitiesGeneratedAt(process.cwd())
if (__caps_generated_at !== null) {
  const __age = Date.now() - new Date(__caps_generated_at).getTime()
  if (Number.isFinite(__age) && __age > __STALE_THRESHOLD_MS) {
    process.stderr.write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}
```
<!-- stale-capabilities-check:end -->

# Registro de Decisoes Arquiteturais — Anti-Vibe Coding

Gerenciar o registro de decisoes do projeto, mantendo consistencia entre sessoes.

## Comandos

### `add` — Registrar nova decisao
Registrar uma decisao arquitetural com alternativas e justificativa.

### `list` — Listar todas as decisoes
Mostrar todas as decisoes registradas com data e status.

### `query` — Consultar decisao especifica
Buscar decisao por nome ou area.

## Formato de Registro

```markdown
### [Nome da Decisao]: [Opcao Escolhida]
**Data:** YYYY-MM-DD
**Alternativas consideradas:** [opcao A, opcao B, opcao C]
**Justificativa:** [Por que essa opcao foi escolhida para este projeto]
**Risco conhecido:** [Riscos aceitos com essa decisao]
**Reversibilidade:** Reversivel / Irreversivel
```

## Arquivo de Armazenamento

As decisoes sao armazenadas em `.claude/decisions.md` na raiz do projeto.

## Fluxo de Trabalho

### Ao adicionar (`add`):
1. Ler `.claude/decisions.md` (criar se nao existir)
2. Verificar se a decisao ja foi registrada
3. Adicionar no formato correto com data de hoje
4. Informar o desenvolvedor que a decisao foi registrada

### Ao listar (`list`):
1. Ler `.claude/decisions.md`
2. Listar todas as decisoes em formato de tabela resumida:
   | Data | Decisao | Escolha | Reversivel? |

### Ao consultar (`query`):
1. Buscar no `.claude/decisions.md` por termo
2. Mostrar a decisao completa com justificativa

## Fluxo (v6)

```
1. Resolve layout via lib/path-resolver-v6.ts
2. Se layout === 'v6':
     a. lib/adr-writer.ts conta ADR-*.md em docs/design-docs/ para next_id
     b. Cria ADR-NNNN-{slug}.md com frontmatter (id, title, status: active, created)
     c. Secoes: Context, Decision, Alternatives, Consequences
3. Se layout === 'v5' ou 'cru':
     - Appenda em decisions.md raiz (formato legado)
```

## Completion Signal (D33)

Ao finalizar o output principal (add/list/query), a skill emite automaticamente um bloco YAML machine-readable via `console.log`. Orquestradores podem extrair o sinal usando `extractCompletionSignal(output)`.

```typescript
import { renderCompletionSignal } from '../lib/completion-signal'
console.log('\n\n' + renderCompletionSignal({
  skill: 'decision-registry',
  status: 'complete',
  outputs: [/* filePath do ADR ou decisions.md escrito */],
  next_suggested: null,
  blocks_for_user: [],
}))
```

---

## Acao solicitada

$ARGUMENTS
