<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 03: ADR + Doc Canônico

**Plano:** 01 — Fundação Adaptativa
**Sizing:** ~1.5h
**Depende de:** fase-01 (shape do PrefaceContext), fase-02 (schemas JSON)
**Visual:** false

---

## O que esta fase entrega

ADR documentando as 10 decisões arquiteturais do v6.3.0 Adaptive Coaching, mais o doc canônico `adaptive-coaching-framework.md` que serve como migration guide para autores de skill (CA-10: leitura em <30min).

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `docs/design-docs/ADR-0020-adaptive-coaching.md` | CRIAR | ADR com decisões D1–D10 do PRD |
| `docs/design-docs/adaptive-coaching-framework.md` | CRIAR | Doc canônico: shape, uso em skill, schemas, migration guide |

**Verificação de número ADR:** ADRs existentes são `ADR-0001` e `ADR-0002`. Gap intencional até `ADR-0020` — número especificado no PRD.

---

## Implementação

### Passo 1: Criar ADR-0020-adaptive-coaching.md

O ADR segue o formato existente no projeto (ver `ADR-0001-manifest-checksums.md` e `ADR-0002-subagent-contract.md`).

Estrutura do arquivo `docs/design-docs/ADR-0020-adaptive-coaching.md`:

```markdown
# ADR-0020: Adaptive Coaching Framework (v6.3.0)

**Data:** 2026-05-14
**Status:** Aceito
**Autores:** Luiz Felipe (dev)
**PRD:** [Adaptive Coaching v6.3.0](../exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/PRD.md)

---

## Contexto

O plugin Anti-Vibe Coding trata todos os projetos de forma genérica. Skills ignoram o
architecture profile que o detector já produz desde v5.3. A cada invocação, skills
redescobrem o projeto via heurísticas locais. Não há inventário de capabilities do agente
para o projeto ser auditado.

Este ADR registra as decisões arquiteturais que formam o Adaptive Coaching Framework (v6.3.0),
organizado em 3 peças: PrefaceContext helper, capabilities.json, e parity-gaps.json.

---

## Decisões

### D1: profile-aware-preface em bloco marcado em SKILL.md

Skills que consomem o profile adaptativo declaram um bloco explícito chamado
`## Profile-Aware Preface` em seu `SKILL.md`. O bloco define qual lookup table usar e qual
fallback aplicar quando `readPrefaceContext` retornar `profile: null`.

**Alternativa descartada:** injetar o profile via variável de ambiente no runtime — rejeitado
porque cria acoplamento invisível e dificulta testes unitários.

### D2: PrefaceContext shape composto { profile, language, framework, confidence }

O shape é estável e extensível. `language` e `framework` são `null` em v6.3.0 e serão
preenchidos em v6.5/v6.6 sem quebrar chamadores que já consumem o shape. Skills NÃO devem
acessar `archProfile.signals` diretamente — apenas o shape do PrefaceContext.

**Alternativa descartada:** expor `ArchitectureProfile` diretamente — rejeitado porque expõe
campos internos do detector (signals, detectedAt) que skills não precisam e que podem mudar.

### D3: Cobertura nextjs-app-router (AST) + mvc-flat (LLM-fallback) apenas em v6.3.0

AST parser cobre apenas `app/**/route.ts` (nextjs-app-router). mvc-flat usa LLM-fallback
marcado com `source: "llm"`. Os 3 profiles restantes (clean-architecture-ritual,
vertical-slice, unknown-mixed) ficam sem geração de capabilities em v6.3.0.

**Razão:** scope controlado para o primeiro ciclo. v6.4+ estenderá cobertura.

### D4: AST-first + LLM-fallback marcado com source + confidence

Toda entrada em `capabilities.json` declara `source: "ast" | "llm"`. Entradas `llm` têm
`confidence < 1.0` por definição. Auditores e skills devem priorizar entradas `ast` e
sinalizar entradas `llm` como "requer revisão humana".

### D5: Skill nova /parity-audit (não extender qa-visual)

`/parity-audit` é skill independente com kind `"audit"`. `qa-visual` é refatorada para
consumir a lib `tool-registry-inspector` sem mudar UX (Plano 03, fase-03). As duas skills
têm contratos distintos: `qa-visual` foca em visual regression, `parity-audit` foca em
capability gaps.

**Alternativa descartada:** extender `qa-visual` com um modo `--parity` — rejeitado porque
mistura responsabilidades e quebra o princípio de skill focada.

### D6: build-time default + stale checksum + warning silencioso

`capabilities.json` é gerado por `/init` (build-time). O stale detector calcula checksum
dos paths-chave (`package.json`, top-level `src/`) e emite warning silencioso (não bloqueante)
quando o checksum diverge do snapshot armazenado em `capabilities.json`.

