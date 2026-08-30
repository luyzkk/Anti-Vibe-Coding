# Plano 03: Atoms T2 (waves) + Verifier

**Feature:** Stack Knowledge Python ([PLAN overview](../PLAN.md))
**Fases:** 10 (fase-01 a fase-10)
**Sizing total:** ~14.5h nominal (envelope ~13-15h do PLAN; G12 corta loop cego de verifier)
**Depende de:** Plano 02 (6 átomos T1 commitados, verifier-report-plano02 como formato de referência, protocolo extrator+verifier calibrado, resultado do rastreio ECC no MEMORY)
**Desbloqueia:** Plano 04 (T3 + INDEX final + audit humano + E2E full)

---

## O que este plano entrega

Os 9 átomos T2 em `knowledge/python/atoms/` (architecture/DI, api-design, sqlalchemy, migrations,
deps/uv, tooling, smells, deployment, performance) — todos PT-BR (D1), ≤200 linhas, frontmatter
schema Rails + `python_versions`, `sources:` apontando `Infos/knowledge/Python/` (RF13). O batch
fecha com o verifier refined ≥80% sobre os 9 átomos (relatório `verifier-report-plano03.md`
commitado). Ao fim, 15/18 átomos estão no repo verificados — restando só os 3 T3 do Plano 04.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| 6 átomos T1 commitados (`async-and-concurrency` + 5 do Plano 02) | Plano 01 fase-03 + Plano 02 fases 01-05 | pendente (verificar com `ls knowledge/python/atoms/` + `git log`) |
| `verifier-report-plano02.md` (formato de relatório de batch a reusar) | Plano 02 fase-06 | pendente |
| Protocolo extrator + verifier calibrado (ajustes de prompt registrados) | `plano02/MEMORY.md` seção "Notas para Planos Seguintes" | pendente |
| Resultado do rastreio ECC (RF12) — a fase-05 cita compass 0e7023f8 §18 | Plano 02 fase-06 → MEMORY | pendente |
| Fontes T2 congeladas em `Infos/knowledge/Python/` (gitignored) | Triagem do PRD | pronto |
| Compound lessons anti-drift + verifier refined | `docs/compound/2026-05-16-*.md` | pronto (regression obrigatória) |

**Pré-flight obrigatório** (lição `feedback_verify_memory_vs_code`): antes da Wave 1, verificar
NO CÓDIGO que as precondições dos Planos 01-02 foram commitadas — `git log --oneline` na branch
base + `ls knowledge/python/atoms/` (6 átomos T1 presentes) + `bun test atoms-frontmatter-validator`
verde. Não confiar apenas no MEMORY do Plano 02.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 9 átomos T2 (`architecture-and-di-fastapi`, `api-design-and-contracts`, `sqlalchemy-async-and-orm`, `migrations-and-schema-evolution`, `dependencies-and-packaging-uv`, `tooling-ruff-mypy-precommit`, `code-smells-and-refactoring`, `deployment-and-production`, `performance-and-profiling`) | Plano 04 fase-04 (INDEX final roteia) + fase-07 (e2e full 18/18) |
| `sqlalchemy-async-and-orm` flagged para audit humano (`flagged_for_human_audit: true`) | Plano 04 fase-06 (audit D11) |
| `verifier-report-plano03.md` (maior batch da feature — 9 átomos) | Plano 04 fase-05 (verifier T3 reusa formato) |
| Material excluído do api-design (GraphQL/gRPC/tRPC intocado no report3) | Plano 04 fase-03 (`graphql-grpc-contracts`, D6) |
| Eventuais excedentes de cap 200 registrados no `TODO.md` | Backlog pós-feature (precedente R8 Next) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-architecture-and-di-fastapi.md | Átomo T2 arquitetura/DI FastAPI (§12 tells filtrada) | S ~1.5h | Plano 02 (Wave 1 — independente das fases 02-09) |
| 02 | fase-02-api-design-and-contracts.md | Átomo T2 api-design (**R4**: 39 regras, cap vigiado, P0-P3 decide) | S ~1.5h | Plano 02 (Wave 1) |
| 03 | fase-03-sqlalchemy-async-and-orm.md | Átomo T2 SQLAlchemy async/ORM (**flagged audit D11**) | S ~1.5h | Plano 02 (Wave 1) |
| 04 | fase-04-migrations-and-schema-evolution.md | Átomo T2 migrations/schema (split 2/2 do report.md) | S ~1h | Plano 02 (Wave 2 — independente das demais) |
| 05 | fase-05-dependencies-and-packaging-uv.md | Átomo T2 deps/packaging uv (2 fontes) | S ~1.5h | Plano 02 (Wave 2) |
| 06 | fase-06-tooling-ruff-mypy-precommit.md | Átomo T2 tooling Ruff/mypy/pre-commit (dedup typing) | S ~1h | Plano 02 (Wave 2) |
| 07 | fase-07-code-smells-and-refactoring.md | Átomo T2 smells/refactoring (dedup async + fase-01) | S ~1.5h | Plano 02 (Wave 3 — independente das demais) |
| 08 | fase-08-deployment-and-production.md | Átomo T2 deployment/produção (dedup async + fase-04) | S ~1.5h | Plano 02 (Wave 3) |
| 09 | fase-09-performance-and-profiling.md | Átomo T2 performance (IDs `PERF-*` preservados) | S ~1.5h | Plano 02 (Wave 3) |
| 10 | fase-10-verifier-batch-t2.md | Verifier refined 9/9 ≥80% + `verifier-report-plano03.md` + PR | ~2h | fases 01-09 (fan-in) |

