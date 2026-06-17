---
title: "Edit Manifest — System Design Coverage Gaps"
status: onda3-approved
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
- [x] **Onda 2 — SQL-internals + DNS-routing** — ✅ APLICADA, VERIFICADA + COMMITADA (2026-06-16) · 3 refs SQL + §10 + DNS §8/§9 · adversarial 2 FLAG→corrigidos, DNS APROVA · **D6 EXPLAIN/partitioning: sign-off humano dado (2026-06-17) — banners ⚠️unverified → ✅ confirmado**
- [x] **Onda 3 — Resiliência (enriquecimento)** — ✅ **APROVADO (2026-06-17)** · 12 conceitos → 3 skills, ZERO reference nova (D1/CA-07): só extensão + cross-link. Decisões: load-shedding/deadline-propagation → system-design §11; §11 + shuffle estende replication-sharding; keywords/mapa como propostos; **advisor: adicionar as 3 skills**

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

---
---

## SEÇÃO ONDA 3 — Resiliência (ENRIQUECIMENTO)

> ✅ **APROVADO PELO NAVEGADOR (2026-06-17, via AskUserQuestion).** Decisões travadas: **load-shedding +
> deadline-propagation → `system-design` §11** (não viram categorias novas em defensive-patterns); **§11 "Resiliência
> Distribuída" criada + `shuffle-sharding` ESTENDE `replication-sharding.md`** (sem ref nova); **keywords + mapa
> conceito→alvo como propostos**; **advisor `hooks.json`: ADICIONAR as 3 skills** (`defensive-patterns` +
> `infrastructure` novas linhas + `system-design` estendida — corrige a omissão pré-existente). Destrava a fase-04 (aplicação).

### Contexto

- **12 conceitos sintetizados** em `Infos/_pipeline/synthesis/` (Onda 3), 100% com `fonte:` (457 citações no total).
  Conflitos resolvidos via D4 (dois lados + regra): **C3** (`degraded-read-tension`) e **C4** (`retry-throttling-vs-circuit-breaker`).
- **D1 / CA-07 — REGRA DURA DESTA ONDA: ZERO reference nova.** Resiliência **já é coberta** pelas skills existentes
  (`defensive-patterns` é um menu de padrões de resiliência; `infrastructure` cobre deploy; `system-design` cobre
  escala/distribuição). Onda 3 **enriquece** — só **extensão de arquivo existente + cross-link**. Nenhum arquivo novo.
- **3 skills-alvo**, partição por **altitude/dono (D2)**:
  - **`defensive-patterns`** = padrões de resiliência **no nível do serviço/código** (lar primário). Skill é um
    **menu puro** (sem `references/`) → enriquecimento vai **inline nas categorias existentes** do `SKILL.md`.
  - **`system-design`** = resiliência **no nível da frota/sistema distribuído** (overload, isolamento, falhas distribuídas)
    → nova **§11** no `SKILL.md` + **extensão** de reference existente (`replication-sharding.md`). (R2: §11 anexa após §10.)
  - **`infrastructure`** = resiliência **de deploy/operação** → **extensão** de `deployment-patterns.md` + `SKILL.md` §5.
- **D3:** julgamento (quando usar/NÃO + árvore) no `SKILL.md`; profundidade/código nas references existentes
  (onde a skill tem references). `defensive-patterns` não tem references → julgamento + snippet curto inline (como já é o padrão da skill).

---

### ⚠️ DECISÃO P5 — Destino dos conceitos "fleet-overload" — **PRECISA DA SUA ESCOLHA**

A maioria dos 12 conceitos tem dono óbvio. **2 conceitos são limítrofes** entre `defensive-patterns` (serviço) e
`system-design` (frota): **`load-shedding`** e **`deadline-propagation`**.

**▶ RECOMENDADO — ambos em `system-design` §11** (resiliência de frota/overload): load shedding e deadline propagation
são decisões de **arquitetura de sobrecarga** (preservar goodput da frota; propagar deadline pela cadeia de serviços),
não um padrão que um único serviço liga/desliga. Ficam ao lado de `shuffle-sharding` e `distributed-challenges`, e
cross-linkam a categoria de timeout/retry de `defensive-patterns` e o `backpressure-load-leveling` (Onda 1, em
`messaging-operations.md`). Mantém `defensive-patterns` enxuto (só enriquece categorias existentes, **zero categoria nova**).

