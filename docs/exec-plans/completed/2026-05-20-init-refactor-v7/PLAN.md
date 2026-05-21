---
title: "Refatoracao do /anti-vibe-coding:init (v7)"
mode: full
status: active
created: 2026-05-21
---

# Exec Plan: Refatoracao do /anti-vibe-coding:init (v7)

**PRD:** ./PRD.md
**Context:** ./CONTEXT.md
**Planos:** 5 planos, ~24 fases total, ~29h
**Created:** 2026-05-21
**Tracer Bullet:** Plano 01, fase-06 — `/init` em fixture greenfield executa 10 steps em ordem (2 reais + 8 stubs), exit 0.

**Pipeline final (D12 revisada por DV-1 + DV-3):** 10 steps
1. `reentry-gate` (DR-1) — 2. `detect-legacy-and-stack` — 3. `secrets-scan` (DV-1) —
4. `migrate-planning-and-manifest` — 5. `scaffold-and-link` — 6. `install-gh-files` —
7. `generate-populate-plans` (CORE) — 8. `delivery-loop` — 9. `copy-knowledge` —
10. `final-validation`.

**Decisoes de desvio (DV) abertas durante o detalhamento do Plano 01:**
- **DV-1:** secrets-scan mantido como step proprio (Step 3) → pipeline +1
- **DV-2:** placeholder skip-if-exists 2x — manter como esta (sem impacto estrutural)
- **DV-3:** gate de re-entrada como Step 1 proprio, separado do detect → pipeline +1
- **DV-4:** StepContext.legacy/stack opcionais no Plano 01, obrigatorios no Plano 02

---

## Goal

Substituir o init v6.7 (24 steps que destroem `.claude/CLAUDE.md` sem produzir docs canonicos)
por um init v7 de **10 steps** (8 originais do PRD + 2 ganhos por DV-1/DV-3) que:

- Preserva `.claude/CLAUDE.md` existente sempre (CA-02)
- Cria 16 placeholders canonicos com skip-if-exists (RF-03)
- Gera 16 PLAN.md individuais no formato Andre (RF-04, RF-05)
- Mapeia artefatos legacy em `.claude/legacy-manifest.json` para consumo pelo execute-plan (RF-02, DT-06)
- Mantem o init < 30s em projeto Node medio

---

## Scope

**In:**
- 10 novos steps no `skills/init/lib/steps/` (reentry-gate, detect-legacy+stack, secrets-scan, migrate+manifest, scaffold+link, install-gh, generate-populate-plans, delivery-loop, copy-knowledge, final-validation)
- Reescrita de `skills/init/lib/populate-plan-generator.ts` (569 linhas) com novo formato e 16 instrucoes hardcoded
- Schema Zod compartilhado em `skills/_shared/legacy-manifest-schema.ts` (DR-5)
- Delete dos 15 steps obsoletos + testes orfaos
- Atualizacao do `harness-validate` para incluir 4 docs extras AVC (RF-12)
- Suite e2e reescrita alinhada aos 8 steps novos (RF-08)

**Out:**
- Execucao automatica dos planos gerados (delegado ao `/execute-plan`, manual)
- Skills separadas `/init:migrate`, `/init:refresh` (D13 adiado)
- Migracao de licoes/decisoes legacy para docs harness (delegado ao execute-plan via manifest)
- Suporte a stacks alem de nodejs-typescript e rails na copy-knowledge
- Dry-run mode / WriteRecorder (removido D4)
- Capabilities discovery (removido D5)

---

## Assumptions

- Stack do projeto-alvo detectavel via `package.json` (Node/TS) ou `Gemfile` (Rails) — outras stacks abortam Step 5 (DR-2)
- Contratos `AbortError`, `StepContext`, libs `detect-stack.ts` reaproveitaveis (DT-01)
- `harness-engineering/assets/harness-template/` continua sendo referencia valida para placeholders
- `/execute-plan` (consumer) sera atualizado em PRD proprio para usar Zod schema compartilhado — init apenas escreve
- Projetos-alvo nao tem volume superior a 1000 arquivos no detect-stack scan
- Re-run de init em projeto ja inicializado (`.claude/legacy-manifest.json` existente) deve abortar com mensagem clara (DR-1)

