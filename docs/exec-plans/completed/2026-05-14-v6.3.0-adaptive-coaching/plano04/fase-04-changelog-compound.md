<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-15 (Luiz/dev): CHANGELOG v6.3.0 — alinhado com PRD §Definition of Done`
-->

# Fase 04: CHANGELOG v6.3.0 + compound note condicional

**Plano:** 04 — profile-aware-preface ×4-6 skills
**Sizing:** ~0.5h
**Depende de:** fase-01 (skills Must Have), fase-02 (skills Should Have), fase-03 (harness)
**Visual:** false

---

## O que esta fase entrega

Append da entrada v6.3.0 em `CHANGELOG.md` documentando: `PrefaceContext` helper, `capabilities.json`, `/parity-audit`, 6 skills com preface (ou 5 se `/lessons-learned` skipado), harness validation. Link para ADR-0020 e doc canônico. Condicionalmente, cria `docs/compound/2026-05-15-profile-aware-preface-migration.md` se a migração revelou padrão durável (ex: replicação mecânica beats one-off, ou meta-skills sem benefício de adaptação).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `CHANGELOG.md` | Modify | Adicionar bloco `## [6.3.0] - 2026-05-15` no topo (após linha do título, antes de `## [6.1.0]`) |
| `docs/compound/2026-05-15-profile-aware-preface-migration.md` | Create (condicional) | Compound note se padrão durável emergiu (G6 do plano) |

---

## Implementacao

### Passo 1: Append da entrada v6.3.0 em CHANGELOG.md

Inserir entre a linha 4 (separador `\n`) e a linha 6 (`## [6.1.0]`). Conteúdo:

```markdown
## [6.3.0] - 2026-05-15

> **Minor release — Adaptive Coaching (Eixo 2 Agent-Native)**
> Skills priorizadas leem `architecture-profile.md` automaticamente e adaptam o prompt
> por perfil arquitetural. `/init` produz inventário de capabilities do projeto.
> `/parity-audit` audita gaps entre capabilities do agente e task types do projeto.
> Fundação `PrefaceContext` reserva slots para v6.5 (Node+TS) e v6.6 (Rails).

### Added

- **`PrefaceContext` + `readPrefaceContext`** ([skills/lib/preface-context.ts](skills/lib/preface-context.ts)) — helper único para skills consumirem profile/language/framework. Shape composto desde já; v6.5/v6.6 preenchem slots reservados sem refactor.
- **`discovery/capabilities.json`** — `/init` produz inventário de rotas/handlers do projeto. Cobertura inicial: `nextjs-app-router` (AST determinístico) + `mvc-flat` (LLM-fallback marcado). Gitignored por default.
- **Skill `/anti-vibe-coding:parity-audit`** ([skills/parity-audit/SKILL.md](skills/parity-audit/SKILL.md)) — produz `discovery/parity-gaps.json` ranqueado por severity (`critical | important | nice`). `kind: "audit"` no contrato v6.1.0.
- **Lib `tool-registry-inspector`** ([skills/lib/tool-registry-inspector.ts](skills/lib/tool-registry-inspector.ts)) — enumera MCPs/builtin-tools/subagents em runtime. Consumida por `/parity-audit` e `qa-visual` refatorada.
- **Schemas JSON versionados** em `discovery/_schemas/` (`capabilities-v1.schema.json`, `parity-gaps-v1.schema.json`).
- **6 skills com `profile-aware-preface`** (4 Must + 2 Should — ajustar para 5 se /lessons-learned skipado): `/security`, `/api-design`, `/system-design`, `/design-patterns`, `/decision-registry`, `/lessons-learned`. Pattern: lookup table per-skill em `skills/{skill}/lib/{skill}-prefaces.ts`; fallback default = comportamento v6.2 quando profile null (CA-02).
- **Harness validator estendido** (`scripts/harness-validate.ts :: checkProfileAwarePreface`) — verifica bidirecionalmente start/end markers + referência a `readPrefaceContext`.
- **Doc canônico** [docs/design-docs/adaptive-coaching-framework.md](docs/design-docs/adaptive-coaching-framework.md) — `PrefaceContext` shape, schemas, migration guide para autores de skill (<30min).
- **ADR-0020** [docs/design-docs/ADR-0020-adaptive-coaching.md](docs/design-docs/ADR-0020-adaptive-coaching.md) — decisões e alternativas rejeitadas (runtime discovery puro, extender qa-visual, mobile checkpointing).

### Changed

- **`qa-visual` consome `tool-registry-inspector`** em vez de listar tools hardcoded em `allowed-tools`. UX idêntica a v6.2 (CA-06).
- **`/architecture` permanece como referência do padrão** — preface block existente alinhado com o helper composto (sem migração necessária; usa `readArchitectureProfile` direto + lookup próprio).

### Security

- **`capabilities.json` e `parity-gaps.json` gitignored por default.** Endpoints internos e MCPs instalados podem ser sensíveis em contexto pentest. Operador opt-in via flag para commitar.

### Reservation

- **`language` e `framework` no `PrefaceContext` ficam null em v6.3.0.** Slots reservados para v6.5.0 (Node+TS knowledge) e v6.6.0 (Rails). Lookup tables das 6 skills migradas continuam estáveis quando v6.5/v6.6 plugarem (CA-09).
- **Cobertura AST de profiles além de `nextjs-app-router` + `mvc-flat`** fica para v6.4+ (PRD Won't Have).

### Migration Guide

Para autor de skill que queira adicionar preface adaptativo:

1. Criar `skills/{skill}/lib/{skill}-prefaces.ts` exportando `{SKILL}_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>>` e `DEFAULT_{SKILL}_PREFACE = ''`.
2. Inserir bloco `<!-- profile-aware-preface:start --> ... <!-- profile-aware-preface:end -->` no `SKILL.md` entre frontmatter (ou telemetry, se existir) e H1.
3. No bloco, ler `const ctx = readPrefaceContext()` e selecionar via `ctx.profile ? TABLE[ctx.profile] ?? DEFAULT : DEFAULT`.
4. Criar teste em `skills/{skill}/lib/{skill}-prefaces.test.ts` — 1 caso por profile suportado + 1 caso de fallback.
5. Rodar `bun run harness:validate && bun run test`.

Tempo médio: <30min por skill.

---
```