**▷ ALTERNATIVA — ambos como categorias novas em `defensive-patterns`** (`#10 Load Shedding`, `#11 Deadline Propagation`):
trata-os como padrões defensivos que o serviço implementa. Custo: 2 categorias novas no menu (cresce de 9 → 11); e
`deadline-propagation`/`load-shedding` ficam separados de `distributed-challenges`/`shuffle-sharding` (que não cabem no
menu de `defensive-patterns` e iriam pra `system-design` de qualquer forma) — partindo o tema de overload em duas skills.

*Tudo abaixo assume o RECOMENDADO. Se escolher a alternativa, movo `load-shedding`+`deadline-propagation` para
`defensive-patterns` e ajusto a §11 antes de aplicar.*

---

### Mapa conceito → alvo (12/12 — zero descarte silencioso, CA-01)

**Sub-track A → `defensive-patterns/SKILL.md`** (enriquece categorias existentes — **nenhuma categoria nova**)

| # | Conceito (`synthesis/…`) | Categoria-alvo (existente) | Tratamento | Conflito |
|---|---|---|---|---|
| 1 | timeouts | **#3 Timeout** | calibração por percentil; cobrir DNS+TLS+conexão (não só `SO_RCVTIMEO`); timeout baixo → cascata; estado UNKNOWN | — |
| 2 | safe-retries | **#5 Retry** | idempotência é pré-requisito; retry em UMA camada; 4xx não-retry; parar quando não ajuda | — |
| 3 | backoff-and-jitter | **#5 Retry** | backoff exponencial **limitado** + **jitter**; thundering herd (já mencionado — aprofunda) | — |
| 4 | retry-throttling-vs-circuit-breaker | **#2 Circuit Breaker** + **#5 Retry** | a tensão **C4**: token bucket / retry budget × circuit breaker modal; AWS prefere token bucket; regra | **C4** |
| 7 | health-checks | **#8 Health Check** | 4 tipos (liveness/local/dependency/anomaly); fail-open; black-hole; zombie; cross-link deploy + dns §9 | — |
| 8 | avoiding-fallback | **#4 Fallback** | aprofunda o "Não use": código modal não-testado; cascata Amazon 2001; enrijecer primário; failover exercitado | — |
| 9 | degraded-read-tension | **#4 Fallback** | a tensão **C3**: servir cache stale × fallback perigoso; regra (decisão irreversível? caminho exercitado?) | **C3** |

**Sub-track B → `system-design`** (nova §11 no SKILL.md + extensão de reference existente — CA-07)

| # | Conceito (`synthesis/…`) | Alvo | Tratamento | Conflito |
|---|---|---|---|---|
| 6 | load-shedding | **§11 SKILL.md** | regra "descartar p/ preservar goodput"; distinção shedding×backpressure×throttling; fast-reject; priorizar health check | — |
| 5 | deadline-propagation | **§11 SKILL.md** | bullet "propague tempo restante por hop; clock monotônico; não comece trabalho fadado" | — |
| 10 | shuffle-sharding | **EXTENDE** `replication-sharding.md` (nova subseção) + bullet §11 | isolamento combinatório; blast radius exponencial; analogia das cartas; bulkhead 1-em-N | — |
| 11 | distributed-challenges | **§11 SKILL.md** (framing) | 8 modos de falha; 5 resultados de uma chamada remota; estado UNKNOWN; cross-link Two Generals/FLP (Onda 1) | — |

**Sub-track C → `infrastructure`** (extensão — nenhuma reference nova; CA-07)

| # | Conceito (`synthesis/…`) | Alvo | Tratamento | Conflito |
|---|---|---|---|---|
| 12 | blue-green-deploy | **EXTENDE** `deployment-patterns.md` (subseção blue-green) + `SKILL.md` §5 | dois slots; reverse-proxy switch; **health check na porta privada ANTES do switch**; rollback por inversão | — |
| (7) | health-checks (ângulo deploy) | cross-link em `deployment-patterns.md` "Health Check Endpoints" → `defensive-patterns #8` | o padrão geral mora em `defensive-patterns`; aqui só o gancho de deploy | — |

**Cobertura:** 12/12 conceitos mapeados. Nenhum órfão. (Os 3 OUT do triage seguem fora — `sources-manifest.md`.)

---

### Alvo A — `defensive-patterns/SKILL.md` (lar primário)

