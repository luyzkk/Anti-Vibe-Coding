# EXECUTE_PLAN_AUDIT — Compatibilidade com populate-plan generator

**Auditor:** plan-executor da fase-01 do Plano 01
**Data:** 2026-05-18
**Veredito:** GO
**Origem:** D25 do PRD refactor-init-harness-populate-merge

---

## Capacidades avaliadas

| # | Capacidade | Status | Evidencia |
|---|-----------|--------|-----------|
| 1 | Paralelismo wave-based (multiplos subagentes simultaneos por fase) | SUPPORTED | `skills/execute-plan/SKILL.md:398-404` (hierarquico, max 3); `skills/execute-plan/references/wave-execution.md:46` (flat, max 5) |
| 2 | Isolamento de contexto (cada subagente tem prompt isolado, sem leak entre tasks) | SUPPORTED | `skills/execute-plan/SKILL.md:416-434` (lista RECEBE / NAO RECEBE por subagente); `skills/execute-plan/references/wave-execution.md:83-132` (mecanismo RED/GREEN) |
| 3 | Suporte opcional a glossario compartilhado | MISSING | Ausente — verificado em `skills/execute-plan/SKILL.md` (integral), `skills/execute-plan/index.ts` (integral), `skills/execute-plan/references/wave-execution.md` (integral). O mais proximo existente e "Notas para Planos Seguintes" (`SKILL.md:363-366`) que passa contexto cross-fase como texto livre, mas nao e glossario estruturado. |

---

## Observacoes adicionais

### Comportamento quando PLAN.md declara N tasks paralelas em uma fase

No modo hierarquico (v2 — PLAN.md com `planoNN/fase-*.md`):

- `SKILL.md Step 4a` classifica fases como independentes ou dependentes
- Fases sem "Depende de" podem ser executadas em paralelo com limite de **3 subagentes simultaneos**
- Fases com "Depende de: fase-NN" executam APOS a dependencia — nunca em paralelo com ela

No modo flat (v1 — backward compat):

- `references/wave-execution.md` secao 2: tasks independentes dentro de uma wave executam em paralelo com limite de **5 subagentes simultaneos**
- Se wave tem 8 tasks independentes, executa em 2 lotes (4+4)

**Discrepancia de limite:** SKILL.md hierarquico declara max 3 por fase; wave-execution.md (flat) declara max 5 por task. O populate-plan-generator deve respeitar o limite de 3 ao emitir fases paralelas em PLAN.md hierarquico.

### Limite conhecido de subagentes concorrentes

| Modo | Limite | Fonte |
|------|--------|-------|
| Hierarquico (v2) | 3 subagentes simultaneos por plano | `SKILL.md:402` |
| Flat (v1) | 5 subagentes simultaneos por wave | `references/wave-execution.md:46` |

### Mecanismo de erro (uma task falha → para a wave? continua?)

Modo hierarquico (`SKILL.md Step 4-RETRY`):
- Nivel 1-3: retry escalado com contexto expandido
- Apos 3 falhas: fase marcada como "blocked", execucao das outras fases **continua** (nao para a wave)
- STATE.md registra o blocker; Step 5 reporta ao dev

Modo flat (`references/wave-execution.md` secao 5):
- 3 retries com escalada
- Pos-falha: task marcada `blocked`, tasks independentes da mesma wave **continuam**
- Wave Total Failure (todas as tasks blocked): AskUserQuestion — nao prossegue automaticamente

### Sobre `index.ts`

O `index.ts` da skill contem apenas 2 helpers utilitarios (`listActive`, `onPlanPotentiallyComplete`). Todo o comportamento de orquestracao, paralelismo e isolamento esta na spec declarativa `SKILL.md` — que e o prompt do agente orquestrador. Nao ha logica de runtime para paralelismo porque o paralelismo e executado via chamadas `Agent` (tool nativa do Claude) pelo orchestrador, nao via codigo TypeScript.

---

## Veredito detalhado

**GO.** Os dois criterios obrigatorios (C1 paralelismo wave-based e C2 isolamento de contexto) estao SUPPORTED com evidencia direta em `SKILL.md` e `references/wave-execution.md`. O criterio opcional C3 (glossario compartilhado) esta MISSING, mas eh Could-Have (CH-03 no PRD) e pode ser contornado pelo populate-plan-generator emitindo o glossario inline em cada prompt de subagente — o mecanismo de "Notas para Planos Seguintes" (`SKILL.md:363-366`) ja oferece um canal de texto livre para isso.

**Restricao conhecida para o Plano 02:** ao emitir PLAN.md hierarquico, o populate-plan-generator deve limitar fases paralelas a no maximo 3 por wave (nao 5, que e o limite do modo flat).

**Sem necessidade de PRD paralelo.**