### Passo 2: Decisão de compound note (condicional)

Avaliar — durante fase-01/02, surgiu padrão durável digno de captura?

Critérios (precisa de PELO MENOS 1):
- Replicação em 4-6 skills revelou que pattern do `/architecture` é mecânico — bullet aplicável a futuros autores.
- Skipar `/lessons-learned` revelou que meta-skills NÃO se beneficiam de preface — critério de seleção para próximas migrações.
- Harness check bidirecional (start/end/ref) capturou regressão real durante implementação — anti-pattern documentável.
- Lookup table per-skill (G3) vs God-table central — decisão revisitada e validada.

**Se nenhum critério atingido:** SKIPAR compound note. Registrar em `MEMORY.md` da pasta plano04:
```markdown
- **DEV-N:** Compound note skipped — migração foi mecânica e sem surpresa durável
  - PRD §Definition of Done: "lesson compound em docs/compound/ SE migração revelar padrão durável" — não foi o caso
```

### Passo 3: Criar compound note (se critério atingido)

Mirror do formato em `docs/compound/2026-05-14-subagent-contract-v1-migration.md`. Estrutura:

```markdown
---
title: "Migração v6.3.0 — profile-aware-preface em 6 skills"
category: arquitetura
tags: [adaptive-coaching, preface, skills, migration, lookup-table]
created: "2026-05-15"
---

## Problem

[Descrever o problema concreto encontrado durante a migração. Exemplo:
"O padrão profile-aware-preface estava provado em 1 skill (/architecture) mas
replicação mecânica em 4-6 skills levantou questão: per-skill lookup table vs
God-table central? E meta-skills (/decision-registry, /lessons-learned) se
beneficiam ou são ruído?"]

## Solution

[Descrever a decisão tomada com tradeoffs. Exemplo:
"Per-skill lookup table em skills/{skill}/lib/{skill}-prefaces.ts. Razão:
cada skill evolui sua narrativa adaptativa independentemente; God-table
acopla updates de prompts entre skills não-relacionadas. Custo: leve
duplicação de imports — aceitável.

Meta-skills (/lessons-learned) skipadas: preface = string vazia adicionaria
ruído cosmético sem ganho real. Critério para futuras migrações:
'skill consulta código do projeto? sim → adaptar; não → skipar'."]

## Prevention

- [Regra preventiva 1 — ex: "Antes de adicionar preface a skill nova, perguntar: 'consulta código do projeto ou orquestra meta-trabalho?' Meta-skills NÃO precisam de preface."]
- [Regra preventiva 2 — ex: "Lookup table SEMPRE em skills/{skill}/lib/, NUNCA em skills/lib/all-prefaces.ts. Acoplamento entre skills via tabela compartilhada vira débito técnico em 6 meses."]
- [Regra preventiva 3 — ex: "Harness check bidirecional (start/end/ref) é obrigatório quando padrão depende de markers textuais. Sem AST parser, esse é o único caminho de validação confiável."]

## See Also

- PRD: `docs/exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/PRD.md`
- ADR canônico: `docs/design-docs/ADR-0020-adaptive-coaching.md`
- Doc canônico: `docs/design-docs/adaptive-coaching-framework.md`
- Referência do padrão: `skills/architecture/SKILL.md` linhas 35-82
- Plano de migração: `docs/exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/plano04/`
```