`defensive-patterns` é um **menu puro** (sem `references/`). O enriquecimento é **inline** nas categorias existentes,
no padrão atual da skill (cada categoria: **Quando / Faz / Não faz / snippet curto**). Aprofunda a camada de julgamento
sem inchar — preservando o tom de menu navegável.

- **#2 Circuit Breaker** e **#5 Retry** recebem o **C4** (tensão token-bucket × circuit-breaker modal + regra). É a
  resolução profunda do C4 que foi **remetida desde a Onda 1**.
- **#3 Timeout**, **#4 Fallback** (com C3), **#5 Retry**, **#8 Health Check** recebem a profundidade dos átomos
  Brooker/Gabrielson/Yanacek.
- **`description` (M4 / discoverability):** anexar keywords de resiliência. A skill já é keyword-rica para suas
  categorias; proposta de acréscimo mínima:
  > `'backoff', 'jitter', 'retry budget', 'token bucket', 'fail-open', 'black-hole', 'degraded read', 'stale cache', 'thundering herd'`
- **`hooks.json`:** ⚠️ o advisor printf **NÃO lista `defensive-patterns`** (achado desta fase — mesma omissão
  pré-existente que a Onda 2 registrou para `infrastructure`; não é desta feature). Sem linha de advisor para estender.
  **Proposta:** fora de escopo adicionar agora (registrar observação). *(Se quiser, adiciono `defensive-patterns` +
  `infrastructure` ao advisor numa linha — diga.)*

### Alvo B — `system-design` (sub-track fleet-resilience)

- **B.1 — Nova `## 11. Resiliência Distribuída`** no `SKILL.md` (após §10 SQL, antes do Cheat Sheet; R2 — anexa,
  sem conflito com §9/§10). Julgamento (D3): framing `distributed-challenges` (os 5 resultados de uma chamada / estado
  UNKNOWN) → regras de overload (`load-shedding`: descartar p/ goodput; `deadline-propagation`: propagar tempo restante)
  → isolamento (`shuffle-sharding`: blast radius). Ponteiros pras references/§ e cross-link a `defensive-patterns`
  (padrões de serviço) e `messaging-operations.md` (backpressure, Onda 1).
- **B.2 — EXTENSÃO de `replication-sharding.md`** (CA-07 — sharding já coberto): subseção curta **"Shuffle Sharding —
  isolamento de blast radius"** (combinatório; melhoria exponencial vs sharding regular; bulkhead 1-em-N) + cross-link
  `dns-hosting.md` (Route 53 = shuffle sharding aplicado a nameservers, Onda 2) e `defensive-patterns #6 Bulkhead`.
  **Não** vira reference nova.
- **B.3 — Linhas no Cheat Sheet:**
  - `Sobrecarga | load shedding (fast-reject) p/ preservar goodput | shedding caro/sem instrumentação = pior`
  - `Cadeia de chamadas | propague deadline (tempo restante), não timeout fixo por hop | clock wall em vez de monotônico`
  - `Isolar tenant/falha | shuffle sharding (blast radius exponencialmente menor) | poison-request que derruba qualquer worker`
- **B.4 — `description` (M4):** anexar antes de "or faces infrastructure…":
  > `'load shedding', 'goodput', 'shuffle sharding', 'blast radius', 'deadline propagation', 'distributed systems failure modes', 'overload', 'fault isolation'`
- **B.5 — `hooks.json`:** anexar `, resiliencia (load shedding, shuffle sharding, deadline)` à linha do advisor da
  `system-design` (já estendida p/ filas+SQL nas Ondas 1-2). É a **única** das 3 skills no advisor.

### Alvo C — `infrastructure` (sub-track deploy)

- **C.1 — EXTENSÃO de `deployment-patterns.md`** (CA-07 — deploy já coberto): subseção **"Blue-Green Deploy"** ao lado
  do conteúdo zero-downtime/PM2/Docker existente — dois slots rotulados, switch via reverse-proxy (config única, só muda
  a porta), **health check na porta privada ANTES do cutover**, rollback por inversão do switch, script único de cutover.
  **Nota honesta:** o corpus **não cobre** migrations/estado compartilhado entre cores como mecânica — a síntese marcou
  esse limite; a seção dirá explicitamente que blue-green não resolve compatibilidade de schema (sem inventar expand/contract).
