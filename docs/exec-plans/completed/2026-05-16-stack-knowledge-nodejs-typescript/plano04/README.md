# Plano 04: Atom Batch A — 5 átomos tier 1 + backend core

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2) ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~9-11h
**Depende de:** Plano 01 (pilot atom `type-system-idioms.md` define formato; pasta `atoms/` existindo)
**Desbloqueia:** Plano 06 fase-04 (INDEX final consolidado consome 5/14 átomos populados); Plano 05 fase-06 (replica o padrão verifier subagente + auditoria humana para Batch B)

---

## O que este plano entrega

5 átomos populados em `docs/knowledge/nodejs-typescript/atoms/` (async-concurrency-streams, error-handling-observability, data-persistence, state-and-caching, code-smells-catalog), todos seguindo verbatim o frontmatter e o skeleton do átomo piloto, cap de 200 linhas cada, fechados por gate de qualidade (subagente verificador em sample audit ≥80% claims rastreáveis + auditoria humana mínima de 3 átomos do batch — CA-08). Batch A cobre 2 átomos tier 1 críticos (async + errors) e 3 átomos tier 2 backend-heavy (persistence, state, smells).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Átomo piloto `type-system-idioms.md` como template de formato (frontmatter + 5 seções do corpo) | Plano 01 fase-02 | pendente |
| Pasta `docs/knowledge/nodejs-typescript/atoms/` existindo | Plano 01 fase-01 | pendente |
| Decisões D1, D2, D3, D17, D18 do PRD (knowledge em `docs/knowledge/{stack}/`, stack como unidade, 14 átomos, `updated:` no frontmatter, AI-extraction + sanity check) | PRD.md | pronto |
| Fontes em `claude-code/knowledge/Nodejs/wf-{compass-id}.md` para os 5 átomos (`cbfb8720`, `e4ce81c8`, `deadf855`, `b407bc0c`, `98973791` + libuv-*/streams-internals rules) | `_catalog.md` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 5 átomos populados em `atoms/` (5/14 do matrix) | Plano 06 fase-04 (INDEX final consolidado precisa de keyword/layer/tier maps dos 14 átomos) |
| Padrão de **verifier subagente + auditoria humana** como gate de batch (fase-06) | Plano 05 fase-06 (replica o mesmo gate para Batch B — 5 átomos thin/security/testing/arch) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-async-concurrency-streams.md | átomo tier 1 ~140 ln (event loop + structured concurrency + streams + workers) | 2h | piloto (Plano 01 fase-02) |
| 02 | fase-02-error-handling-observability.md | átomo tier 1 ~140 ln (Pino, OpenTelemetry, AsyncLocalStorage, RED/USE, LGPD) | 2h | piloto |
| 03 | fase-03-data-persistence.md | átomo tier 2 ~140 ln (Prisma 7 vs Drizzle v1 vs Kysely, N+1, RLS multi-tenant, migrations zero-downtime) | 1.5-2h | piloto |
| 04 | fase-04-state-and-caching.md | átomo tier 2 ~120 ln (in-memory, AsyncLocalStorage request-scoped, Redis distribuído, invalidation) | 1.5h | piloto |
| 05 | fase-05-code-smells-catalog.md | átomo tier 2 ~150 ln (8-12 smells Node+TS agudos: type/async/boundary/error/structure) | 1.5-2h | piloto |
| 06 | fase-06-verifier-sanity-check.md | verifier subagente (5 invocações isoladas) + auditoria humana 3 átomos (CA-08) | 1.5h | fase-01..05 |

---

## Grafo de Fases

```
        piloto (Plano 01 fase-02)
              |
   +----------+----------+----------+----------+
   |          |          |          |          |
   v          v          v          v          v
fase-01    fase-02    fase-03    fase-04    fase-05
(async)   (errors)  (persist.)  (state)    (smells)
   |          |          |          |          |
   +----------+----------+----------+----------+
                         |
                         v
                 fase-06 (verifier + auditoria)
```

