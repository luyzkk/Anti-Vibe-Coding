---
title: "Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)"
mode: full
status: active
created: 2026-05-16
---

# Exec Plan: Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)

## Goal

- Entregar camada de conhecimento sênior stack-specific para Node+TS condensada do material em `claude-code/knowledge/Nodejs/` (~27k linhas → ~1.730 linhas, ~16× compressão), distribuída automaticamente via `/init` e citada pelas 7 skills cross-stack do plugin, preservando comportamento atual (CA-10) e mantendo o matrix extensível para Rails/Python/Go em versões futuras (D14).

## Scope

- **Plugin matrix:** `docs/knowledge/nodejs-typescript/INDEX.md` + 14 átomos em `atoms/*.md` (formato fixo: frontmatter + skeleton de corpo, ≤200 linhas cada).
- **Skill `/init`:** estendida para detecção multi-stack (primary+secondary), persistência em `.claude/stack.json`, cópia idempotente de `docs/knowledge/{primary}/` → `.claude/knowledge/`, flag `--refresh-knowledge`, telemetria `stack_detected`/`knowledge_copied`.
- **7 skills cross-stack:** `/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow` ganham bloco `<!-- stack-aware-preface:start -->` que cita `.claude/knowledge/INDEX.md` se existir (path fixo, D11/D13).
- **Quality gate:** cada batch de átomos passa por subagente verificador (sample audit ≥80% claims rastreáveis, CA-08) + auditoria humana mínima de 3 átomos por batch.
- **Out of scope:** outras stacks (Rails/Python/Go), drift detection, `_shared/`, update flow, cluster Keccak/Ethereum, skill `/detect-stack` separada (ver PRD §Won't Have).

## Assumptions

- Fontes em `claude-code/knowledge/Nodejs/` (15 pesquisas + 6 skill packages) permanecem inalteradas durante execução; frontmatter `sources:` aponta para elas como audit trail (RF11).
- Pasta `docs/knowledge/nodejs-typescript/` já contém `_catalog.md` e `_topic-plan.md` como work artifacts (a remover ao fim — gate v6.3.2).
- Existing `[skills/init/lib/detect-stack.ts](skills/init/lib/detect-stack.ts)` usa id `node-ts`; PRD usa `nodejs-typescript`. Reconciliação por alias ou rename no Plano 01 fase-03 (decisão local registrada na MEMORY do plano).
- Pattern `profile-aware-preface` existente em 5 das 7 skills alvo é template-reference para o novo `stack-aware-preface` (path fixo, mais simples que profile-aware).
- `bun run harness:validate` aceita a nova subárvore `docs/knowledge/` sem alterações de schema (validar no Plano 06 fase-06).

## Risks

- Compressão excessiva perde nuance crítica das pesquisas — mitigado por pilot atom (`type-system-idioms`) no Plano 01 antes do batch grande (PRD risk #1).
- Subagente verificador entrega false-positive "tudo OK" sem checar — fase dedicada de verifier + auditoria humana obrigatória de 3 átomos por batch nos Planos 04 e 05 (PRD risk #2, CA-08).
- Stack detection erra em projetos atípicos (monorepo Nx, Bun/Deno sem `package.json`) — telemetria registra; CA-06 garante fallback gracioso; overrides manuais ficam para iteração futura (PRD risk #3).
- `.claude/knowledge/` desatualizado vs matrix sem refresh manual — `--refresh-knowledge` documentado, CHANGELOG nota mudanças (PRD risk #4).
- Preface vira ruído quando knowledge não é relevante — preface é uma frase só, INDEX.md cita por keyword (PRD risk #5).
- **Naming reconciliação** `node-ts` (existente) ↔ `nodejs-typescript` (PRD/matrix) — risco de quebrar `/init` existente; resolvido no Plano 01 fase-03 com mapa de alias documentado em `MEMORY.md` do Plano 01.
- **CA-10 regressão** de `/init` se a extensão modificar comportamento atual de stack detection — coberto por teste E2E dedicado no Plano 02 fase-05.
- Re-scan de rules core-contributor-only (RF8) descobre mais nuggets que esperado, inflando átomo — cap de 200 linhas/átomo (NFR Manutenibilidade); excesso vira nota em outro átomo ou postergado.

## Execution Steps

### Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Tracer Bullet — matrix skeleton + pilot atom + minimal init + 1 skill wire | 5 | ~6-8h | — |
| 02 | Init enrichment — multi-stack, idempotent, `--refresh-knowledge`, telemetria | 5 | ~5-6h | 01 |
| 03 | Skill wire-up — 6 cross-stack skills restantes ganham `stack-aware-preface` | 3 | ~3-4h | 01 |
| 04 | Atom Batch A — 5 átomos tier 1 + backend core | 6 | ~8-10h | 01 |
| 05 | Atom Batch B — 5 átomos thin/security/testing/arch (inclui RF8 primordials) | 6 | ~7-9h | 01 |
| 06 | Atom Batch C + INDEX + Polish — 3 átomos tier 3 + INDEX consolidado + CA-01..10 | 6 | ~6-8h | 02, 03, 04, 05 |

**Total:** 31 fases, ~35-45h.

### Grafo de Dependências

```
Plano 01 (Tracer Bullet)
    |
    +----------+----------+----------+
    |          |          |          |
    v          v          v          v
Plano 02   Plano 03   Plano 04   Plano 05
    |          |          |          |
    +----------+----------+----------+
                 |
                 v
           Plano 06 (Polish + INDEX)
```

**Paralelismo possível:** após Plano 01 completar, os planos 02, 03, 04 e 05 podem ser executados em paralelo (não compartilham arquivos). Plano 06 é sequencial após todos.

### Tracer Bullet

- **Plano:** 01
- **Fase:** fase-01 a fase-05 (slice end-to-end completo)
- **Descrição:** pilot atom `type-system-idioms.md` (tier 1, recomendado em `_topic-plan.md:142`) + `INDEX.md` mínimo + extensão **monostack** de `/init` (Node+TS only) gravando `.claude/stack.json` simples e copiando para `.claude/knowledge/` + bloco `stack-aware-preface` em `/security` lendo path fixo `.claude/knowledge/INDEX.md`. Prova **CA-02 + CA-05 + CA-09** end-to-end antes de investir nos 13 átomos restantes, multi-stack e nas demais 6 skills.

### Resumo por Plano

#### Plano 01 — Tracer Bullet
> Slice end-to-end mínimo: 1 átomo piloto + INDEX skeleton + `/init` monostack + 1 skill wired. Valida arquitetura antes de escalar.

Fases planejadas (criadas pelo subagente no Step 9):
- fase-01: scaffold matrix skeleton (INDEX.md mínimo + frontmatter de pilot)
- fase-02: escrita do pilot atom `type-system-idioms.md`
- fase-03: extensão monostack de `/init` (detecta Node+TS, escreve `.claude/stack.json`, copia matrix)
- fase-04: wire `/security` com `<!-- stack-aware-preface:start -->`
- fase-05: E2E happy path (CA-02 + CA-05 + CA-09 verificados)

#### Plano 02 — Init Enrichment
> Eleva `/init` de monostack para multi-stack production-grade: primary+secondary, anchor_files, idempotent default, `--refresh-knowledge`, telemetria.

Fases planejadas:
- fase-01: multi-stack detection (primary+secondary com anchor_files)
- fase-02: `stack.json` schema final + writer com timestamp
- fase-03: idempotent default + flag `--refresh-knowledge`
- fase-04: telemetria (`stack_detected`, `knowledge_copied`) via `lib/telemetry-utils.ts`
- fase-05: edge cases CA-03 (Rails puro), CA-06 (sem anchor), CA-07 (multi-stack), CA-10 (regressão `/init`)

#### Plano 03 — Skill Wire-up (6 restantes)
> Adiciona `stack-aware-preface` em `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`. Mecânico, paralelizável.

Fases planejadas:
- fase-01: wire batch 1 (api-design, system-design, design-patterns — já têm profile-aware)
- fase-02: wire batch 2 (architecture, infrastructure, tdd-workflow — infrastructure/tdd-workflow são greenfield)
- fase-03: verificação CA-05 (preface aparece) + CA-09 (graceful degradation sem `.claude/knowledge/`)

#### Plano 04 — Atom Batch A (5 átomos tier 1 + backend core)
> Subagentes extratores em paralelo, batch de 5 átomos, fechado com verifier + auditoria humana de 3 átomos.

Fases planejadas:
- fase-01: `async-concurrency-streams.md` (tier 1, fonte `cbfb8720` + libuv-*)
- fase-02: `error-handling-observability.md` (tier 1, fonte `e4ce81c8`)
- fase-03: `data-persistence.md` (tier 2 backend, fonte `deadf855`)
- fase-04: `state-and-caching.md` (tier 2, fonte `b407bc0c`)
- fase-05: `code-smells-catalog.md` (tier 2, fonte `98973791`)
- fase-06: verifier sanity check (≥80% claims rastreáveis) + auditoria humana 1 tier 1 + 1 tier 2 + 1 tier 2 alternativo (CA-08)

#### Plano 05 — Atom Batch B (5 átomos thin/security/testing/arch + RF8)
> Inclui os 2 átomos thin (api-design/security stack-specific) que complementam skills sem duplicar. Inclui migração de primordials (RF8/D12).

Fases planejadas:
- fase-01: `api-design-stack-specific.md` (thin ~80 linhas, fonte `26cc8f92`)
- fase-02: `security-stack-specific.md` (thin ~80 linhas + RF8: conteúdo de `primordials.md` migrado)
- fase-03: `testing-strategy.md` (tier 2, fonte `ab2553f8`)
- fase-04: `architecture-conventions.md` (tier 2, fontes `3f1af213` + skill packages)
- fase-05: `dependencies-supply-chain.md` (tier 2, fonte `deps-kb`)
- fase-06: verifier sanity check + auditoria humana 3 átomos (CA-08)

#### Plano 06 — Atom Batch C + INDEX + Polish
> Fecha os 3 átomos tier 3, consolida o INDEX.md final (keyword/layer/tier maps), implementa Could Have (RF10, RF11) e roda E2E completo de CA-01..CA-10.

Fases planejadas:
- fase-01: `performance-and-internals.md` (tier 3, fontes `55c3ca89` + v8-* rules + native-memory)
- fase-02: `operations-and-deploy.md` (tier 3, fonte `21a08436`)
- fase-03: `tooling.md` (tier 3, fonte `0058a9e6`)
- fase-04: INDEX.md final (mapa por keyword, layer, tier — substitui skeleton do Plano 01)
- fase-05: RF10 (preview de keywords no output do `/init`) + RF11 (audit-trail paths no frontmatter `sources:`)
- fase-06: E2E completo CA-01..CA-10 + `bun run harness:validate` + remoção de `_catalog.md`/`_topic-plan.md` (work artifacts)

## Review Checklist

- [ ] CA-01 — 14 átomos + INDEX no matrix, frontmatter completo, ≤200 linhas, sem `[A DEFINIR]`
- [ ] CA-02 — `/init` em projeto Node+TS cria `.claude/stack.json` + copia 14 átomos em ≤100ms
- [ ] CA-03 — `/init` em Rails puro cria `stack.json` com `primary: rails`, sem copiar átomos Node+TS
- [ ] CA-04 — `/init` com `.claude/knowledge/` pré-existente preserva e informa sobre `--refresh-knowledge`
- [ ] CA-05 — Skills cross-stack começam resposta citando `.claude/knowledge/INDEX.md` quando existe
- [ ] CA-06 — Projeto sem anchor reconhecível: `primary: null`, sem crash
- [ ] CA-07 — Multi-stack Rails+Node frontend: `primary: rails`, `secondary: [nodejs-typescript]`
- [ ] CA-08 — Verifier sanity check ≥80% claims rastreáveis; auditoria humana de 3 átomos (1 tier 1, 1 tier 2, 1 tier 3) antes de aprovar cada batch
- [ ] CA-09 — Skills cross-stack mantêm comportamento original sem `.claude/knowledge/INDEX.md` (graceful degradation)
- [ ] CA-10 — `/init` mantém UX atual além do output novo sobre stack
- [ ] `bun run test && bun run lint && bun run typecheck` verdes
- [ ] `bun run harness:validate` verde com a nova subárvore `docs/knowledge/`
- [ ] Work artifacts `_catalog.md` e `_topic-plan.md` removidos ao fim do Plano 06
- [ ] Telemetria emite `stack_detected` e `knowledge_copied` quando `/init` roda

## Validation Log

### Plano 01 — Tracer Bullet (2026-05-16)

- `bun test tests/e2e/stack-knowledge-tracer-bullet.test.ts` → 4 passed, 0 failed (65ms total)
- CA-02 measured: durationMs < 100ms com 1 átomo (type-system-idioms.md); file copy quase instantâneo em SSD Windows
- CA-05: preface emitido contém path `.claude/knowledge/INDEX.md` ✓
- CA-09: preface vazio quando INDEX ausente, sem warning ou crash ✓
- Regression: `skills/security/SKILL.md` contém `<!-- stack-aware-preface:start -->` e `:end -->` ✓
- `bun run test:e2e` (suite completa): 12 passed, 1 skip, 0 failed — sem regressão em init-tracer-bullet ou migration ✓
- `bun run typecheck`: 2 erros pré-existentes em `subagent-contract.ts` (GT-3 baseline) — nenhum erro novo ✓
- Arquitetura validada: tracer bullet completo. Planos 02-06 podem prosseguir em paralelo.

## Compound Opportunity

<!-- preencher ao /iterate: o que merece virar compound note? -->

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

## Exit Criteria

- [ ] Todos os 10 itens do Review Checklist marcados ✓
- [ ] Plano 06 fase-06 concluído (E2E CA-01..CA-10 verde)
- [ ] PRD movido de `docs/exec-plans/active/` para `docs/exec-plans/completed/` via `/iterate` ou manualmente
- [ ] `compound/` atualizado se algum aprendizado emergir (verifier false-positive, naming reconciliação, etc.) — gate da CLAUDE.md
- [ ] CHANGELOG/release-notes do plugin notam v6.3.2 com sumário do knowledge layer

---

## Decisões do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|---------------|
| D1 — knowledge em `docs/knowledge/{stack}/` | Todos os planos (matrix) |
| D2 — stack como unidade (não linguagem) | Plano 01 (nome da pasta), Planos 04-06 (frontmatter `stack:`) |
| D3 — 14 átomos consolidados | Distribuído entre Planos 01 (1 pilot), 04 (5), 05 (5), 06 (3) |
| D4 — 1 PRD + planos internos | Estrutura geral deste PLAN.md |
| D11 — preface lê path fixo `.claude/knowledge/INDEX.md` | Planos 01 fase-04 e 03 |
| D12 — `primordials.md` migra para `security-stack-specific.md` | Plano 05 fase-02 (RF8) |
| D13 — stack detection one-shot no `/init` (não runtime) | Planos 01 fase-03 e 02 |
| D14 — init-time copy do matrix | Planos 01 fase-03 e 02 fase-03 |
| D15 — primário + secundário (multi-stack auto detect) | Plano 02 fase-01 |
| D16 — `.claude/knowledge/` pré-existente: skip idempotente | Plano 02 fase-03 (CA-04) |
| D17 — `updated: YYYY-MM-DD` no frontmatter | Planos 01 fase-01 (template), 04-06 (cada átomo) |
| D18 — AI-extraction + sanity check via subagente verificador | Planos 04 fase-06 e 05 fase-06 (CA-08) |
| D19 — estender `/init` (não criar `/detect-stack`) | Planos 01 fase-03 e 02 |

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