Sizing nominal: ~14.5h. O gate G12 (parar se ≥2 falharem v1) evita que ciclos extras de verifier
estourem o envelope de 15h — precedente Node: ~30min por ciclo extra.

---

## Grafo de Fases

```
              Plano 02 completo (T1 6/6 + verifier calibrado + rastreio ECC)
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
          v                           v                           v
      fase-01                     fase-02                     fase-03        <-- WAVE 1 (paralela)
  (architecture/DI)          (api-design, R4)          (sqlalchemy, audit D11)   commit 1
          |                           |                           |
          +---------------------------+---------------------------+
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
          v                           v                           v
      fase-04                     fase-05                     fase-06        <-- WAVE 2 (paralela)
    (migrations)                (deps/uv)                  (tooling)             commit 2
          |                           |                           |
          +---------------------------+---------------------------+
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
          v                           v                           v
      fase-07                     fase-08                     fase-09        <-- WAVE 3 (paralela)
      (smells)                 (deployment)               (performance)          commit 3
          |                           |                           |
          +---------------------------+---------------------------+
                                      |
                                      v
                                  fase-10                                    <-- FAN-IN sequencial
                        (verifier batch T2 9/9 + PR)                             commit 4
```

**Paralelismo possivel:**
- **Wave 1 = fases 01-03**, **Wave 2 = fases 04-06**, **Wave 3 = fases 07-09** — cada fase de
  átomo escreve exatamente 1 arquivo próprio em `knowledge/python/atoms/` (categoria "seguro
  paralelizar"; nenhum contrato compartilhado, nenhuma toca o INDEX.md — G11).
- Todas as 9 fases de átomo são independentes entre si; a divisão em waves de 3 segue o
  precedente Next/Plano 02: lote menor facilita o gate G12 e o review humano da wave.
- **fase-10 é fan-in sequencial** — só inicia com os 9 átomos escritos e commitados.
- `bun run harness:validate` verde após CADA wave, antes do commit da wave (G10).

---

## TDD Strategy

```
Ciclo por fase de átomo (test-after com gate próprio — conteúdo, não código):
1. EXTRAIR: subagente com anti-drift clause VERBATIM escreve o átomo
2. CHECK ESTRUTURAL: cap 200, 4 seções, frontmatter, zero placeholders (por máquina, na fase)
3. GATE DE FIDELIDADE: verifier refined batch na fase-10 (≥80% por átomo)
4. VERIFY: bun run harness:validate após cada wave, antes do commit
```

- **Nenhuma fase deste plano escreve código de runtime** — não há RED/GREEN clássico. O "RED"
  equivalente é o verifier reprovar claim não-rastreável; o "GREEN" é o rework cirúrgico.
- **Tracer Bullet deste plano:** N/A (tracer foi Plano 01; protocolo chega calibrado por 2 planos).

---

## Gotchas Conhecidos

G1-G13 herdados do Plano 02 (mesma numeração — as fases referenciam por ID); G14-G17 são novos
deste plano.

- **G1 — `Infos/` é gitignored:** fontes ficam locais; só o átomo destilado vai ao repo. Nunca
  `git add Infos/` (lição feedback_git_repo_scope). Paths em `sources:` referenciam arquivos
  gitignored de propósito — audit trail local (RF13).
- **G2 — Anti-drift + verifier VERBATIM (R8):** os textos das duas compound lessons entram
  copiados literalmente em TODOS os prompts de extrator (fases 01-09) e no prompt do verifier
  (fase-10) — não parafrasear. Fontes canônicas:
  `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` +
  `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`. O plan-verifier
  confirma a presença da cláusula antes de aceitar o batch.
- **G3 — Claims "contestado" nunca viram regra dura:** claim marcada como contestada na fonte
  vira nota em Critérios de decisão ("fonte marca como contestado") ou é omitida — NUNCA entra
  como padrão/anti-padrão prescritivo. Neste plano o caso mais visível é o repository pattern
  (Percival vs Bayer) na fase-03.
- **G4 — Normalização de versões entre fontes:** divergência (FastAPI 0.136 vs 0.141; Ruff 0.15
  vs 0.16) → usar a mais recente citada nas fontes do átomo. Conflito real de recomendação vira
  nota em Critérios de decisão. Versões FastAPI ficam inline no corpo (D9) — nunca em campo de
  frontmatter.
- **G5 — Cap 200 hard (R4):** verifier rejeita átomo >200 linhas de corpo. Excedente relevante
  NÃO se espreme — vira item de backlog no `TODO.md` da raiz (precedente R8 Next). Maior risco
  deste plano: fase-02 (39 regras-fonte) — usar a priorização P0-P3 da própria fonte para
  decidir o que sobrevive.
- **G6 — Tradução sem drift (D1):** fontes deste plano já são PT-BR; qualquer trecho EN/ES é
  traduzido na destilação SEM adicionar conteúdo — a claim permanece rastreável à passagem
  original (o verifier rastreia paráfrase cross-idioma).
- **G7 — `updated:` com data real de execução:** não copiar `2026-08-30` do planejamento se a
  fase executar em outro dia. Vale para os 9 frontmatters.
- **G8 — Campo extra `flagged_for_human_audit` passa no validador:** `validateAtomFrontmatter`
  ignora campos desconhecidos (G3 do Plano 01). A fase-03 usa o campo no frontmatter
  (precedente Next/Plano 02 fase-05) + nota no corpo. Confirmar validador verde mesmo assim.
- **G9 — Branch + PR sempre:** todo o plano roda em `feat/stack-knowledge-python-plano03`;
  nunca commit direto na main (lição feedback_branch-pr-never-main). PR ao final da fase-10.
- **G10 — `bun run harness:validate` após cada wave, antes do commit:** `atoms/` já contém 6
  átomos T1 — `[knowledge-presence]` satisfeita; cada wave é 1 commit próprio, sem bundle.
- **G11 — Nenhuma fase toca o INDEX.md:** INDEX consolidado é Plano 04 fase-04. Subagente que
  "aproveitar para atualizar o INDEX" está fora de escopo — rejeitar no review da wave.
- **G12 — Gate de loop do verifier (compound verifier-protocol, Prevention #3):** se ≥2 átomos
  do batch falharem a v1, PARAR e revisar o prompt do verifier (e/ou suspeitar de drift
  sistemático de extrator — compound anti-drift, Prevention #4) antes de rodar v2. Com 9 átomos
  no batch, este gate é mais provável de disparar do que no Plano 02 — respeitá-lo.
- **G13 — Rastreio ECC (D5/RF12):** resolvido no Plano 02 fase-06. A fase-05 deste plano cita
  compass 0e7023f8 §18 (fonte não-ECC) — nenhuma ação nova; apenas conferir no MEMORY do
  Plano 02 se algo mudou sobre NOTICES antes de citar fontes.
- **G14 — Fronteira do split `deep-research-report.md` (fases 03/04):** a MESMA fonte alimenta
  dois átomos. fase-03 = runtime ORM (sessões, queries, pooling, locking); fase-04 = evolução
  de schema (Alembic, zero-downtime, backfill, constraints). O prompt de cada extrator declara
  a fronteira e as seções exatas — claim de migração no átomo ORM (ou vice-versa) é defeito de
  wave, corrigir antes do commit.
- **G15 — Exclusão GraphQL/gRPC/tRPC no api-design (D6):** as seções GraphQL/gRPC/tRPC do
  report3 NÃO entram na fase-02 — são o átomo T3 `graphql-grpc-contracts` do Plano 04 fase-03.
  Grep de conferência na fase e na fase-10.
- **G16 — IDs canônicos `PERF-*` preservados (fase-09):** a fonte da fase-09 numera 24 regras
  com IDs `PERF-<CATEGORIA>-<NN>`. Os padrões destilados PRESERVAM o ID de origem (ex:
  "PERF-CACHE-02") — são a chave de rastreabilidade do verifier e o link de volta à fonte.
- **G17 — Dedup cross-átomo referencia, não duplica:** mapa de dedup deste plano —
  fase-06 → `typing-and-static-analysis` (mypy strict flag-a-flag fica lá);
  fase-07 → piloto `async-and-concurrency` (event loop/threadpool) + fase-01 (import-linter:
  lá contratos de camada, aqui métrica de débito/mecânica de refactor);
  fase-08 → piloto async (mecanismo de graceful shutdown; aqui o ângulo operacional) + fase-04
  (migrations: aqui só o gate de pipeline);
  fase-09 → fase-03 (PERF-DB: aqui medição/orçamento, correção ORM fica lá).
  Duplicação literal entre átomos é defeito — referenciar o átomo dono do assunto.

---

## Commits deste plano

| Commit | Conteúdo | Pré-condição |
|--------|----------|--------------|
| 1 | Wave 1: átomos das fases 01-03 | `bun run harness:validate` verde + checks estruturais das 3 fases |
| 2 | Wave 2: átomos das fases 04-06 | `bun run harness:validate` verde + checks estruturais das 3 fases |
| 3 | Wave 3: átomos das fases 07-09 | `bun run harness:validate` verde + checks estruturais das 3 fases |
| 4 | fase-10: `verifier-report-plano03.md` + MEMORY atualizado (+ TODO.md se houver excedente de cap) | verifier 9/9 ≥80% |

Rework de átomo pós-verifier entra no commit 4 (ou commit dedicado `fix(knowledge):` se o diff
for grande). Branch única `feat/stack-knowledge-python-plano03` → PR ao final da fase-10.

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