### Passo 4: Validar harness + compound

- `bun run harness:validate` — deve passar (CHANGELOG.md tem H1 na linha 1; nenhum link novo broken).
- `bun run compound:check` — se compound note criada, deve passar (frontmatter completo: title, category, tags, created; seções Problem/Solution/Prevention presentes).

---

## Gotchas

- **G6 do plano:** Compound note é CONDICIONAL. Se a migração foi mecânica e sem surpresa durável (cenário esperado dado que pattern já estava provado), SKIPAR é resultado válido — registrar no MEMORY.md.
- **Local — CHANGELOG insertion position:** Inserir ENTRE a linha 4 (separador em branco após o título) e a linha 6 (atual `## [6.1.0] - 2026-05-14`). NÃO inserir no final do arquivo — CHANGELOG é DESC (release mais recente no topo).
- **Local — número de skills no CHANGELOG:** Se `/lessons-learned` foi skipado em fase-02, ajustar texto "6 skills com preface" → "5 skills com preface" para refletir a realidade. Não publicar números que não batem com a entrega.
- **Local — `bun run compound:check`:** Valida YAML frontmatter (`title`, `category`, `tags`, `created`) E seções obrigatórias (Problem, Solution, Prevention). Faltar qualquer um quebra o validator.

---

## Verificacao

### TDD

- [ ] **(N/A para CHANGELOG)** — não há teste unitário; verificação é via `bun run harness:validate` (link checker + H1 check do markdown).
- [ ] **(N/A para compound condicional)** — verificação é via `bun run compound:check` se criada.

### Checklist

- [ ] CHANGELOG.md tem nova entrada `## [6.3.0] - 2026-05-15` no topo (após título principal)
- [ ] Entrada referencia: `PrefaceContext`, `capabilities.json`, `/parity-audit`, 6 (ou 5) skills migradas, harness validation, ADR-0020
- [ ] Links no CHANGELOG resolvem (link checker do harness não falha)
- [ ] Decisão de compound (criar ou skipar) registrada em MEMORY.md
- [ ] (Condicional) `docs/compound/2026-05-15-profile-aware-preface-migration.md` criado com frontmatter completo
- [ ] (Condicional) `bun run compound:check` passa
- [ ] `bun run harness:validate` passa
- [ ] `bun run test` ainda verde

---

## Criterio de Aceite

**Por máquina:**
- `grep -c "## \[6.3.0\]" CHANGELOG.md` retorna 1
- `grep -c "PrefaceContext" CHANGELOG.md` retorna >= 1
- `grep -c "profile-aware-preface" CHANGELOG.md` retorna >= 1
- `bun run harness:validate` exit code 0
- Se compound criado: `bun run compound:check` exit code 0

**Por humano:**
- CHANGELOG entry é honesto: número de skills migradas bate com a entrega real (5 ou 6 — não inflar)
- Decisão de compound (criar/skipar) tem justificativa registrada em MEMORY.md
- Compound note (se criada) atende aos critérios de qualidade senior (>=2 critérios: não-deduzível, específico do projeto, custo alto, contra-intuitivo)

**Referências PRD:**
- Definition of Done: ✓ CHANGELOG.md entrada para v6.3.0 com link pro ADR
- Definition of Done: ✓ Lesson compound em docs/compound/ se migração revelou padrão durável (condicional)

---

<!-- Gerado por /plan-feature em 2026-05-15 -->
