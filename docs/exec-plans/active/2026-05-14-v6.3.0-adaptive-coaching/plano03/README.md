# Plano 03: /parity-audit + tool-registry-inspector

**Feature:** Adaptive Coaching v6.3.0 ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3.5h
**Depende de:** Plano 01 (Fundação Adaptativa)
**Desbloqueia:** Nenhum plano explicitamente — `tool-registry-inspector.ts` fica disponível como lib compartilhada para skills futuras (audit, planner, coaching)

---

## O que este plano entrega

Cria a lib `skills/lib/tool-registry-inspector.ts` que enumera capabilities runtime do agente (MCPs, builtin tools, subagentes) a partir do `.anti-vibe-manifest.json` e da pasta `agents/`, sem introspecção heavy. Sobre ela, monta a skill nova `/anti-vibe-coding:parity-audit` (`kind: "audit"` no contrato v6.1.0) que produz `discovery/parity-gaps.json` ranqueado por severity (`critical | important | nice`). Refatora `skills/qa-visual/SKILL.md` para validar disponibilidade do Playwright MCP via a mesma lib — sem mudança de UX visível ao usuário (CA-06).

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `discovery/_schemas/parity-gaps-v1.schema.json` | Plano 01 fase-02 | pendente — validação soft em fase-02 deste plano |
| `discovery/` folder com `.gitignore` cobrindo `discovery/*.json` | Plano 01 fase-02 | pendente — fase-02 deste plano escreve em `discovery/parity-gaps.json` |
| `skills/lib/preface-context.ts` (`readPrefaceContext`) | Plano 01 fase-01 | pendente — `/parity-audit` pode usar profile-aware suggestions (uso indireto/opcional) |
| `skills/init/lib/audit-log.ts` (`AuditLogWriter`) | Já existe no codebase | pronto — reusar para append em `discovery/agents-log.json` quando aplicável |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/lib/tool-registry-inspector.ts` | `qa-visual` refatorada (fase-03), `/parity-audit` (fase-02), skills futuras que precisem inventário runtime |
| `skills/parity-audit/SKILL.md` (kind: "audit") | Operador humano via `/anti-vibe-coding:parity-audit` |
| `skills/parity-audit/lib/gap-rules.ts` | Tabela de regras `task_type → required_capability` extensível em PRs futuros |
| `discovery/parity-gaps.json` (runtime, gitignored) | Operador humano + skills task-type-specific que queiram avisar gap antes de tentar (PRD §Mecanismo passo 6) |
| `skills/qa-visual/SKILL.md` refatorada | Consumidor da lib — não exporta nada novo, mantém UX idêntica a v6.2 (CA-06) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | [fase-01-tool-registry-inspector.md](fase-01-tool-registry-inspector.md) | `tool-registry-inspector.ts` (`inspectToolRegistry`) + 4 testes unitários [TRACER BULLET deste plano] | ~1.5h | Nenhuma |
| 02 | [fase-02-parity-audit-skill.md](fase-02-parity-audit-skill.md) | `skills/parity-audit/SKILL.md` + `gap-rules.ts` + `parity-gaps-writer.ts` + testes | ~1.5h | fase-01 |
| 03 | [fase-03-qa-visual-refactor.md](fase-03-qa-visual-refactor.md) | `qa-visual` refatorada com pre-check via `inspectToolRegistry`; UX idêntica a v6.2 | ~0.5h | fase-01 |

---

## Grafo de Fases

```
fase-01 (tool-registry-inspector) [TRACER BULLET]
    |
    +---------------+----------------+
    |                                |
    v                                v
fase-02 (parity-audit)        fase-03 (qa-visual refactor)
```

**Paralelismo possível:** fase-02 e fase-03 podem rodar em paralelo após fase-01 verde (ambas só consomem `inspectToolRegistry`, não escrevem nos mesmos arquivos).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run typecheck
```

**Tracer Bullet deste plano:** fase-01-tool-registry-inspector

Objetivo do tracer bullet: provar que `inspectToolRegistry(projectRoot)` lê do `.anti-vibe-manifest.json` + pasta `agents/` e retorna `{ mcps, builtin_tools, subagents }` corretamente, com graceful fail (`source: 'partial'`) quando `agents/` não existe. Sem essa fundação, fase-02 (parity-audit) e fase-03 (qa-visual pre-check) não têm o que consumir.

Framework: `bun:test`. Sem mocks pesados — usar `tmpdir` real com `.anti-vibe-manifest.json` + `agents/*.md` criados no `beforeEach` (mesma estratégia do Plano 02 fase-01).

---

## Gotchas Conhecidos

- **G1 — `qa-visual` refactor MUST preserve `allowed-tools:` frontmatter UX (CA-06):** o frontmatter `allowed-tools:` da SKILL.md é parseado pelo harness do Claude Code ANTES da skill rodar; remover a lista hardcoded de `mcp__plugin_playwright_playwright__*` quebraria autorização. O pre-check via `inspectToolRegistry` é apenas defensivo (mensagem de erro clara quando Playwright ausente) — não substitui o frontmatter.
- **G2 — Não introspectar MCPs em runtime (PLAN.md risco "scope creep"):** `tool-registry-inspector` lê APENAS metadata do `.anti-vibe-manifest.json` + frontmatter de `agents/*.md`. Sem `require()` dos MCPs, sem chamadas a tool registries externos, sem I/O recursivo além de `agents/`.
- **G3 — `discovery/parity-gaps.json` é gitignored por default (PRD Decisão #8):** Plano 01 fase-02 já configura `.gitignore` com `discovery/*.json`. Fase-02 deste plano NÃO precisa adicionar entry; apenas escrever no path. Doc canônico (Plano 01 fase-03) alerta sobre contexto de pentest.
- **G4 — Schema `parity-gaps-v1.schema.json` vem do Plano 01 fase-02 — DO NOT recreate:** validação em fase-02 é SOFT (warning se inválido, sem throw). Se schema ainda não existir ao executar fase-02, registrar em MEMORY.md e pular validação.
- **G5 — `kind: "audit"` é contrato v6.1.0 (PRD RF-MH-03):** frontmatter de `skills/parity-audit/SKILL.md` DEVE declarar `kind: audit`. Esse campo é validado pelo harness do contrato de subagentes. Sem ele, a skill não é registrada como auditora.
- **G6 — `tool-registry-inspector` faz graceful fail quando `agents/` não existe:** retornar `source: 'partial'` no snapshot, NUNCA throw. Projetos sem subagentes definidos ainda têm um registry válido (mcps + builtin_tools), apenas com `subagents: []`.
- **G7 — Severity é enum fechado: `'critical' | 'important' | 'nice'`:** sem outros valores aceitos. `gap-rules.ts` valida em compile-time via union type. Ranqueamento no output: critical primeiro, depois important, depois nice.
- **G8 — Frontmatter de subagentes em `agents/*.md` usa `allowed-tools:` como string CSV:** `allowed-tools: Read, Write, Glob` → `['Read', 'Write', 'Glob']`. Split por vírgula + trim. Casos edge: linha vazia (`allowed_tools: []`) e ausência total do campo (`allowed_tools: []`).
- **G9 — Sem AST library disponível:** `package.json` tem apenas `gray-matter` e `js-yaml`. Para parse de frontmatter use `gray-matter`. Para qualquer outro parse, regex puro (mesmo princípio do Plano 02 fase-01).

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
