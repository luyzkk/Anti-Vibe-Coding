# Plan: /init Migration Mode — Pipeline LLM-First Ancorado no Canon do André Prado

**PRD:** ./PRD.md
**Planos:** 5 planos, 18 fases total
**Created:** 2026-05-14

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Fundação: Category Field + Detection + Tracer Bullet | 4 | ~5h | — |
| 02 | Discovery TS: Fase 0 + Audit Log | 3 | ~4h | Plano 01 |
| 03 | Subagent Orchestration: Fases 1-3 [BLOQUEADO: v6.1.0] | 5 | ~8h | Plano 01, Plano 02 |
| 04 | Manifest + Harness Validate: Fase 4 | 3 | ~4h | Plano 02, Plano 03 |
| 05 | Polish: Idempotência + Fixtures + AGENTS.md | 3 | ~4h | Plano 01, Plano 04 |

---

## Grafo de Dependencias

```
Plano 01 (Fundação)
    │
    ├──────────────────────────┐
    ▼                          ▼
Plano 02 (Discovery)     Plano 03 (Subagents)*
    │                          │
    └──────────┬───────────────┘
               │
               ▼
         Plano 04 (Manifest)
               │
               ▼
         Plano 05 (Polish)
               ▲
               │
         Plano 01 ──────────────┘

* Plano 03 bloqueado externamente por v6.1.0 (subagent-contract).
  Plano 02 pode executar independentemente do Plano 03.
```

**Paralelismo possivel:** Plano 02 e Plano 03 podem executar em paralelo após Plano 01.
Plano 03 só integrável após v6.1.0 estar mergeado na branch.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-04-tracer-bullet-migration-entrypoint
**Descricao:** Detection do "3rd state" → confirmação humana (AskUserQuestion) → Phase 0 TS stub
(discovery.ts placeholder) → 1 migration plan com 10 seções (shape new-plan.mjs) →
manifest com `initMode: "migration"`. Prova arquitetura end-to-end sem depender de
subagentes LLM. Completável em <2h.

---

## Resumo por Plano

### Plano 01: Fundação — Category Field + Detection + Tracer Bullet

> Estabelece a fundação tipológica (TemplateEntry.category) e a lógica de detection do
> terceiro estado ("repo populado sem anti-vibe"). Culmina com Tracer Bullet end-to-end.

Fases:
- fase-01-template-manifest-category-field: Adiciona `category: 'canon-andre' | 'anti-vibe-extension'` ao TemplateEntry + classifica todos os 26 slots
- fase-02-migration-mode-detector: `skills/init/lib/migration-mode-detector.ts` — função que detecta o 3rd state
- fase-03-detection-routing-skill: SKILL.md Step 0 expandido com routing para migration mode
- fase-04-tracer-bullet-migration-entrypoint: SKILL.md migration mode entry + stub Phase 0 + 1 migration plan + manifest `initMode: "migration"` + confirmação humana

### Plano 02: Discovery TS — Fase 0 + Audit Log

> Implementa o componente TS determinístico de Phase 0: walk de docs/, extração de metadata,
> exclusão de secrets, saída em inventory.json. Inclui audit log e tests com fixtures.

Fases:
- fase-01-discovery-ts: `skills/init/lib/discovery.ts` — walk + inventory.json + secret exclusion
- fase-02-discovery-tests-fixtures: Testes para discovery.ts + fixtures básicas (repos-mock simples)
- fase-03-audit-log: `discovery/agents-log.json` estrutura + writer + integração com orchestrator stub

### Plano 03: Subagent Orchestration — Fases 1-3 [BLOQUEADO por v6.1.0]

> Implementa os 3 subagentes LLM (Explorer, Reconciler, Compound-writer) + orquestração
> com cap 6 paralelos, batching sequencial, retry 1×, e planos de migração completos.
> **Pré-requisito externo:** v6.1.0 (subagent-contract) deve estar mergeado antes de integrar.

