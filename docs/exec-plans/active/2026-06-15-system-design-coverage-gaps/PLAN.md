---
title: "System Design Coverage Gaps (Síntese de Conhecimento)"
mode: full
status: active
created: 2026-06-15
---

# Exec Plan: System Design Coverage Gaps (Síntese de Conhecimento)

**PRD:** ./PRD.md
**Context:** ./CONTEXT.md
**Schema:** ./extraction-schema.md · **Fontes:** ./sources-manifest.md
**Planos:** 4 planos, 23 fases total, ~38h
**Created:** 2026-06-15
**Tracer Bullet:** Plano 01, fase-01 — uma fonte (`pubsub-nao-mq`) percorre Normalizar → Extrair → sintetizar 1 conceito → 1 entrada-stub de manifesto, provando disco+isolamento+schema-9-campos+citação-obrigatória+`misconception-flag` **antes** de escalar para 32 fontes.

**Decisão central:** **NÃO é feature de código — é síntese de conhecimento.** Os modos de falha são perda de informação, conflito mal-resolvido, descarte silencioso e alucinação — não bugs de runtime. O mecanismo é um pipeline de 6 fases que conversa **por arquivos em disco** (nunca um contexto único), com subagentes isolados (1/fonte na extração, 1/conceito na síntese, 1/arquivo-alvo na aplicação). **Ondas × Pipeline:** Normalizar+Extrair são cross-cutting (Plano 01 de fundação, porque conceitos atravessam ondas — ex.: Brooker/resiliência alimenta o conceito de retries de Filas); Síntese→Verificação rodam por onda (Planos 02/03/04), cada onda entregando independente (D7: "resiliência não atrasa Filas").

---

## Goal

Fechar os 3 buracos de System Design do plugin — **Filas/Mensageria** (cobertura ~zero), **SQL-internals** (parcial), **DNS routing policies** (parcial) — sintetizando um corpus de 32 fontes sênior in-scope em entradas canônicas formato-consultor (quando usar / quando NÃO / árvore de decisão / anti-patterns), com **toda afirmação framework-específica citada** (`fonte:`), **zero descarte silencioso** (audit fonte→átomo→alvo OU OUT-com-motivo) e **cobertura existente intocada** (só extensão + cross-link). Resiliência existente fica reforçada como enriquecimento (Onda 3). Nenhuma edição de skill ocorre sem aprovação do `edit-manifest.md` (gate humano por onda).

---

## Scope

**In:**
- **Plano 01 (Fundação):** Fase 0 Normalizar + Fase 1 Extração das 32 fontes in-scope → `Infos/_pipeline/normalized/` + `atoms/` (gitignored, D8) + audit de cobertura.
- **Plano 02 (Onda 1 — Filas, Must):** Fase 2→5 dos ~16 conceitos de filas. Nova(s) reference(s) em `system-design` + seção no `SKILL.md` + keywords na `description` (M4) + sync `hooks/hooks.json` + cross-link do blurb AMQP em `api-design/references/api-protocols.md` (M3). Resolve C1/C2/C5/C8 via tensão+regra (D4).
- **Plano 03 (Onda 2 — SQL-internals + DNS-routing, Must):** dois sub-tracks. SQL → `system-design` (índices, B-tree/B+tree, WAL, ACID+BASE [D9] + camada `referencia-oficial` D6 para EXPLAIN/partições); DNS → estende `infrastructure/references/dns-hosting.md` (7 políticas Route 53). Cross-links S4. Resolve C6/C7/C9.
- **Plano 04 (Onda 3 — Resiliência, Should/Could):** **enriquece** `defensive-patterns` + `system-design` + `infrastructure` (Brooker/Yanacek/Gabrielson/MacCárthaigh). Resolve tensões C3/C4. **Zero reference nova** — só extensão + cross-link.