---

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| **R1** Re-run nunca re-popula placeholders editados pelo usuario | Media | Medio | **DR-1**: detectar `.claude/legacy-manifest.json` existente e abortar; flag futura `/init:refresh` para refresh consciente |
| **R2** Stack nao reconhecida gera 16 planos com paths invalidos | Media | Alto | **DR-2 (override RF-11)**: Step 5 aborta com erro claro instruindo `/detect-architecture` antes |
| **R3** 16 instrucoes hardcoded desatualizadas quando harness adiciona doc | Baixa | Medio | `harness-validate` gate via CA-01; falha de teste detecta gap |
| **R4** Testes reescritos perdem cobertura de behaviors validos | Media | Alto | **DR-4**: fase-01 do Plano 1 audita os 15 testes a deletar, lista behaviors validos antes de remover |
| **R5** `legacy-manifest.json` lido errado pelo execute-plan | Baixa | Alto | **DR-5**: shared `skills/_shared/legacy-manifest-schema.ts` (Zod). Writer e reader importam mesmo schema, falha tipada |
| **R6** Delete em cascata quebra `run-init.ts` orchestrator | Alta | Alto | Plano 1 mantem 8 steps stubados ate registry novo passar; deletes acontecem em fase-05 (apos tracer verde em fase-06? — invertido: stubs primeiro, tracer, depois delete) |

---

## Execution Steps

### Planos (hierarquicos)

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Foundation + Tracer + Cleanup | ~6-7 | ~8h | — |
| 02 | Step 2 + Shared Manifest Schema | ~4 | ~4h | Plano 01 |
| 03 | Steps 3-4: Scaffold + Link + GH | ~3 | ~3h | Plano 01 |
| 04 | Step 5: Generate Populate Plans (CORE) | ~5 | ~9h | Plano 01, 02 |
| 05 | Steps 6-8 + Validation + E2E final | ~5 | ~5h | Plano 03, 04 |

### Grafo de Dependencias

```
                Plano 01 (Foundation + Tracer + Cleanup)
                /        |          \
               v         v           v
        Plano 02      Plano 03    Plano 04 (CORE)
        (Manifest)   (Scaffold)   (Generate Plans)
                \         |          /
                 \        v         /
                  +----> Plano 05 <-+
                        (Closing + E2E)
```

**Paralelismo possivel:** Planos 02, 03, 04 podem ser executados em paralelo apos Plano 01.
Plano 02 alimenta Plano 04 (ctx.legacy), entao Plano 04 idealmente comeca apos Plano 02.

### Tracer Bullet

**Plano:** 01, fase-06
**Descricao:** Rodar `/anti-vibe-coding:init` em fixture greenfield → executa 10 steps em ordem (Step 1 gate passa silencioso, Step 2 popula stack=node-ts, Steps 3-10 stubs) → exit 0. Prova que o registry novo funciona ANTES de qualquer step ter logica real.

### Resumo por Plano

#### Plano 01: Foundation + Tracer + Cleanup (~8h)
> Estabelece o novo pipeline de 8 steps via stubs, implementa o Step 1 real (detect-legacy+stack),
> deleta os 15 steps obsoletos com auditoria de coverage prevent, e prova tudo com tracer e2e.

Fases (preliminar):
- fase-01-coverage-audit: mapear behaviors dos 15 steps a deletar (DR-4)
- fase-02-detect-legacy-stack: implementar Step 1 (read-only)
- fase-03-reentry-gate: gate "ja inicializado" (DR-1)
- fase-04-new-registry: registry com 8 nomes (7 stubs + Step 1 real)
- fase-05-delete-dead-steps: remover 15 steps + testes orfaos
- fase-06-tracer-bullet-e2e: teste e2e greenfield verde

#### Plano 02: Step 2 + Shared Manifest Schema (~4h)
> Cria o contrato compartilhado do `legacy-manifest.json` (Zod) e implementa o Step 2
> que migra `.claude/planning/` e escreve o manifest tipado.

#### Plano 03: Steps 3-4 — Scaffold + Link + GH Files (~3h)
> Implementa scaffold-full-tree (skip-if-exists, sem dry-run branch), link-claude-agents
> (preserva CLAUDE.md), install-gh-files (templates estaticos).