Fases:
- fase-01-prompts-separados: `skills/init/lib/prompts/{explorer,reconciler,compound}.md` com schema JSON estrito
- fase-02-explorer-orchestrator: `migration-planner.ts` — Explorer cap 6 + batching sequencial
- fase-03-reconciler-plan-writer: Reconciler slot-by-slot + plan writer com 10-section shape + plan-validator.ts
- fase-04-compound-writer: Compound-writer subagent + CA-29 compliance
- fase-05-retry-abort-logic: Retry 1× com prompt reduzido + abort + relatório de arquivos não-processados

### Plano 04: Manifest + Harness Validate — Fase 4

> Fase 4 TS determinística: manifest com initMode + catalog de migration plans +
> _INIT_ORCHESTRATOR.md em ordem topológica. Extensão do harness-validate para migration mode.

Fases:
- fase-01-fase4-manifest-orchestrator: Fase 4 TS — manifest writer (initMode) + migration plan catalog + _INIT_ORCHESTRATOR.md topological
- fase-02-harness-validate-migration: harness-validate extension — migration mode warnings vs errors + consistency check
- fase-03-auto-flip-initmode: Auto-flip `initMode → "completed"` quando último plan move para completed/ + warning visual

### Plano 05: Polish — Idempotência + Fixtures + AGENTS.md

> Idempotência full re-run (preserva plans, skip por checksum). Fixtures completas.
> AGENTS.md template estendido para as 4 extensões anti-vibe dentro de ≤40 linhas.

Fases:
- fase-01-idempotencia: Full re-run logic — preserva plans em active/, skip por checksum modificado, regenera discovery
- fase-02-fixtures-completas: `skills/init/__fixtures__/` — 5 repos-mock (greenfield, single-design-file, scattered-adrs, dense-architecture, dogfood-anti-vibe-plugin)
- fase-03-agents-md-extension: AGENTS.md template atualizado com 4 extensões anti-vibe agrupadas, ≤40 linhas

---

## Risks

- **v6.1.0 atrasa e bloqueia Plano 03** (média prob, alto impacto)
  - Mitigação: `requires: [v6.1.0-subagent-contract]` no frontmatter do PRD. Planos 01, 02, 04, 05 podem executar sem bloqueio. Plano 03 aguarda.
- **Subagentes emitem JSON malformado** (média prob, alto impacto)
  - Mitigação: prompts com schema JSON estrito (fase-01 do Plano 03) + parser tolerante + retry 1× (fase-05)
- **Plans gerados genéricos** (média prob, alto impacto)
  - Mitigação: prompts referenciam package.json + estrutura real + Fase 5 opcional (First-Use Customization)
- **AGENTS.md >40 linhas com extensões** (baixa prob, médio impacto)
  - Mitigação: agrupamento planejado (≈39 linhas). Test em fixtures valida. Plano 05 fase-03.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| DT-01: Hard cap 6 subagentes paralelos | Plano 03, fase-02 |
| DT-02: Full re-run (regenera discovery, preserva plans) | Plano 05, fase-01 |
| DT-03: Retry 1× com prompt reduzido, depois abort | Plano 03, fase-05 |
| DT-04: Walk scope `docs/**` + `*.md` raiz + `.claude/**` + `scripts/**` + `.github/**` | Plano 02, fase-01 |
| DT-05: Auto-flip quando último plan → completed/ + warning visual | Plano 04, fase-03 |
| DT-06: Skip + warn se checksum mudou (respeita edits humanos) | Plano 05, fase-01 |
| DT-07: Audit log sempre, sem PII | Plano 02, fase-03 |
| DT-08: Prompts em arquivos separados, versionados | Plano 03, fase-01 |
| DT-09: 22 canon do André imutáveis (hipótese a testar) | Plano 01, fase-01 |
| DT-10: 4 extensões anti-vibe marcadas com category + referenciadas em AGENTS.md | Plano 01, fase-01 + Plano 05, fase-03 |

---

<!-- Gerado por /plan-feature em 2026-05-14 -->
