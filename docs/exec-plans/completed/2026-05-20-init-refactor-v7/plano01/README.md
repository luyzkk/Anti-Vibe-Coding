# Plano 01: Foundation + Tracer + Cleanup

**Feature:** init-refactor-v7 ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~8h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02, Plano 03, Plano 04

---

## O que este plano entrega

Pipeline de **10 steps** no `skills/init/lib/registry.ts` operacional ponta-a-ponta:
8 steps stubados (apenas log) + Step 1 real (reentry-gate, DR-1) + Step 2 real
(detect-legacy + detect-stack, read-only). Os 15+ steps obsoletos da v6.7 deletados sem perda
de behaviors validos (auditoria previa em AUDIT.md). Tracer bullet e2e prova que `/init` em
projeto greenfield roda os 10 steps em ordem e sai com exit 0 — esta e a base de execucao
sobre a qual os Planos 02-05 vao plugar logica real.

**Pipeline final (D12 revisada por DV-1 + DV-3):**

| # | Step | Tipo neste plano | Implementacao real |
|---|------|------------------|--------------------|
| 1 | `reentry-gate` | REAL (fase-03) | Este plano |
| 2 | `detect-legacy-and-stack` | REAL (fase-02) | Este plano |
| 3 | `secrets-scan` | STUB | Plano 02 (DV-1) |
| 4 | `migrate-planning-and-manifest` | STUB | Plano 02 |
| 5 | `scaffold-and-link` | STUB | Plano 03 |
| 6 | `install-gh-files` | STUB | Plano 03 |
| 7 | `generate-populate-plans` | STUB | Plano 04 (CORE) |
| 8 | `delivery-loop` | STUB | Plano 05 |
| 9 | `copy-knowledge` | STUB | Plano 05 |
| 10 | `final-validation` | STUB | Plano 05 |

---

## Decisoes que reformataram este plano (DV-1..DV-4)

| Decisao | Resumo | Impacto |
|---------|--------|---------|
| DV-1 | secrets-scan mantido como step proprio (Step 3) | Pipeline ganha 1 step (era 9, virou 10) |
| DV-2 | placeholder skip-if-exists 2x — manter como esta | Sem impacto neste plano |
| DV-3 | gate de re-entrada (DR-1) em Step 1 proprio, separado do detect | Pipeline ganha 1 step (era 8, virou 9 antes de DV-1) |
| DV-4 | StepContext.legacy/stack opcionais neste plano, obrigatorios no Plano 02 | fase-02 estende types.ts com `legacy?` / `stack?` |

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Contratos `AbortError`, `StepContext`, `Step`, `StepReport` | `skills/init/lib/steps/types.ts` (existente, DT-01) | pronto |
| Lib `detect-stack.ts` (multi-stack D22) | `skills/init/lib/detect-stack.ts` (existente) | pronto |
| Lib `detect-v5-legacy.ts` (artefatos v5.x) | `skills/init/lib/detect-v5-legacy.ts` (existente) | pronto |
| Dispatcher `run-init.ts` reaproveitavel | `skills/init/lib/run-init.ts` (existente, sera adaptado em fase-04/05) | pronto |
| PRD aprovado + decisoes DR-1..DR-5 + DV-1..DV-4 | `../PRD.md`, `../PLAN.md` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Registry com 10 nomes na ordem D12 revisada (8 stubs + Steps 1-2 reais) | Plano 02 (substitui stubs Steps 3-4), Plano 03 (Steps 5-6), Plano 04 (Step 7), Plano 05 (Steps 8-10) |
| `ctx.legacy` e `ctx.stack` populados pelo Step 2 | Plano 02 (manifest writer), Plano 04 (paths stack-aware nas Waves) |
| Gate de re-entrada (DR-1) ativo como Step 1 isolado | Plano 05 fase-final (e2e idempotencia / CA-08) |
| Pipeline tracer-verde | Suite e2e final do Plano 05 expande sobre este tracer |
| AUDIT.md com behaviors mapeados | Plano 02 fase manifest (lessons/decisions context), Plano 05 fase-final (cobertura recriada) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-coverage-audit.md | `AUDIT.md` preenchido: tabela `step \| test \| behaviors validos \| onde recriar` para os 15+ steps a deletar | 1.5h | — |
| 02 | fase-02-detect-legacy-stack.md | `02-detect-legacy-and-stack.ts` real (read-only): popula `ctx.legacy` + `ctx.stack`, sem abortar | 2h | fase-01 |
| 03 | fase-03-reentry-gate.md | `01-reentry-gate.ts` real: detecta `.claude/legacy-manifest.json` existente e aborta com code=10 (DR-1, DV-3) | 1h | fase-02 (semantic — usa StepContext estendido) |
| 04 | fase-04-new-registry.md | `registry.ts` reescrito com 10 nomes na ordem D12 revisada — 8 stubs + Steps 1-2 reais | 1.5h | fase-02, fase-03 |
| 05 | fase-05-delete-dead-steps.md | `git rm` dos 18 steps obsoletos + testes orfaos; AUDIT.md confirma 0 behaviors validos perdidos | 1.5h | fase-04 (registry novo nao importa mais nenhum deletado) |
| 06 | fase-06-tracer-bullet-e2e.md | Teste e2e em fixture greenfield: roda init, executa 10 steps em ordem, exit 0 | 0.5h | fase-04 (verde antes do delete), revalida apos fase-05 |