**Out (Won't do — PRD):**
- As 3 fontes OUT (`object-calisthenics`, `restful-grpc`, `custo-dependencias`) — registradas no manifesto, não sintetizadas.
- Reescrita de cobertura existente de System Design (CAP, cache, LB, replicação/sharding, CQRS) — só extensão + cross-link (CA-07).
- Geração de código de feature / tutorial passo-a-passo de setup.
- **Qualquer edição de skill antes da aprovação do manifesto** (CA-06) e qualquer execução de Fase 0/1→5 **nesta sessão de planejamento** (só após aprovação deste plano).
- O órfão legacy `.planning/plano08-audit-D29.md` (não relacionado a esta feature — limpeza separada).

---

## Assumptions

- **P1** — Atualizar `description` do SKILL.md não quebra teste (não há keyword-parity test; só wire tests `stack-aware-preface-wire` + `*-prefaces`). Validar: `bun test` nas skills tocadas após cada Fase 4. *(grep confirmou ausência de keyword-parity test; `system-design/SKILL.md` tem `disable-model-invocation: false` → o hook PODE dispará-la.)*
- **P2** — A regra de decisão do conflito exactly-once (idempotent consumer) é a altitude certa. Validar: passe adversarial doubt-driven (Fase 5, Plano 02) + revisão do Navegador.
- **P3** — `hooks/hooks.json` é a única superfície de advisor one-liner (grep confirmou 1 arquivo; revalidar antes de cada Fase 4).
- **P4** — Doc oficial Postgres/MySQL (D6) supre EXPLAIN/partitioning sem conflitar com o corpus. Validar: marcar `referencia-oficial` + flag `unverified` até revisão (Plano 03 fase-06).
- **P5** — Granularidade de references (Filas 2-3, SQL 1-2, DNS 1) cabe sem inchar. Decidir no manifesto (Fase 3) com volume real de átomos.
- Atom-store completo é **pré-requisito duro** de toda síntese — nenhuma onda começa a Fase 2 antes do audit do Plano 01 fechar (senão síntese de Filas sai incompleta por fonte cross-bucket).

---

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **R1** Mudar `description` quebra wire/prefaces test | Baixa | Médio | `bun test` por skill após cada Fase 4 (CA-05); grep confirmou ausência de keyword-parity test |
| **R2** `system-design/SKILL.md` é tocado por **3 ondas** (Filas, SQL, resiliência) → conflito/divergência se editado em paralelo | Média | Médio | **Serialização de contrato:** ondas serializam nas edições desse arquivo (cada Fase 4 o assume em sequência 02→03→04). Síntese pode rodar paralela; aplicação não. Categoria "precisa de coordenação" da Parallelization Safety |
| **R3** Conflito mal-resolvido → afirmação errada persistida | Média | Alto | D4 (tensão+regra) + passe adversarial doubt-driven nas 2-3 fontes mais valiosas (Plano 02/03 fase-verificação) + revisão humana |
| **R4** Escopo grande (32 fontes) degrada contexto | Média | Alto | Subagentes isolados (1/fonte extração, 1/conceito síntese) + filesystem-as-state; nenhuma fase carrega o corpus inteiro |
| **R5** Doc oficial (D6) diverge do canônico atual | Baixa | Médio | Marcar `referencia-oficial` + flag `unverified` + revisão (Plano 03) |
| **R6** Fontes com equívoco (D10) persistem afirmação errada (ex: `pubsub-nao-mq` trata exactly-once como selecionável) | Baixa | Alto | `misconception-flag` no átomo; síntese corrige explicitamente + cita Treat/Kreps (M2/CA-04) |
| **R7** References incham (granularidade errada) | Média | Baixo | Decidir granularidade no manifesto (P5) com volume real de átomos, sob o gate humano |
| **R8** Descarte silencioso de fonte/átomo | Baixa | Alto | Audit de cobertura obrigatório (Plano 01 fase-05 + fase final de cada onda): toda fonte in-scope → ≥1 átomo → alvo, OU OUT-com-motivo (CA-01) |

---

## Execution Steps

### Mapeamento Pipeline-de-6-Fases → Planos (a reconciliação central)

| Fase do Pipeline (PRD) | Onde executa | Output em disco |
|---|---|---|
| **Fase 0 — Normalizar** | Plano 01 fase-02 | `Infos/_pipeline/normalized/{source_id}.md` |
| **Fase 0.5 — Triagem** ✅ | (pré-requisito, concluída) | `triage/triage-results.json` |
| **Fase 1 — Extração** (1/fonte) | Plano 01 fase-03 (Filas) + fase-04 (SQL/DNS/Resil.) | `atoms/{source_id}/*.md` |
| **Fase 2 — Síntese** (1/conceito) | Planos 02/03/04 (fases de síntese) | `synthesis/{concept-slug}.md` |
| **Fase 3 — Manifesto** | Planos 02/03/04 (fase-manifesto) — seções do **`edit-manifest.md` único** | `docs/exec-plans/active/.../edit-manifest.md` |
| **— GATE HUMANO —** | entre manifesto e aplicação de **cada onda** (D7) | aprovação seção-por-seção |
| **Fase 4 — Aplicação** (1/arquivo-alvo, worktrees) | Planos 02/03/04 (fase-aplicação) | edições versionáveis nas skills |
| **Fase 5 — Verificação** | Planos 02/03/04 (fase-verificação) | relatório por onda + audit |

### Planos (hierárquicos)

| # | Nome | Fases | Sizing | Depende de | Onda / MoSCoW |
|---|------|-------|--------|------------|---------------|
| 01 | Fundação do Corpus (Normalizar + Extrair + Audit) | 5 | ~9h | — | infra-pipeline |
| 02 | Onda 1: Filas (Síntese → Verificação) | 6 | ~11h | Plano 01 | Must (1º) |
| 03 | Onda 2: SQL-internals + DNS-routing | 6 | ~11h | Plano 01 | Must (2º) |
| 04 | Onda 3: Resiliência (enriquecimento) | 5 | ~7h | Plano 01 | Should/Could (3º) |

### Grafo de Dependências

```
        Plano 01 (Fundação: Normalizar + Extrair + Audit)
                       |
                       |  atom-store em disco (32 fontes, gitignored)
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
   Plano 02        Plano 03       Plano 04
   Onda 1: Filas   Onda 2:        Onda 3:
   (Must, 1º)      SQL + DNS      Resiliência
                   (Must, 2º)     (Should, 3º)
```

**Paralelismo possível:** A **Síntese (Fase 2)** das três ondas é independente e pode rodar em paralelo após o Plano 01 (conceitos disjuntos; atom-store é read-only). A **Aplicação (Fase 4)** NÃO: 02/03/04 todas tocam `system-design/SKILL.md` → serializam nesse contrato na ordem de prioridade 02→03→04 (R2). DNS (`infrastructure`) e `defensive-patterns` são alvos independentes — suas aplicações não colidem.

### Tracer Bullet

**Plano:** 01, fase-01
**Descrição:** Uma fonte representativa (`pubsub-nao-mq` — alta densidade e carrega o `misconception-flag` central a M2/C1) percorre o pipeline ponta-a-ponta no mínimo viável: Normalizar → Extrair (átomos no schema de 9 campos, com `fonte:` obrigatório) → sintetizar **1** conceito (pub/sub-vs-message-queue) → **1** entrada-stub no manifesto. Prova o mecanismo novo e mais arriscado — handoff por disco, isolamento de subagente, schema, citação obrigatória, flag de conflito — **antes** de comprometer 32 fontes a ele. **Não** edita skill (a aplicação é gated/fora desta fase).

### Resumo por Plano

#### Plano 01: Fundação do Corpus (~9h) — infra-pipeline
> Constrói o atom-store que todas as ondas leem (o equivalente a "schema/migrations"). Normaliza ruído de transcrição e extrai átomos exaustivamente das 32 fontes, 1 subagente isolado por fonte. Extração priorizada por onda (Filas primeiro) para átomos prontos cedo, mas **toda** a extração fecha antes de qualquer síntese (conceitos cruzam ondas). Termina com audit de cobertura — a primeira linha de defesa contra descarte silencioso.

Fases (preliminar):
- fase-01-tracer-extracao-1-fonte (TRACER): `pubsub-nao-mq` ponta-a-ponta; prova disco+isolamento+schema+citação+`misconception-flag`
- fase-02-normalizar-corpus (Fase 0): 32 fontes → `normalized/` em lotes (~6-8/subagente)
- fase-03-extrair-filas (Fase 1): 1 subagente/fonte para as 14 fontes primary-Filas → `atoms/`
- fase-04-extrair-sql-dns-resiliencia (Fase 1): 1 subagente/fonte para SQL/DNS/Resiliência (incl. cross-bucket) → `atoms/`
- fase-05-audit-cobertura (M6/CA-01): toda fonte in-scope → ≥1 átomo; 3 OUT-com-motivo; conflitos C1-C9 carregados como flags; relatório

#### Plano 02: Onda 1 — Filas (~11h) — Must, entrega 1º
> A urgência máxima (cobertura ~zero). Sintetiza os ~16 conceitos de filas por conceito (atravessando todas as fontes, incl. cross-bucket), resolve a tensão exactly-once Kreps↔Treat → idempotent consumer e corrige o equívoco do `pubsub-nao-mq` (M2/C1). Monta a seção Onda 1 do manifesto, **para no gate**, aplica em worktrees e verifica testes verdes + passe adversarial.

Fases (preliminar):
- fase-01-sintese-delivery-e-exactly-once (M2, C1/C2): pub/sub-vs-queue, delivery-semantics, exactly-once-tension, idempotent-consumer
- fase-02-sintese-idempotency-ordering-backlog (C8): idempotency-keys, ordering, DLQ/poison, backlog-mgmt, backpressure
- fase-03-sintese-brokers-jobs-outbox (C5): broker-landscape, rabbitmq-queue-types, background-jobs (Bull), outbox, retries+backoff+jitter, async-file, durabilidade
- fase-04-manifesto-onda1 (Fase 3, M3/M4, **GATE**): conceitos→alvos; granularidade refs (P5); keywords description + sync `hooks.json`; cross-link AMQP → **gate humano seção Onda 1**
- fase-05-aplicacao-onda1 (Fase 4, worktrees, 1/arquivo): reference(s) filas + seção SKILL.md + description + hooks.json + cross-link
- fase-06-verificacao-onda1 (Fase 5, M8): `bun test` (wire/prefaces) verde; audit cobertura; passe adversarial Kreps+Treat+Yanacek (P2)

#### Plano 03: Onda 2 — SQL-internals + DNS-routing (~11h) — Must, entrega 2º
> Dois sub-tracks de alvos/donos distintos (system-design vs infrastructure), sintetizáveis em paralelo. SQL ensina os internals que a progressão de escala só nomeava; DNS fecha as 7 políticas Route 53. D6 puxa doc oficial citada para EXPLAIN/partições; D9 traz ACID+BASE com cross-link.

Fases (preliminar):
- fase-01-sintese-sql-indices-storage (S1, C6/C9): why-indexes, btree-vs-b+tree, index-types/cost, storage/IOPS, sqlite-prod, recursive-CTE, disaggregated-storage
- fase-02-sintese-sql-explain-partition-acid (S2/D6/D9, C7): EXPLAIN + partições (doc oficial, `referencia-oficial`/`unverified`), WAL/journal, ACID+BASE, pixeltable-nuggets (D5), semi-sync-replication
- fase-03-sintese-dns-routing (S3): 7 políticas Route 53, health-check, public/private zones, geo-vs-latency-vs-geoproximity, TTL (sub-track paralelo, sem conflitos)
- fase-04-manifesto-onda2 (Fase 3, **GATE**): SQL→system-design (ref nova + seção + description); DNS→infrastructure (estende dns-hosting.md + description); cross-links S4 → **gate humano seção Onda 2**
- fase-05-aplicacao-onda2 (Fase 4, worktrees, 2 sub-tracks): system-design SQL + infrastructure DNS
- fase-06-verificacao-onda2 (Fase 5): `bun test` (system-design + infrastructure); audit; revisão D6 `unverified`→confirmado

#### Plano 04: Onda 3 — Resiliência (~7h) — Should/Could, entrega 3º
> Enriquecimento, não cobertura nova. Alimenta defensive-patterns/system-design/infrastructure com o material sênior de resiliência (Brooker/Yanacek/Gabrielson/MacCárthaigh) e documenta as tensões C3/C4 onde elas tocam as skills. **Zero reference nova** (CA-07) — só extensão + cross-link. Não atrasa Filas (D7).

Fases (preliminar):
- fase-01-sintese-retry-timeout-deadline (C4): timeouts, safe-retries, backoff+jitter, retry-throttling/circuit-breaker, deadline-propagation
- fase-02-sintese-shedding-fallback-health (C3): load-shedding, health-checks, avoiding-fallback (tensão degraded-read), shuffle-sharding, distributed-challenges, blue-green
- fase-03-manifesto-onda3 (Fase 3, CA-07, **GATE**): mapeia para 3 skills; só extensão + cross-link, zero ref nova → **gate humano seção Onda 3**
- fase-04-aplicacao-onda3 (Fase 4, worktrees): enriquece 3 skills (serializa em system-design após Ondas 1/2)
- fase-05-verificacao-onda3 (Fase 5): `bun test` (3 skills); **audit GLOBAL final** (todas as 32 fontes→átomo→alvo, fecha CA-01); revisão olhos-frescos

---

## Review Checklist

- [ ] Os 4 planos têm `README.md`/`MEMORY.md` em `planoNN/` (este passo cria só o Plano 01; resto sob demanda)
- [ ] Cada fase tem checklist binário verificável e sizing (0.5h/1h/1.5h/2h)
- [ ] Tracer bullet (Plano 01 fase-01) é a fase mais fina que prova o mecanismo do pipeline end-to-end
- [ ] Grafo de dependências entre planos é acíclico (Plano 01 → 02/03/04)
- [ ] Cada átomo carrega `fonte:` (autor+título+âncora) — sem citação, não persiste (CA-03)
- [ ] Conflitos C1-C9 atribuídos a uma fase de síntese específica e resolvidos via D4 (tensão+regra)
- [ ] Toda fonte in-scope mapeia a ≥1 átomo; 3 OUT registradas com motivo (CA-01)
- [ ] Gate humano (seção de manifesto) precede TODA Fase 4 — nenhuma edição de skill antes (CA-06)
- [ ] Nenhum tópico já coberto (CAP, cache, LB, replicação, CQRS) vira reference nova (CA-07)
- [ ] Edições em `system-design/SKILL.md` serializam entre ondas (R2)
- [ ] Decisões D1-D10 (CONTEXT) referenciadas nas fases relevantes

---

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

---

## Compound Opportunity

<!-- preencher ao /iterate: o que merece virar compound note? -->

Candidatos antecipados:
- "Pipeline de síntese de conhecimento por disco (Normalizar→Extrair→Sintetizar→Manifesto→Gate→Aplicar→Verificar)" como padrão reutilizável para futuras ingestões de corpus sênior.
- "Tensão documentada + regra de decisão (D4)" como forma de resolver conflito entre fontes sênior sem achatar a nuance — quando a tensão É a lição.
- "Triagem por conteúdo, não por título" reforçado (3 de 6 exclusões por título estavam erradas) — ligar a [[feedback_content-triage-before-scope]].
- "Manifesto único aprovado por onda" como padrão de gate incremental que honra entrega independente sem perder a visão global.

---

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

---

## Exit Criteria

- [ ] **CA-01** cobertura: cada uma das 32 fontes in-scope → ≥1 átomo → alvo; cada OUT com motivo (audit Plano 04 fase-05) — zero descarte silencioso
- [ ] **CA-02** hook dispara para "message queue"/"exactly-once"/"idempotent consumer"/"Route 53 routing policy"/"EXPLAIN" (descriptions atualizadas)
- [ ] **CA-03** citação `fonte:` em toda afirmação framework-específica das novas references
- [ ] **CA-04** conflito exactly-once: Kreps E Treat aparecem com a regra (idempotent consumer), citados; equívoco do `pubsub-nao-mq` corrigido
- [ ] **CA-05** `bun test` verde nas skills tocadas (wire `stack-aware-preface-wire` + `*-prefaces`) após cada Fase 4
- [ ] **CA-06** nenhuma edição de skill ocorreu antes da aprovação da seção do manifesto
- [ ] **CA-07** nenhum tópico já coberto virou reference nova — só cross-link/extensão
- [ ] `bun run test` + `bun run typecheck` + `bunx biome check` verdes (NB: este repo NÃO tem `bun run lint` — usa biome)
- [ ] `bun run harness:validate` passa (estrutura `docs/` íntegra)
- [ ] PRD `status: approved` → `status: shipped` após merge das 3 ondas

---

## Decisões do CONTEXT Aplicadas

| Decisão | Onde se aplica |
|---------|----------------|
| D1 — Resiliência-overlap enriquece skills existentes | Plano 04 (todas as fases) |
| D2 — Cada conceito mora na skill dona | Plano 02 (filas→system-design), Plano 03 (DNS→infrastructure), Plano 04 (distribuído) |
| D3 — Profundidade: julgamento (SKILL.md) + código (references) | Fases de aplicação (02/03/04 fase-aplicação) |
| D4 — Conflito → tensão + regra de decisão | Plano 02 fase-01 (C1/C2), Plano 03 fase-01/02 (C6/C7/C9), Plano 04 fase-01/02 (C3/C4) |
| D5 — Pixeltable só nuggets | Plano 01 fase-04 (extração, `rescue-nugget`) + Plano 03 fase-02 |
| D6 — Sub-tópicos SQL finos via doc oficial citada | Plano 03 fase-02 (`referencia-oficial`/`unverified`) |
| D7 — Prioridade em ondas; resiliência não atrasa Filas | Grafo (02→03→04) + gate por onda |
| D8 — Intermediários gitignored, deliverables versionáveis | Plano 01 (`Infos/_pipeline/` gitignored) + Fases 4 (versionável) |
| D9 — ACID/BASE IN para sql-internals + cross-link | Plano 03 fase-02 + cross-link cap/database-selection |
| D10 — Fontes com equívoco mantidas, corrigidas na síntese | Plano 02 fase-01 (`misconception-flag` → correção citada) |

---

<!-- Gerado por /plan-feature em 2026-06-15 -->