- **C.2 — `SKILL.md` §5 (Deployment Patterns):** mini-árvore/bullet "blue-green: health check pré-switch + rollback por
  inversão" + ponteiro pra subseção da reference. Profundidade na reference.
- **C.3 — `description` (M4):** anexar antes de "or faces infrastructure…":
  > `'blue-green deployment', 'zero-downtime deploy', 'deployment health check', 'cutover', 'instant rollback'`
- **C.4 — `hooks.json`:** ⚠️ `infrastructure` **não está no advisor** (mesmo achado da Onda 2). Fora de escopo estender
  agora; discoverability fica na `description`.

---

### Conflitos resolvidos nesta onda (D4 — tensão + regra)

| Conflito | Onde (synthesis → alvo) | Como (já sintetizado, dois lados citados) |
|---|---|---|
| **C3** degraded-read | `degraded-read-tension` → `defensive-patterns #4 Fallback` | servir cache stale mantém disponibilidade (Yanacek/health-checks + Galego ACID/BASE) × leitura degradada É fallback modal perigoso (Gabrielson, cascata Amazon 2001) + regra: decisão irreversível? caminho exercitado? |
| **C4** retry throttle × circuit breaker | `retry-throttling-vs-circuit-breaker` → `defensive-patterns #2/#5` | token bucket / retry budget (default adaptativo, AWS) × circuit breaker (corte modal, difícil de testar, mas legítimo p/ corte total testado) — **resolução profunda do C4 que a Onda 1 remeteu pra cá** |

CA-04 não se aplica a esta onda (era da Onda 1, exactly-once). Os dois conflitos desta onda têm os dois lados citados
nominalmente nos arquivos de síntese (verificado: `grep "> fonte:"`).

---

### Guardrails desta seção

- **CA-06:** nada acima é executado até você aprovar. Esta é a proposta, não a edição.
- **CA-07 / D1 (a regra central desta onda):** **ZERO reference nova.** Tudo é extensão de arquivo existente
  (`replication-sharding.md`, `deployment-patterns.md`, os 3 `SKILL.md`) + cross-link. Resiliência já era coberta.
- **R2 (serialização):** `system-design/SKILL.md` recebe a **§11 anexada após §10** (Ondas 1/2). Sequencial, sem
  conflito. `defensive-patterns` e `infrastructure` são alvos **independentes** → aplicação paralela OK (worktrees).
- **CA-05:** após aplicar, `bun test` nas wire/prefaces das 3 skills tocadas deve ficar verde (runner nativo do bun —
  o wrapper `bun run test` quebra no Windows por "linha de comando muito longa", pré-existente).
- **CA-01 (audit GLOBAL final):** a fase-05 fecha a feature inteira — todas as **32 fontes in-scope → ≥1 átomo → alvo**
  (OU OUT-com-motivo), somando as 3 ondas. + passe adversarial (Brooker/Yanacek/Gabrielson/MacCárthaigh) + olhos-frescos.

---

### O que sua aprovação destrava (fase-04)

Aprovar esta seção autoriza a **aplicação Onda 3** (fase-04, worktrees, 1 subagente/arquivo-alvo): enriquecer as
categorias de `defensive-patterns/SKILL.md`; criar a §11 + cheat-sheet + description em `system-design/SKILL.md` e
estender `replication-sharding.md` + advisor `hooks.json`; estender `deployment-patterns.md` + `SKILL.md`/description de
`infrastructure`. Depois, fase-05 verifica (`bun test` das 3 skills + **audit GLOBAL de cobertura** + passe adversarial
+ revisão olhos-frescos) e fecha a feature.

**Decisões que preciso de você (gate Onda 3):**
1. **Destino P5 (limítrofes):** `load-shedding` + `deadline-propagation` em **`system-design` §11** (recomendado) ou
   como **categorias novas em `defensive-patterns`**?
2. **§11 `system-design`:** criar nova `## 11. Resiliência Distribuída` (recomendado) — confirma? E `shuffle-sharding`
   **estende** `replication-sharding.md` (não vira ref nova) — OK?
3. **`description` (3 skills)** e **mapa conceito→alvo** — OK como propostos, ou ajustar?
4. **Advisor `hooks.json`:** estender só a linha da `system-design` (recomendado) — ou quer que eu **adicione
   `defensive-patterns` + `infrastructure` ao advisor** (corrige a omissão pré-existente que a Onda 2 registrou)?