---

## Grafo de Fases

```
fase-01 (coverage-audit)
    |
    v
fase-02 (detect-legacy-stack) -----+
    |                              |
    v                              |
fase-03 (reentry-gate)             |
    |                              |
    v                              |
fase-04 (new-registry: stubs + Steps 1-2 reais)
    |
    +--------> fase-06 (tracer-bullet-e2e) [VERDE 1: 10 steps]
    |                       |
    v                       |
fase-05 (delete dead steps) |
    |                       |
    +--------> fase-06 (tracer-bullet-e2e) [VERDE 2: apos delete]
```

**Paralelismo possivel:** fase-02 e fase-03 podem ser executadas em paralelo (gate nao importa
nada de detect — dependencia eh apenas semantica via StepContext estendido em fase-02).
fase-06 e re-executada apos fase-05 para garantir que o delete em cascata nao quebrou o
tracer (mitigacao do R6).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-06 — `tests/e2e/init-v7-tracer-bullet.test.ts`
roda `runInit([])` em fixture greenfield, verifica os 10 step ids na ordem D12 revisada,
valida que Step 1 (gate) passa silencioso e Step 2 (detect) popula stack, valida exit 0.

**Ordem critica para mitigar R6:** stubs ANTES de delete. fase-04 estabelece registry novo
com 10 nomes (8 stubs + 2 reais). fase-06 valida tracer verde. SO ENTAO fase-05 deleta os
18 steps obsoletos (que ja nao sao mais importados pelo novo registry). fase-06 e
re-executada para confirmar que o delete nao quebrou nada.

---

## Gotchas Conhecidos

- **G1 (R6 do PLAN.md):** Delete em cascata quebra `run-init.ts`. Estrategia obrigatoria:
  registry novo (fase-04) deve ser o primeiro a remover imports dos 18 steps obsoletos.
  Apenas depois disso fase-05 pode rodar `git rm`. Confirme com `bun build` antes do delete.
- **G2 (DR-4):** Steps deletados podem conter behaviors validos hoje cobertos por testes
  unitarios. fase-01 e bloqueante: sem AUDIT.md preenchido, fase-05 nao roda.
- **G3 (DT-01):** Reaproveitar libs `detect-stack.ts` e `detect-v5-legacy.ts` — NAO reescrever.
  Step 2 e apenas glue code que chama as duas libs e popula `ctx.legacy` / `ctx.stack`.
- **G4 (D14 / DR-1 / DV-3):** Gate da fase-03 (Step 1) dispara `AbortError` code=10 com
  mensagem instrutiva apontando para `/init:refresh` futuro (D13 adiado) — nao falar em
  "flag --refresh" hoje porque ela nao existe.
- **G5 (D16):** Registry novo da fase-04 NAO pode importar nada que mexa em `.claude/CLAUDE.md`.
  Steps stubados devem ser literalmente `{ id, run: async () => ({ mutated: false, summary: 'stub' }) }`.
- **G6 (StepContext extension — DV-4):** `ctx.legacy` e `ctx.stack` nao existem hoje em
  `StepContext`. fase-02 estende o tipo em `skills/init/lib/steps/types.ts` (opcionais —
  `legacy?` e `stack?`) para que stubs nao precisem populá-los. Plano 02 endurece (vira
  obrigatorio apos Step 4 escrever manifest).
- **G7 (lazy import do registry):** `run-init.ts` faz `lazyImport(() => import('./registry'))`.
  Apos fase-04, o lazyImport carrega o registry novo automaticamente — nao precisa mudar
  `run-init.ts` neste plano (ressalva: WriteRecorder/dry-run wiring e removido em Plano 03/05).
- **G8 (cross-upgrade detector):** `run-init.ts` linhas 97-125 chamam `detectCrossUpgrade()`.
  Esse bloco e v6.x compat — manter ate Plano 05 final (remover apos rollout). Nao tocar neste plano.
- **G9 (DV-1 — secrets-scan vira Step 3 stub):** o step antigo `06-secrets-scan.ts` eh deletado
  na fase-05; o novo `03-secrets-scan.ts` (stub nesta fase, real no Plano 02) carrega a logica
  portada. AUDIT.md deve marcar `06-secrets-scan` como "recriado no Plano 02", nao "obsoleto".

---

<!-- Gerado por /plan-feature em 2026-05-20, revisto apos DV-1..DV-4 em 2026-05-21 -->