**Alternativa descartada:** regenerar capabilities.json a cada invocação de skill — rejeitado
por custo de latência e desnecessidade na maioria das invocações.

### D7: discovery/ folder para capabilities + parity-gaps + schemas

Todos os artefatos de discovery vivem em `discovery/` no root do projeto. A subpasta
`discovery/_schemas/` contém os JSON Schemas versionados. Os JSONs de runtime ficam em
`discovery/` diretamente.

### D8: discovery/*.json gitignored por default

Artefatos de runtime (`capabilities.json`, `parity-gaps.json`) são gitignored — são gerados
localmente e podem divergir entre máquinas. Os schemas (`discovery/_schemas/`) são comitados.

### D9: qa-visual migra para tool-registry-inspector sem mudança de UX

A lib `tool-registry-inspector` enumera MCPs, builtin tools e subagents. `qa-visual` passa
a usar essa lib internamente. Usuários não percebem diferença — o comportamento externo é
idêntico ao v6.2.

### D10: checksum em paths-chave (package.json, top-level src/)

O stale detector verifica: `package.json` (dependências), todo arquivo/pasta direto em `src/`
(top-level only, não recursivo), e `routes/` se existir. Essa estratégia é conservadora:
prefere falso-positivo (warning quando não necessário) a falso-negativo (sem warning quando
capabilities estão stale).

---

## Consequências

**Positivas:**
- Skills ficam profile-aware sem duplicar lógica de leitura
- Inventário de capabilities permite parity audit automatizado
- Shape estável do PrefaceContext permite evolução gradual (v6.5/v6.6)

**Negativas / Trade-offs:**
- Cobertura parcial em v6.3.0 (apenas 2 de 5 profiles têm capabilities.json)
- `discovery/*.json` gitignored cria estado local — CI precisa gerar o arquivo antes de usar
- Stale detection via checksum tem custo de IO a cada invocação de skill (mitigado: apenas paths-chave)

---

## Referências

- `skills/lib/preface-context.ts` — implementação do PrefaceContext helper
- `discovery/_schemas/capabilities-v1.schema.json` — schema JSON para capabilities
- `discovery/_schemas/parity-gaps-v1.schema.json` — schema JSON para parity-gaps
- `docs/design-docs/adaptive-coaching-framework.md` — migration guide para autores de skill
- `ADR-0001-manifest-checksums.md` — estratégia de checksums no manifest
- `ADR-0002-subagent-contract.md` — contrato de subagentes
```

### Passo 2: Criar adaptive-coaching-framework.md

O doc canônico é para autores de skill. Deve ser legível em <30min (CA-10). Linguagem técnica e direta.

Estrutura do arquivo `docs/design-docs/adaptive-coaching-framework.md`:

```markdown
# Adaptive Coaching Framework (v6.3.0)

> Migration guide para autores de skill. Leitura estimada: 20min.

---

## 1. PrefaceContext — o shape

Toda skill profile-aware consome `PrefaceContext` via `readPrefaceContext()`:

```typescript
import type { PrefaceContext } from "../lib/preface-context";

type PrefaceContext = {
  profile: ArchitectureProfileName | null  // 'nextjs-app-router' | 'mvc-flat' | etc.
  language: LanguageHint | null            // null em v6.3.0; preenchido em v6.5/v6.6
  framework: FrameworkHint | null          // null em v6.3.0; preenchido em v6.6
  confidence: number                       // 0..100 (0 quando profile é null)
}
```

**Regras invariantes:**
- `profile: null` significa "sem adaptação — usar comportamento genérico"
- `language` e `framework` são sempre `null` em v6.3.0 — não checar esses campos agora
- `confidence` é `0` quando `profile` é `null`

---

## 2. Como usar readPrefaceContext em uma skill

5 linhas de integração:

```typescript
import { readPrefaceContext } from "../lib/preface-context";
import { getRecommendationForProfile } from "../lib/read-architecture-profile";

const ctx = readPrefaceContext(projectRoot);
const advice = getRecommendationForProfile(ctx.profile, ADVICE_TABLE, DEFAULT_ADVICE);
// usar `advice` no output da skill
```

A `readPrefaceContext` nunca lança exceção. Se o manifest não existir ou o feature flag estiver
desabilitado, retorna `{ profile: null, confidence: 0, ... }` e a skill cai no comportamento genérico.

---

## 3. capabilities-v1.schema.json

Schema em `discovery/_schemas/capabilities-v1.schema.json`.

**Campos principais de cada capability:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `kind` | `"route"\|"mutation"\|"job"\|"cli"` | sim | Categoria |
| `path` | `string` | sim | Rota ou identificador |
| `handler` | `string` | sim | Arquivo handler relativo ao root |
| `confidence` | `number 0..1` | sim | Score de detecção |
| `source` | `"ast"\|"llm"` | sim | Método de detecção |
| `method` | `"GET"\|"POST"\|...` | não | HTTP method (apenas routes) |
| `owner_path` | `string` | não | Módulo de domínio responsável |

