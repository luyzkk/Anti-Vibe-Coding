---
title: "Edit Manifest — System Design Coverage Gaps"
status: onda2-applied
created: 2026-06-16
---

# Edit Manifest — Conceito → Alvo (Fase 3 do pipeline)

> **O que é:** o contrato de aplicação. Para cada onda, mapeia cada conceito sintetizado ao
> arquivo-alvo que receberá a edição, com granularidade e mudanças exatas. **Este arquivo NÃO
> edita nenhuma skill** — só descreve destinos.
>
> **GATE HUMANO (CA-06):** cada seção é aprovada pelo Navegador **antes** da fase de aplicação
> correspondente. Nenhuma skill muda até você aprovar a seção. A aprovação desta seção destrava
> a **Plano 02 fase-05 (aplicação Onda 1)** — e só ela.

**Status das seções**
- [x] **Onda 1 — Filas e Mensageria** — ✅ APROVADO (2026-06-16) · aplicado e shipado (PR #9, merge 2554e3f)
- [x] **Onda 2 — SQL-internals + DNS-routing** — ✅ APLICADA e VERIFICADA (2026-06-16) · 3 refs SQL + §10 + DNS §8/§9 · adversarial 2 FLAG→corrigidos, DNS APROVA · D6 banners aguardam sign-off humano · working tree (não commitada)
- [ ] Onda 3 — Resiliência (enriquecimento) — pendente (Plano 04 fase-03)

---

## SEÇÃO ONDA 1 — Filas e Mensageria

> ✅ **APROVADO PELO NAVEGADOR (2026-06-16).** Decisões travadas: **P5 = 3 references**
> (`messaging-models` / `messaging-reliability` / `messaging-operations` + seção 9 no SKILL.md);
> **`description` = lista completa de keywords** (M4); **mapa conceito→alvo aprovado como proposto**
> (sem remapeamentos). Destrava a Plano 02 fase-05 (aplicação Onda 1).

### Contexto

- **16 conceitos sintetizados** em `Infos/_pipeline/synthesis/` (~2400 linhas, 100% com `fonte:`).
- **Skill dona:** `system-design` (D2 — cada conceito mora na skill dona; filas é system design).
- **Gap atual:** `system-design` tem 8 seções (CAP, escala, cache, DB, replicação, LB, CDN, serverless)
  e **zero** cobertura de filas/mensageria. É o buraco que esta onda fecha.
- **D3:** julgamento (quando usar / NÃO / árvore) vai pro `SKILL.md`; profundidade + código vão pras references.
- **CA-07:** nada já coberto vira reference nova. Filas **não** é coberto → references **novas** são corretas
  (não é o caso de extensão/cross-link, que vale só pra tópico existente).

---

### ⚠️ DECISÃO P5 — Granularidade de references — **PRECISA DA SUA ESCOLHA**

O plano estimava "Filas 2-3 references". Com o volume real (~2400 linhas), **2 references inchariam**
(~1200 linhas cada — acima do `file-size-guard`). Recomendo **3 references novas + 1 seção no `SKILL.md`**.

**▶ RECOMENDADO — 3 references temáticas** (agrupadas pela jornada mental do dev):

| Reference (nova) | Tema | Conceitos | ~linhas-fonte |
|---|---|---|---|
| `messaging-models.md` | O modelo e as garantias: "devo usar fila, e o que ela garante?" | pub-sub-vs-message-queue · delivery-semantics · exactly-once-delivery-vs-processing · ordering · async-file-processing | ~680 |
| `messaging-reliability.md` | Correção sob duplicata/falha | idempotent-consumer-pattern · idempotency-keys · outbox-pattern · retries-backoff-jitter · dlq-poison-messages | ~670 |
| `messaging-operations.md` | Escolher e operar a infra | broker-landscape · rabbitmq-queue-types · background-jobs · durability · backlog-management · backpressure-load-leveling | ~1270 |

> **Trade-off honesto desta opção:** `messaging-operations.md` fica o mais pesado (~1270 linhas-fonte;
> a reference distilada será menor, mas ainda é a maior). Mantém **C5 inteiro junto** (broker-landscape
> + durability na mesma reference) — bom pro leitor. Se passar do guard na aplicação, split tardio.

**▷ ALTERNATIVA — 4 references** (se preferir arquivos menores e mais navegáveis):
divide operations em `messaging-brokers.md` (broker-landscape · rabbitmq-queue-types · durability — mantém C5)
+ `messaging-throughput.md` (background-jobs · backlog-management · backpressure-load-leveling). Os outros
dois (`messaging-models`, `messaging-reliability`) ficam iguais. Custo: +1 arquivo, +1 entrada na seção SKILL.md.

*Sua decisão aqui fixa quantos arquivos a fase-05 cria. Tudo abaixo assume o RECOMENDADO (3 refs); se
escolher 4, ajusto a tabela de operations e a seção SKILL.md antes de aplicar.*

---

### Mapa conceito → alvo (16/16 — zero descarte silencioso, CA-01)

| # | Conceito (`synthesis/…`) | Reference-alvo | Tratamento no SKILL.md | Conflito |
|---|---|---|---|---|
| 1 | pub-sub-vs-message-queue | `messaging-models.md` | árvore "pub/sub × fila" na seção 9 | — |
| 2 | delivery-semantics | `messaging-models.md` | regra "projete at-least-once" | — |
| 3 | exactly-once-delivery-vs-processing | `messaging-models.md` | nota "delivery × processing" | **C1** |
| 4 | ordering | `messaging-models.md` | bullet "ordem × concorrência" | — |
| 5 | async-file-processing | `messaging-models.md` | árvore "processar síncrono × via fila" | — |
| 6 | idempotent-consumer-pattern | `messaging-reliability.md` | regra central da seção 9 | **C2** |
| 7 | idempotency-keys | `messaging-reliability.md` | bullet "quem emite a chave" | **C8** |
| 8 | outbox-pattern | `messaging-reliability.md` | ramo da árvore (efeito cross-system) | — |
| 9 | retries-backoff-jitter | `messaging-reliability.md` | bullet "retry seguro"; tensão→Onda 3 | (C4→Onda 3) |
| 10 | dlq-poison-messages | `messaging-reliability.md` | bullet "DLQ obrigatória" | — |
| 11 | broker-landscape | `messaging-operations.md` | árvore "qual broker / DB-backed?" | **C5** |
| 12 | rabbitmq-queue-types | `messaging-operations.md` | tabela Classic/Quorum/Stream | — |
| 13 | background-jobs | `messaging-operations.md` | nota operacional (Bull/Redis) | — |
| 14 | durability | `messaging-operations.md` | bullet "fsync / in-memory / DB-backed" | **C5** |
| 15 | backlog-management | `messaging-operations.md` | bullet "visibility timeout / LIFO-recovery" | — |
| 16 | backpressure-load-leveling | `messaging-operations.md` | bullet "leveling × backpressure × shedding" | — |

**Cobertura:** 16/16 conceitos mapeados a um alvo. Nenhum órfão. (Os 3 OUT do triage seguem fora — registrados no `sources-manifest.md`.)

---

### Alvo A — `system-design/SKILL.md`

1. **Nova seção `## 9. Filas e Mensageria`** (após a seção 8, antes do Cheat Sheet), no padrão das
   existentes: regra-âncora + árvore de decisão + ponteiro `references/`. Conteúdo de julgamento (D3):
   - Árvore raiz: *preciso de fila? síncrono basta? pub/sub × fila × background job?*
   - Regra central: **projete para at-least-once + consumidor idempotente**; exactly-once *delivery* é red flag.
   - Ponteiros pras 3 references novas.
2. **Linha no Cheat Sheet** (tabela "Decisão | Padrão Seguro | Mude Quando"):
   `Filas | at-least-once + consumidor idempotente | exactly-once nativo prometido = desconfie`.
3. **`description` (M4 / CA-02)** — adicionar keywords de mensageria ao final da lista existente
   (antes de "or faces infrastructure…"). Mínimo obrigatório por CA-02: `'message queue'`,
   `'exactly-once'`, `'idempotent consumer'`. Proposta completa:
   > `'message queue', 'pub/sub', 'message broker', 'delivery semantics', 'exactly-once', 'idempotent consumer', 'idempotency key', 'message ordering', 'dead letter queue', 'DLQ', 'poison message', 'backpressure', 'load leveling', 'backlog', 'RabbitMQ', 'quorum queue', 'background jobs', 'BullMQ', 'outbox pattern', 'message durability'`
   - **Risco R1:** não há keyword-parity test (P1/grep confirmou); validar com `bun test` nas wire/prefaces após editar.

---

### Alvo B — references novas (`system-design/references/`)

As 3 (ou 4) references da decisão P5. Cada uma destila os átomos via os arquivos `synthesis/`,
**preservando as linhas `fonte:`** (CA-03). Profundidade + código permitido (D3). Cada reference abre
com a camada julgamento (quando usar/NÃO + árvore) e desce pro operacional.

---

### Alvo C — `hooks/hooks.json` (advisor one-liner, M3 / P3)

Linha única do advisor da system-design (`SessionStart` printf). Atual:
```
- /anti-vibe-coding:system-design - System Design: cache, scaling, CAP, replicacao
```
Proposta:
```
- /anti-vibe-coding:system-design - System Design: cache, scaling, CAP, replicacao, filas/mensageria (queue, broker, exactly-once, idempotencia)
```
- P3 confirma: `hooks/hooks.json` é a **única** superfície de advisor one-liner (revalidar grep antes de editar).

---

### Alvo D — cross-link AMQP (`api-design/references/api-protocols.md`, M3)

A seção `## AMQP` (linha ~83) já cita DLQ + idempotência nos anti-patterns — âncora natural. **Não absorver**
o conteúdo (fica na skill dona, D2); só **cross-linkar pra profundidade**. Adicionar ao fim da seção AMQP:
```
> **Profundidade (filas/mensageria):** delivery semantics, consumidor idempotente, DLQ/poison,
> outbox e escolha de broker estão em `system-design/references/messaging-*.md`.
```

---

### Conflitos resolvidos nesta onda (D4 — tensão + regra)

| Conflito | Onde | Como (já sintetizado) |
|---|---|---|
| **C1** exactly-once | `messaging-models.md` | Kreps↔Treat citados nominalmente; delivery (impossível) × processing (alcançável); regra at-least-once + idempotência |
| **C2** idempotência basta? | `messaging-reliability.md` | single-system (idempotência basta) × cross-system (transação/outbox); tabela de escopo do efeito |
| **C5** DB-queue × broker | `messaging-operations.md` | DHH/Solid Queue × norma broker; 3 eixos de durabilidade + regra volume/atomicidade/operação |
| **C8** quem emite idempotency key | `messaging-reliability.md` | client-supplied (AWS) × server-issued (payments) citados dos dois lados |
| (C4 retry×overload) | remetido | tensão apontada em `retries-backoff-jitter`; **resolução profunda fica na Onda 3** (não aqui) |

CA-04 satisfeito: Kreps **e** Treat aparecem com a regra; equívoco do `pubsub-nao-mq` corrigido (em `exactly-once-delivery-vs-processing`).

---

### Guardrails desta seção

- **CA-06:** nada acima é executado até você aprovar. Esta é a proposta, não a edição.
- **CA-07:** as 3 references são NOVAS (filas não existia) — nenhum tópico coberto (CAP/cache/LB/etc.) vira reference nova.
- **R2 (serialização):** `SKILL.md` é tocado por 3 ondas; a Onda 1 o edita primeiro; Ondas 2/3 serializam depois.
- **CA-05:** após aplicar, `bun test` nas wire/prefaces da `system-design` (e `api-design` pelo cross-link) deve ficar verde.

---

### O que sua aprovação destrava (fase-05)

Aprovar esta seção autoriza a **aplicação Onda 1** (fase-05, em worktrees, 1 subagente/arquivo-alvo):
criar as references, inserir a seção 9 + cheat-sheet + description no SKILL.md, atualizar o advisor do
hooks.json, e o cross-link AMQP. Depois, fase-06 verifica (`bun test` + audit + passe adversarial).

**Decisões que preciso de você:**
1. **Granularidade P5:** 3 references (recomendado) ou 4 (split de operations)?
2. **`description` (M4):** lista de keywords proposta OK, ou enxugar/expandir?
3. Algum mapeamento conceito→alvo que você moveria de reference?

---
---

## SEÇÃO ONDA 2 — SQL-internals + DNS-routing

> ✅ **APROVADO PELO NAVEGADOR (2026-06-16, via AskUserQuestion).** Decisões travadas: **P5 = 3 references SQL**
> (`sql-indexing-and-storage` / `sql-acid-and-durability` / `sql-query-planning`); **DNS = 2 seções** em
> `dns-hosting.md` (§8 políticas · §9 health-check/TTL/zones); **D6 aplicado marcado ⚠️unverified** (fase-06
> confirma); **keywords + mapa conceito→alvo como propostos** (sem remapeamentos). Destrava a fase-05 (aplicação).

### Contexto

- **16 conceitos sintetizados** em `Infos/_pipeline/synthesis/` (~2710 linhas-fonte, 100% com `fonte:`).
  - **Sub-track SQL (13 conceitos)** → skill **`system-design`** (D2 — SQL-internals é system design).
  - **Sub-track DNS (3 conceitos)** → skill **`infrastructure`** (D2 — DNS mora em infra).
- **Dois alvos independentes** → as duas aplicações **não colidem** (worktrees paralelas). `system-design/SKILL.md`
  é tocado só pelo sub-track SQL; o sub-track DNS toca só `infrastructure`.
- **R2 (serialização):** o sub-track SQL acrescenta a **§10** ao `system-design/SKILL.md` — a §9 (Onda 1) já está
  lá; §10 **anexa** após ela, sem conflito (edição sequencial, não concorrente). Onda 3 serializa depois.
- **CA-07 honrado:** SQL-internals e as políticas de roteamento DNS **não existem hoje** → references/seções
  novas são corretas. O que **já é coberto** (replicação, CAP, SQL×NoSQL selection, DNS resolution/registros)
  recebe só **extensão + cross-link**, nunca reference nova. Ver "Tratamento CA-07" abaixo.
- **D6 (doc oficial):** os conceitos `explain-query-plan` e `partitioning` **não tinham átomos** — foram
  extraídos **25 átomos novos** de doc oficial PostgreSQL (via `curl`, não WebFetch) com
  `camada: referencia-oficial` + `flags: [unverified]`. As duas entradas entram marcadas **⚠️ unverified**;
  **fase-06 confirma** (revisão humana) — P4/R5.

---

### ⚠️ DECISÃO P5 — Granularidade de references SQL — **PRECISA DA SUA ESCOLHA**

Volume real do sub-track SQL: **~2135 linhas-fonte** em 13 conceitos. Tirando `semi-sync-replication-failover`
(que **estende** a reference existente `replication-sharding`, não vira ref nova — CA-07), sobram 12 conceitos
(~1988 linhas) para references novas.

**▶ RECOMENDADO — 3 references temáticas** (agrupadas pela jornada mental: "minha query está lenta" →
"meus dados estão seguros" → "como inspeciono/particiono"):

| Reference SQL (nova) | Tema | Conceitos | ~linhas-fonte |
|---|---|---|---|
| `sql-indexing-and-storage.md` | Como o banco acha a linha e onde os bytes moram | why-indexes-exist · btree-vs-bplustree **(C9)** · index-types-and-cost · storage-and-hardware · disaggregated-storage **(C6)** | ~913 |
| `sql-acid-and-durability.md` | Garantias da transação e onde o dado fica durável | acid-and-base **(C7, D9)** · wal-journal-modes · sqlite-in-production · pixeltable-nuggets **(D5)** | ~638 |
| `sql-query-planning.md` | Inspecionar e escalar a query | explain-query-plan **(D6 ⚠️unverified)** · partitioning **(D6 ⚠️unverified)** · recursive-cte-gap-detection | ~437 |

> **Trade-off honesto:** `sql-indexing-and-storage` fica a maior (~913 linhas-fonte; a distilada será menor).
> Mantém C9 e C6 juntos no mesmo arquivo (índices+storage) — coeso pro leitor. Se passar do `file-size-guard`
> na aplicação, split tardio de `storage-and-hardware`+`disaggregated-storage` para `sql-storage.md`.

**▷ ALTERNATIVA — 2 references** (se preferir menos arquivos): funde durability+planning em
`sql-internals-and-tooling.md` (~1075 linhas-fonte). Custo: 1 arquivo grande misturando durabilidade
(ACID/WAL) com tooling (EXPLAIN/partição) — temas distintos no mesmo lugar; menos navegável.

*Tudo abaixo assume o RECOMENDADO (3 refs SQL). DNS não cria reference (estende `dns-hosting.md`).*

---

### Mapa conceito → alvo (16/16 — zero descarte silencioso, CA-01)

**Sub-track SQL → `system-design`**

| # | Conceito (`synthesis/…`) | Alvo | Tratamento §10 SKILL.md | Conflito/Decisão |
|---|---|---|---|---|
| 1 | why-indexes-exist | `sql-indexing-and-storage.md` | árvore "por que/quando indexar" | — |
| 2 | btree-vs-bplustree | `sql-indexing-and-storage.md` | nota "B+tree default × MongoDB B-tree" | **C9** |
| 3 | index-types-and-cost | `sql-indexing-and-storage.md` | bullet "cada índice = write amplification" | — |
| 4 | storage-and-hardware | `sql-indexing-and-storage.md` | bullet "working set × RAM, IOPS" | — |
| 5 | disaggregated-storage | `sql-indexing-and-storage.md` | bullet "co-localizado × desagregado" | **C6** |
| 6 | acid-and-base | `sql-acid-and-durability.md` | regra "ACID p/ dinheiro"; cross-link CAP | **C7 · D9** |
| 7 | wal-journal-modes | `sql-acid-and-durability.md` | bullet "WAL × rollback; checkpoint" | — |
| 8 | sqlite-in-production | `sql-acid-and-durability.md` | bullet "single-writer; encurte a transação" | — |
| 9 | pixeltable-nuggets | `sql-acid-and-durability.md` | nota lateral (ACID como substrato de pipeline) | **D5** |
| 10 | explain-query-plan | `sql-query-planning.md` | nota "leia o plano antes de otimizar" | **D6 ⚠️unverified** |
| 11 | partitioning | `sql-query-planning.md` | bullet "particione só quando grande o bastante" | **D6 ⚠️unverified** |
| 12 | recursive-cte-gap-detection | `sql-query-planning.md` | (operacional — sem entrada de julgamento dedicada) | — |
| 13 | semi-sync-replication-failover | **EXTENDE** `replication-sharding.md` | bullet "surge-replacement no failover" | **CA-07 → extensão** |

**Sub-track DNS → `infrastructure`** (estende `dns-hosting.md`; **nenhuma reference nova**)

| # | Conceito (`synthesis/…`) | Alvo | Tratamento SKILL.md | Conflito/Decisão |
|---|---|---|---|---|
| 14 | dns-routing-policies | **nova §8** em `dns-hosting.md` | árvore "qual routing policy" na §1 (DNS) | — |
| 15 | dns-health-checks-and-ttl | **nova §9** em `dns-hosting.md` | bullet "failover exige health check" | — |
| 16 | dns-public-vs-private-zones | **nova §9** em `dns-hosting.md` (mesma seção) | bullet "split-horizon: público × privado" | — |

**Cobertura:** 16/16 conceitos mapeados. Nenhum órfão. (Os 3 OUT do triage seguem fora — `sources-manifest.md`.)

---

### Alvo A — `system-design` (sub-track SQL)

**A.1 — 3 references novas** em `system-design/references/` (decisão P5). Cada uma destila os `synthesis/`
**preservando as linhas `fonte:`** (CA-03); abre com julgamento (quando usar/NÃO + árvore) e desce ao
operacional + código (D3). `sql-query-planning.md` carrega o aviso **⚠️ referência oficial PostgreSQL —
pendente de revisão humana (fase-06)** no topo das subseções EXPLAIN e partitioning (D6/unverified).

**A.2 — Nova `## 10. SQL Internals`** no `SKILL.md` (após §9 Filas, antes do Cheat Sheet), no padrão das
existentes (regra-âncora + árvore + ponteiro `references/`). Julgamento (D3):
- Árvore raiz: *query lenta? → leia o plano (EXPLAIN) antes de otimizar; falta índice? particionar?*
- Regras-âncora: **B+tree é o default (range scans); cada índice é write amplification** · **ACID/SQL p/
  dinheiro, salvo escala extrema com compensação (C7)** · **particione só quando a tabela é grande o bastante**.
- Ponteiros pras 3 references novas.

**A.3 — Linhas no Cheat Sheet** (tabela "Decisão | Padrão Seguro | Mude Quando"):
- `Índice SQL | B+tree; composto p/ filtrar+ordenar | cada índice = custo de escrita`
- `ACID p/ dinheiro | transação ACID/SQL | escala extrema + compensação → NoSQL pragmático`
- `Particionar | só quando a tabela é grande o bastante | partições demais = overhead de planning`

**A.4 — `description` (M4 / CA-02)** — anexar keywords SQL antes de "or faces infrastructure…". Mínimo CA-02:
`'EXPLAIN'`. Proposta completa:
> `'database index', 'B-tree', 'B+ tree', 'clustered index', 'covering index', 'write amplification', 'WAL', 'write-ahead log', 'journal mode', 'ACID', 'BASE', 'EXPLAIN', 'query plan', 'EXPLAIN ANALYZE', 'table partitioning', 'partition pruning', 'recursive CTE', 'SQLite in production', 'IOPS', 'disaggregated storage'`
- **R1:** sem keyword-parity test (confirmado); validar com `bun test` wire/prefaces após editar.

**A.5 — EXTENSÃO de `replication-sharding.md`** (CA-07 — replicação já coberta): subseção curta
"Surge-replacement no failover" (substituir o nó sob carga em vez de degradar; semi-sync) + cross-link.
**Não** vira reference nova.

**A.6 — Cross-links S4 / D9:** em `sql-acid-and-durability.md`, o lado BASE/eventual cross-linka
`cap-theorem.md` e `database-selection.md` (existentes) — sem duplicar CAP nem a seleção SQL×NoSQL.

**A.7 — `hooks/hooks.json` (opcional):** anexar `, SQL internals (index, EXPLAIN, ACID)` à linha do advisor
da system-design (já estendida p/ filas na Onda 1). Minor; a `description` é o gatilho real de CA-02.

---

### Alvo B — `infrastructure` (sub-track DNS — só extensão)

**B.1 — `dns-hosting.md` ganha 2 seções novas** (não reference nova — DNS hosting já existe, CA-07):
- **`## 8. Route 53 — Políticas de Roteamento`**: as 7 políticas (simple/weighted/latency/failover/
  geolocation/geoproximity/multivalue) como **uma árvore de decisão**, + a desambiguação **geolocation ×
  latency × geoproximity**, + caveat **multivalue ≠ load balancer**. (de `dns-routing-policies`, ~270 linhas-fonte)
- **`## 9. Health Checks, TTL & Hosted Zones`**: mecanismo de health check (ID, `/health`, fail-open) + TTL
  como piso de propagação + public × private hosted zones (split-horizon). (de `dns-health-checks-and-ttl`
  + `dns-public-vs-private-zones`). **Nota honesta:** o corpus é fino em TTL e em split-horizon —
  a seção fica no que os átomos sustentam, sem inventar faixas de TTL nem mecânica de VPC.

**B.2 — `infrastructure/SKILL.md`** (julgamento leve, D3): na §1 (DNS), adicionar ponteiro/mini-árvore
"qual Route 53 routing policy" + ponteiro pras novas seções de `dns-hosting.md`. Profundidade fica na reference.

**B.3 — `description` (M4 / CA-02)** — anexar keywords DNS-routing antes de "or faces infrastructure…".
Mínimo CA-02: `'Route 53 routing policy'`. Proposta completa:
> `'Route 53 routing policy', 'weighted routing', 'latency-based routing', 'failover routing', 'geolocation routing', 'geoproximity routing', 'multivalue answer', 'DNS health check', 'hosted zone', 'private hosted zone', 'split-horizon DNS', 'DNS TTL'`

**B.4 — `hooks/hooks.json`:** ⚠️ **o advisor printf NÃO lista `infrastructure`** (achado desta fase — omissão
pré-existente, não desta feature). Não há linha de advisor pra estender. A discoverability de CA-02 fica na
`description` (B.3). **Proposta:** não adicionar `infrastructure` ao advisor agora (fora de escopo desta onda);
registrar como observação. *(Se você quiser, adiciono uma linha de infraestrutura ao advisor — diga.)*

---

### Conflitos resolvidos nesta onda (D4 — tensão + regra)

| Conflito | Onde (synthesis → reference) | Como (já sintetizado, dois lados citados) |
|---|---|---|
| **C6** storage desagregado × co-localizado | `disaggregated-storage` → `sql-indexing-and-storage.md` | Metal/NVMe-local (latência/IOPS previsível) × Aurora-style/EBS (elasticidade) + regra por perfil IO×elasticidade; durável ≠ replicação |
| **C7** ACID p/ dinheiro | `acid-and-base` → `sql-acid-and-durability.md` | ortodoxo (ACID/SQL obrigatório) × pragmático (NoSQL em pagamentos sob escala extrema) + regra (gargalo de escala **E** compensação); C-de-ACID ≠ C-de-CAP |
| **C9** absolutismo B+tree | `btree-vs-bplustree` → `sql-indexing-and-storage.md` | B+tree default em RDBMS (range scans, fanout, RAM-fit) × MongoDB usa B-tree (contraexemplo, case Discord) + regra ancorada em RAM-fit |

(C4 retry×overload era **remetido à Onda 3** desde a Onda 1 — não toca esta onda.)

---

### Guardrails desta seção

- **CA-06:** nada acima é executado até você aprovar. Esta é a proposta, não a edição.
- **CA-07:** SQL-internals e routing-policies DNS são NOVOS → references/seções novas corretas. Replicação
  (`replication-sharding`), CAP, SQL×NoSQL (`database-selection`), DNS resolution/registros (`dns-hosting` §1-7)
  recebem só extensão + cross-link (A.5, A.6, B.1).
- **R2 (serialização):** `system-design/SKILL.md` recebe a §10 anexada após a §9 (Onda 1); sequencial, sem
  conflito. As duas sub-tracks (system-design SQL × infrastructure DNS) são alvos disjuntos → aplicação paralela OK.
- **D6/P4/R5 (unverified):** EXPLAIN + partitioning entram marcados ⚠️ unverified (doc oficial); **fase-06**
  faz a revisão humana antes do sign-off final da onda.
- **CA-05:** após aplicar, `bun test` nas wire/prefaces de `system-design` **e** `infrastructure` deve ficar verde.

---

### O que sua aprovação destrava (fase-05)

Aprovar esta seção autoriza a **aplicação Onda 2** (fase-05, worktrees, 1 subagente/arquivo-alvo, 2 sub-tracks
paralelos): criar as 3 references SQL + §10/cheat-sheet/description no `system-design/SKILL.md` + estender
`replication-sharding`; e estender `dns-hosting.md` (§8/§9) + SKILL.md/description de `infrastructure`. Depois,
fase-06 verifica (`bun test` das 2 skills + audit de cobertura + passe adversarial + **revisão D6 unverified→confirmado**).

**Decisões que preciso de você (gate Onda 2):**
1. **Granularidade P5 (SQL):** 3 references (recomendado) ou 2 (funde durability+planning)?
2. **DNS:** estender `dns-hosting.md` com 2 seções (recomendado) — confirma, ou prefere outra divisão?
3. **D6 unverified:** aplicar EXPLAIN/partitioning agora **marcados ⚠️unverified** (recomendado; fase-06 confirma)
   ou segurar essas 2 entradas até você revisar a doc oficial primeiro?
4. **keywords `description` (SQL + DNS)** e **mapa conceito→alvo** — OK como proposto, ou ajustar?