#### Plano 04: Step 5 — Generate Populate Plans (CORE) (~9h)
> Reescreve `populate-plan-generator.ts` com template Andre + 16 instrucoes hardcoded por doc
> + injecao stack-aware (Node vs Rails) + writer dos 16 PLAN.md. Inclui DR-2 (abort se stack
> desconhecida).

#### Plano 05: Steps 6-8 + Validation + E2E final (~5h)
> Implementa delivery-loop interativo, copy-knowledge stack-aware, final-validation warning-mode.
> Atualiza `harness-validate` para 4 docs extras AVC. Suite e2e completa cobrindo CA-01..CA-09.

---

## Review Checklist

- [ ] Todos os 5 planos tem PLAN.md/MEMORY.md gerados em `planoNN/`
- [ ] Cada fase de cada plano tem checklist binario verificavel
- [ ] Tracer bullet (Plano 01 fase-06) referenciado em todos os planos como dependencia upstream
- [ ] Grafo de dependencias entre planos e aciclico
- [ ] Riscos R1-R6 tem mitigacao atribuida a fase especifica
- [ ] Decisoes DR-1 a DR-5 (riscos) e D1-D19 (CONTEXT) referenciadas nas fases relevantes
- [ ] Nenhum plano referencia step deletado fora do Plano 01 fase-05
- [ ] Override do RF-11 (DR-2) documentado no Plano 04

---

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

---

## Compound Opportunity

<!-- preencher ao /iterate: o que merece virar compound note? -->

Candidatos antecipados:
- Estrategia "stubs primeiro, tracer, depois delete" para refactors grandes de pipeline
- Schema compartilhado writer/reader via Zod (DR-5) como padrao AVC
- Auditoria de coverage antes de delete (DR-4) como padrao

---

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

---

## Exit Criteria

- [ ] CA-01 ate CA-09 do PRD validados via testes automatizados (RF-08)
- [ ] `bun run test && bun run lint` verde
- [ ] `bun run harness:validate` em projeto fixture passa sem warnings inesperados
- [ ] Init completo em fixture Node.js < 30s (NFR performance)
- [ ] Zero referencias a steps deletados em `skills/init/lib/` (grep limpo)
- [ ] PRD `status: approved` movido para `status: shipped` apos merge

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|----------------|
| D1 — Refatoracao incremental | Plano 01 (mantem contratos AbortError/StepContext) |
| D2 — Testes reescritos junto | Plano 01 fase-01 (audit) + Plano 05 (e2e final) |
| D3 — Remover backup/guards/cache | Plano 01 fase-05 (delete) |
| D4 — Remover dry-run | Plano 01 fase-05 + Plano 03 (scaffold sem dry-run branch) |
| D5 — Remover capabilities discovery | Plano 01 fase-05 |
| D6 — `.claude/legacy-manifest.json` em disco | Plano 02 |
| D7 — progress.txt como compound source | Plano 02 fase-02 (writer) |
| D8 — Init migra apenas planning, execute-plan le manifest | Plano 02 fase-03 + Plano 04 |
| D9 — Detect stack early | Plano 01 fase-02 |
| D10 — 16 planos individuais formato Andre | Plano 04 |
| D11 — ARCHITECTURE.md vira plano individual | Plano 04 (1 dos 16) |
| D12 — Nova ordem dos 8 steps | Plano 01 fase-04 (registry) |
| D14 — Compatibilidade v6.7 | Plano 01 fase-03 (gate re-entry, DR-1) |
| D15 — Init cria placeholders, LLM popula | Plano 03 + Plano 04 |
| D16 — CLAUDE.md preservar sempre | Plano 03 fase-02 (link-claude-agents) |
| D17 — Bugs CONVERSA_INIT | Plano 01 fase-05 (somem com D3) + Plano 03 (skip-if-exists) |
| D18 — Lista exata dos 16 docs | Plano 04 (hardcoded) |
| D19 — Formato + nivel de instrucao | Plano 04 (template + 16 instrucoes) |
| **DR-1** — Re-entry gate via manifest existente | Plano 01 fase-03 |
| **DR-2** — Abort Step 5 se stack desconhecida (override RF-11) | Plano 04 |
| **DR-4** — Audit coverage antes de delete | Plano 01 fase-01 |
| **DR-5** — Zod schema compartilhado | Plano 02 fase-01 |

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