**Campos raiz:** `capabilities[]`, `coverage_gaps[]`, `generated_at` (ISO 8601), `profile_at_generation`, `schema_version: "1.0"`.

---

## 4. parity-gaps-v1.schema.json

Schema em `discovery/_schemas/parity-gaps-v1.schema.json`.

**Campos principais de cada gap:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `gap_id` | `string` | sim | ID estável (ex: `GAP-001`) |
| `task_type` | `string` | sim | Tarefa que expõe o gap |
| `missing_capability` | `string` | sim | O que falta no agente |
| `severity` | `"critical"\|"important"\|"nice"` | sim | Impacto |
| `suggestion` | `string` | sim | Ação para fechar o gap |

**Campos raiz:** `gaps[]`, `tool_registry_snapshot` (mcps, builtin_tools, subagents), `generated_at`, `schema_version: "1.0"`.

---

## 5. Migration guide para autor de skill (4 passos)

Checklist para tornar uma skill existente profile-aware:

**Passo 1 — Adicionar bloco em SKILL.md**

Inserir após o bloco de telemetria (antes do `## Steps`):

```markdown
## Profile-Aware Preface

Este bloco adapta o output da skill ao architecture profile detectado.
Usa `readPrefaceContext()` de `skills/lib/preface-context.ts`.
Fallback: comportamento genérico quando `profile === null`.
```

**Passo 2 — Importar e chamar readPrefaceContext**

No início da lógica da skill (não dentro de loop):

```typescript
const ctx = readPrefaceContext(projectRoot);
```

**Passo 3 — Definir lookup table com os 5 profiles**

```typescript
const ADVICE: Record<ArchitectureProfileName, string> = {
  "clean-architecture-ritual": "...",
  "mvc-flat": "...",
  "vertical-slice": "...",
  "nextjs-app-router": "...",
  "unknown-mixed": "...",
};
const DEFAULT_ADVICE = "..."; // comportamento genérico v5.2
```

**Passo 4 — Aplicar lookup no output**

```typescript
const advice = getRecommendationForProfile(ctx.profile, ADVICE, DEFAULT_ADVICE);
// usar `advice` no markdown/output gerado
```

---

## 6. Skills que já implementam profile-aware-preface

| Skill | Arquivo SKILL.md | Desde |
|-------|-----------------|-------|
| (nenhuma em v6.3.0 — Plano 04 implementa) | — | v6.4 |

---

## Referências

- `skills/lib/preface-context.ts` — implementação
- `skills/lib/read-architecture-profile.ts` — wrapper de IO (não usar diretamente em skills)
- `docs/design-docs/ADR-0020-adaptive-coaching.md` — decisões arquiteturais
- `discovery/_schemas/` — schemas JSON versionados
```

---

## Gotchas

- Verificar ADRs existentes antes de criar: `ADR-0001` e `ADR-0002` existem. `ADR-0020` é o próximo número especificado no PRD — não usar `ADR-0003`.
- O doc canônico usa code fences com `` ```typescript `` — verificar se o markdown não quebra com fences aninhados (usar indentação ou substituir por code blocks sem fence se necessário).
- CA-10: a seção "Migration guide" deve ser executável em <30min por um dev que nunca viu o projeto. Testar mentalmente: consegue seguir os 4 passos sem contexto adicional?
- O ADR deve referenciar o PRD com path relativo — verificar se o link funciona a partir de `docs/design-docs/`.
- `docs/design-docs/index.md` pode precisar ser atualizado com os dois novos arquivos — verificar se existe.

---

## Verificação

### Checklist

- [ ] `docs/design-docs/ADR-0020-adaptive-coaching.md` criado com decisões D1–D10
- [ ] `docs/design-docs/adaptive-coaching-framework.md` criado (migration guide)
- [ ] Link do ADR para o PRD funciona (path relativo válido)
- [ ] `docs/design-docs/index.md` atualizado com os dois novos arquivos (se o arquivo existir)
- [ ] Doc canônico tem seção "Migration guide" com 4 passos executáveis
- [ ] Doc canônico tem tabela de capabilities-v1 e parity-gaps-v1 campos
- [ ] Nenhum link interno quebrado nos dois arquivos
- [ ] `bun run harness:validate` passa (verifica links e estrutura de `docs/`)

---

## Critério de Aceite

**Por máquina:**
- `bun run harness:validate` retorna sem erros após criação dos dois arquivos

**Por humano (CA-10):**
- Um dev que nunca viu o projeto consegue, em <30min, seguir os 4 passos do migration guide e tornar uma skill fictícia profile-aware

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
