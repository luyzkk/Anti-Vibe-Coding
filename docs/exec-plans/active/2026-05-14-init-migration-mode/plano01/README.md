# Plano 01: Fundação — Category Field + Detection + Tracer Bullet

**Feature:** /init Migration Mode ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~5h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Discovery TS), Plano 03 (Subagents — bloqueado externamente por v6.1.0), Plano 05 (Polish)

---

## O que este plano entrega

Estabelece a fundação tipológica (`TemplateEntry.category`) para distinguir os 26 slots do harness entre
os 22 arquivos do canon de André Prado e as 4 extensões anti-vibe. Cria o detector isolado do "3rd state"
(repo populado sem anti-vibe). Culmina com um Tracer Bullet end-to-end que prova detecção → confirmação
humana → stub da Fase 0 de discovery → 1 plano de migração com 10 seções → manifest com `initMode: "migration"`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

Nenhum.

### Produz para (outros planos que dependem deste)

| Plano | O que usa deste plano |
|-------|----------------------|
| Plano 02 | `migration-mode-detector.ts` (confirmar que repo está em migration mode antes de rodar discovery) |
| Plano 03 | `TemplateEntry.category` (Explorer subagent precisa saber quais slots são canon vs extensão) |
| Plano 04 | `initMode: "migration"` no manifest shape (Fase 4 writer consome esse campo) |
| Plano 05 | Tracer Bullet como referência para idempotência + fixtures completas |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-template-manifest-category-field.md` | `TemplateEntry.category` + todos os 26 slots classificados | ~1h | Nenhuma (primeira fase) |
| 02 | `fase-02-migration-mode-detector.md` | `migration-mode-detector.ts` testável e isolado | ~1h | fase-01 |
| 03 | `fase-03-detection-routing-skill.md` | SKILL.md Step 0 expandido com routing para migration mode | ~1h | fase-02 |
| 04 | `fase-04-tracer-bullet-migration-entrypoint.md` | Tracer Bullet end-to-end: detection → confirm → stub → plano → manifest | ~2h | fase-03 |

---

## Grafo de Fases

```
fase-01 (category field)
    │
    ▼
fase-02 (detector)
    │
    ▼
fase-03 (routing no SKILL.md)
    │
    ▼
fase-04 (tracer bullet — prova tudo junto)
```

Todas as fases são sequenciais — cada uma produz tipos e módulos consumidos pela seguinte.

---

## TDD Strategy

Ciclo RED → GREEN por fase:
- **fase-01:** escreve teste que verifica que cada entrada do TEMPLATE_MANIFEST tem campo `category` antes de adicionar o campo → RED → adiciona campo + classifica → GREEN
- **fase-02:** escreve `migration-mode-detector.test.ts` com mocks de filesystem antes de criar `migration-mode-detector.ts` → RED → implementa → GREEN
- **fase-03:** sem novo módulo TS, verificação é manual no SKILL.md + smoke test com repo fixture temporário
- **fase-04:** escreve teste do tracer bullet ponta a ponta com fixture `docs/` populada antes de implementar → RED → implementa → GREEN

---

## Gotchas Conhecidos

**G1 — Ordem de inserção do 3rd state no SKILL.md:** O Step 0.5 atual detecta v5 legacy e chama `process.exit(1)` antes de cair no greenfield. O novo routing para migration mode deve ser inserido entre "check manifest" (Passo 0) e "greenfield scaffold" — DEPOIS do Step 0.5 (v5 check). Senão, um repo com `.planning/` E docs populados ativaria o fluxo errado.

**G2 — Threshold de detecção não deve contar harness READMEs:** O threshold de "5+ arquivos .md em docs/" deve excluir os `README.md` que o scaffold planta em `exec-plans/active/`, `exec-plans/completed/`, `compound/` e `review-checklists/` — esses indicam que o harness já está instalado (modo update), não que é um repo populado externamente.

**G3 — `category` é aditivo no tipo:** Callers existentes de `TEMPLATE_MANIFEST` (scaffold-full-tree, harness-validate) não usam `category`. O campo deve ser adicionado ao tipo sem quebrar o spread `{ ...entry }` existente — declare como required no tipo mas com valor sempre presente em todos os 26 slots (não optional com `?`).

**G4 — 26 slots, não 22+4=26 exatos:** O manifest atual tem 31 entradas (9 docs raiz + 2 design-docs + 4 exec-plans + 1 compound + 6 review-checklists + 3 smoke/product/references/generated + 1 STATE.md + 1 TODO.md + 2 scripts + 2 raiz). Contar corretamente antes de classificar — o PRD estimou 26 mas o arquivo real tem mais slots.

<!-- Gerado por /plan-feature em 2026-05-14 -->