**Paralelismo possivel:** após o átomo piloto estar pronto (Plano 01 fase-02), as 5 fases de escrita de átomos (fase-01..05) podem ser executadas em paralelo por subagentes extratores independentes — nenhuma compartilha arquivos. Fase-06 é sequencial e fecha o ciclo, pois depende dos 5 átomos escritos para rodar o verifier e a auditoria humana.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Fases 01-05 são **content-only** (markdown puro, sem código TS novo): usam checklist de validação de conteúdo em vez de RED→GREEN, igual à fase-02 do Plano 01 (átomo piloto). Fase-06 também é content-only mas adiciona um gate de processo (spawn de verifier + auditoria humana) cujo veredito é registrado em MEMORY.md.

**Tracer Bullet deste plano:** N/A — o tracer bullet vive no Plano 01 fase-05 e já validou a arquitetura matrix → init → projeto → skill end-to-end. Plano 04 é escala em conteúdo, não em arquitetura.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Formato copiado do piloto (zero drift):** qualquer divergência em frontmatter (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`) ou nas 5 seções do corpo (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas) invalida CA-01. Manter verbatim com o piloto (`docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md`).
- **G2 — Cap de 200 linhas é asserado em cada fase (G3 herdado do Plano 01):** se um átomo passar de 200 linhas, sinal de granularidade errada — split em outro átomo ou condensar. `_topic-plan.md:53-66` traz o tamanho alvo por átomo (120-150 linhas é a faixa saudável).
- **G3 — fase-06 verifier é subagente ISOLADO (PRD risk #2):** false-positive "tudo OK" sem checar de verdade é risco real. O prompt do verifier obriga **citar passagem específica (parágrafo ou linhas) da fonte** para cada claim auditada — não aceitar veredito sem citação. Spawn um verifier por átomo (5 invocações independentes) para evitar context bleed.
- **G4 — Auditoria humana é bloqueante:** 3 átomos amostrados (1 tier 1 + 1 tier 2 + 1 tier 2 alternativo — ver nota de divergência abaixo) antes de aprovar batch. Aprovação registrada em MEMORY.md como DI-3 com data e nome do auditor.
- **G5 — Overlaps com skills cross-stack (mapping de `_catalog.md` cluster→skill):** cada átomo cita `/skill-relacionada` em "Referências externas" para evitar duplicação. Skill cobre cross-stack (princípio geral); átomo cobre Node+TS-specific (idioma da stack). Sempre que tentar explicar conceito genérico (ex: "o que é cache invalidation"), parar e linkar — o átomo é sobre o ângulo Node+TS, não sobre o conceito.
- **G6 — Fontes brutas em `claude-code/knowledge/Nodejs/wf-{compass-id}.md`:** frontmatter `sources:` aponta para o **compass-id** (sem path), não para o caminho do arquivo (RF11 e Could Have do PRD). O path absoluto pode ser citado **no corpo** em "Referências externas" como audit trail. Padrão do piloto: `sources: [{research: f8f4e50c}, {research: 2230af87}]`.
- **G7 — Átomos do Plano 04 são escritos em PARALELO:** fase-01 a fase-05 não têm dependência entre si — todas dependem apenas do piloto (formato). `/execute-plan` pode despachar 5 subagentes extratores simultâneos. Fase-06 fecha o ciclo e depende das 5 anteriores.

### Nota de divergência PRD vs PLAN sobre auditoria humana (registrar em MEMORY.md)

- PRD CA-08 (linha 242) usa: "1 tier 1 + 1 tier 2 + 1 tier 3"
- PLAN.md secão "Plano 04 fase-06" (linha 119) usa: "1 tier 1 + 1 tier 2 + 1 tier 2 alternativo"
- **Resolução:** seguir o PLAN.md neste batch — Plano 04 só contém átomos tier 1 e tier 2 (sem tier 3); átomos tier 3 ficam para o Plano 06. Auditar 1 tier 1 + 1 tier 2 + 1 tier 2 alternativo é a forma operacionalizável aqui. Divergência registrada em MEMORY.md.

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
