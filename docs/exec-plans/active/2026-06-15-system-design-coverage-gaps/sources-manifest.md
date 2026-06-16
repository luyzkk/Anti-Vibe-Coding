# Sources Manifest — 35 fontes (32 in-scope / 3 OUT)

**PRD:** ./PRD.md · **Raw:** `Infos/_pipeline/triage/triage-results.json` · **Date:** 2026-06-15

Triado por **conteúdo** (Fase 0.5, 7 subagentes read-only, leitura integral). Zero descarte silencioso — os 3 OUT estão listados com motivo.

Legenda buracos: **Q**=Filas · **SQL**=SQL-internals · **DNS**=DNS-routing · **R**=resiliência · **—**=off-topic.
Camadas: **J**=julgamento · **O**=operacional · **RO**=referencia-oficial.

---

## Filas (Onda 1 — Must) — 14 fontes

| Fonte | Autor | Tipo | Buracos | Camadas | Dens. | Nota |
|---|---|---|---|---|---|---|
| Pub/Sub não é Message Queue | Augusto Galego | vídeo | Q | J,O | alta | **misconception-flag**: trata exactly-once como selecionável (corrigir) |
| RabbitMQ: Stream/Quorum/Classic | Full Cycle | vídeo | Q, R | J,O | alta | tipos de fila, Raft, WAL, fsync, throughput |
| Background jobs no Node.js com Redis | Rocketseat | vídeo | Q | O | alta | Bull+Redis operacional |
| Fix Duplicate Messages (Idempotent Consumer) | desconhecido (.NET/Azure SB) | vídeo | Q, R | J,O | alta | idempotent consumer + outbox |
| Build a robust Payments service (Idempotency Keys) | desconhecido | vídeo | Q, R | J,O | alta | idempotency keys; rescue resilience (retry/no-retry) |
| Idempotency and Ordering | desconhecido (CockroachDB) | vídeo | Q, R | J,O | alta | dedup + ordering |
| Dissecting Message Queues | Tyler Treat | artigo | Q | J,O | alta | survey 9 brokers; "guaranteed delivery is a myth" |
| Exactly-Once: One More Time | **Jay Kreps** | artigo | Q | J | alta | **conflito C1** (pró-exactly-once Kafka) |
| You Cannot Have Exactly-Once Delivery (redux) | **Tyler Treat** | artigo | Q | J | alta | **conflito C1** (anti — delivery×processing) |
| You Cannot Have Exactly-Once Delivery | **Tyler Treat** | artigo | Q, R | J | alta | **conflito C1** (fundacional; Two Generals+FLP) |
| Avoiding insurmountable queue backlogs | David Yanacek | AWS BL | Q, R | O,RO,J | alta | backlog/DLQ/poison/visibility — operacional rico |
| Making retries safe with idempotent APIs | Malcolm Featonby | AWS BL | Q, R | J,O,RO | alta | client request token |
| Design a File Upload Service | desconhecido | vídeo | Q, R | J,O | alta | **RESCUE**: async via fila + presigned URLs + CDN |
| (Pixeltable — nuggets) | A.Francis & M.Kornacker | vídeo | SQL, R | J,O | média | **rescue-nugget** (ver SQL) |

## SQL-internals (Onda 2 — Should) — 7 fontes

| Fonte | Autor | Tipo | Buracos | Camadas | Dens. | Nota |
|---|---|---|---|---|---|---|
| B-tree vs B+ tree in Database Systems | Hussein Nasser | vídeo | SQL | J,O | alta | índices internals (deep); MongoDB/Discord caso real |
| SQLite's WAL mode is fast fast | Aaron Francis | vídeo | SQL | O,RO | alta | WAL×rollback, checkpoint, snapshot |
| DHH discusses SQLite | A.Francis & DHH | vídeo | SQL, Q, R | J,O | média | SQLite prod; fila/cache DB-backed (Solid) |
| Making MySQL faster | A.Francis & R.Crowley | vídeo | SQL, R, DNS | J,O | alta | IOPS/NVMe×EBS; semi-sync; surge-replacement |
| SQL for fun and profit | Aaron Francis | vídeo | SQL | O | média | recursive CTE / gap detection |
| ACID e BASE explicado | Augusto Galego | vídeo | SQL | J,O | alta | **D9** — atomicidade/isolamento/durabilidade/BASE/hash index |
| The database for all your AI needs | A.Francis & M.Kornacker | vídeo | — (SQL,R) | J,O | média | **D5 rescue-nugget**: só ACID/fila-transacional/DAG |
| *[suplemento]* PostgreSQL/MySQL EXPLAIN + PARTITION docs | docs oficiais | doc | SQL | RO | — | **D6** — Fase 2 puxa p/ EXPLAIN-reading + partitioning |

## DNS-routing (Onda 2 — Should) — 4 fontes

| Fonte | Autor | Tipo | Buracos | Camadas | Dens. | Nota |
|---|---|---|---|---|---|---|
| Choosing a Route 53 Routing Policy | Pythalic | vídeo | DNS, R | J,O,RO | alta | 6 políticas, fórmulas, health-check |
| AWS Route 53 policies Tutorial | desconhecido | vídeo | DNS, R | J,O | média | framing de negócio (canary, HA, localização) |
| Latency vs Geoproximity vs Geolocation (Whizlabs) | Michael Ellerbeck | vídeo | DNS | J,O | média | **única fonte com geoproximity + bias** |
| Master AWS Route 53 (Hands-On) | McLeod Academy | vídeo | DNS, R | J,O,RO | alta | public/private zones; setup passo-a-passo |

## Resiliência (Onda 3 — Could) — 8 fontes (enriquecem skills existentes)

| Fonte | Autor | Tipo | Buracos | Camadas | Dens. | Alvo de enriquecimento |
|---|---|---|---|---|---|---|
| Timeouts, Retries and Backoff with Jitter | Marc Brooker | AWS BL | R, Q | J,O,RO | alta | defensive-patterns |
| Using load shedding to avoid overload | David Yanacek | AWS BL | R, Q | J,O,RO | alta | defensive-patterns / system-design |
| Challenges with distributed systems | Jacob Gabrielson | AWS BL | R, Q | J,RO | alta | system-design |
| Workload isolation using shuffle sharding | Colm MacCárthaigh | AWS BL | R, DNS | J,O,RO | alta | system-design / infrastructure |
| Shuffle sharding: massive & magical fault isolation | Colm MacCárthaigh | artigo | R, DNS, Q | J,O | alta | system-design / defensive-patterns |
| Implementing health checks | David Yanacek | AWS BL | R, DNS, Q | J,O,RO | alta | infrastructure / system-design |
| Avoiding fallback in distributed systems | Jacob Gabrielson | AWS BL | R | J,O | alta | defensive-patterns |
| Como fazer deploy sem derrubar seu app | Augusto Galego | vídeo | R | O,J | média | **RESCUE**: blue-green + health checks → infrastructure |

## OUT — 3 fontes (registradas, não sintetizadas)

| Fonte | Autor | Motivo |
|---|---|---|
| Separando Dev Júnior de Dev Senior (Object Calisthenics) | Augusto Galego | Code quality/OOP — já coberto por `design-patterns`/`architecture` |
| O que fazer quando RESTful não for suficiente | Augusto Galego | gRPC/RPC — domínio `api-design` (já coberto); fora dos 3 gaps |
| O custo de usar muitas dependências | Augusto Galego | Supply-chain/deps — tangencia security/observabilidade; fora dos gaps |

---

## Registro de Conflitos cross-fonte (resolver na Fase 2 via D4)

| # | Conflito | Posições | Resolução proposta |
|---|---|---|---|
| **C1** | **exactly-once** | Kreps (alcançável no Kafka via idempotent producer+transações; idempotência sozinha não basta) × Treat ×3 (delivery impossível — Two Generals+FLP; só processing num closed system) × pubsub-nao-mq (equívoco) | Documentar tensão delivery×processing; regra prática = **idempotent consumer**; transações/outbox p/ atomicidade estado+saída; corrigir o equívoco citando Treat/Kreps |
| **C2** | idempotência basta? | Kreps (transações necessárias) × Treat/praticantes (at-least-once+idempotência=effective-once) | idempotência p/ side-effect single-system; transações/outbox p/ cross-system |
| **C3** | degraded-read fallback | health-checks (servir cache stale quando DB down) × avoiding-fallback (cascata Amazon 2001) | degraded-read OK se limitado + exercitado continuamente; nunca código modal só-de-crise |
| **C4** | retry safety | shuffle-sharding (retries sequenciais OK) × avoiding-fallback (retries viram fallback) × timeouts (uma camada, throttle) | retry proativo/paralelo + throttled + idempotente; nunca multi-camada cego |
| **C5** | DB-queue × broker | DHH (Solid Queue DB-backed) × norma (RabbitMQ/SQS/Kafka) | scale-dependent: DB-backed p/ baixo/médio volume; broker p/ alto throughput |
| **C6** | storage desagregado | Making-MySQL (contra Aurora p/ OLTP) × filosofia Aurora | trade-off, não absoluto |
| **C7** | ACID p/ dinheiro | acid-base (pragmático: NoSQL em pagamentos) × norma (ACID obrigatório) | nuance por escala/criticidade |
| **C8** | quem emite idempotency key | payments (server-issued) × idempotent-consumer/AWS (client-supplied) | depende de quem detecta a duplicata |
| **C9** | B+ tree absolutismo | btree ("B+ sempre ganha" como opinião) × MongoDB usa B-tree | apresentar nuance, não absoluto |

---

## Contagem

- **Total:** 35 fontes únicas (22 transcrições + 13 URLs).
- **In-scope:** 32 · **OUT:** 3.
- **Por buraco (primary_bucket):** Filas 13 · SQL-internals 6 · DNS-routing 4 · Resiliência 8 · off-topic 4 (3 OUT + Pixeltable rescatada IN). Soma: 13+6+4+8+4 = 35; in-scope = 13+6+4+8+1 = 32.
  - _Reconciliado contra `triage-results.json` (canônico) em 2026-06-15: a contagem anterior dizia Resiliência 6 / off-topic 6 — subcontava resiliência em 2. Os rescues `file-upload`→Filas e `deploy-sem-derrubar`→Resiliência têm `primary_bucket` no próprio conteúdo, não em off-topic; só Pixeltable é `primary_bucket: off-topic` rescatada IN._
- **Suplemento planejado (D6):** docs oficiais Postgres/MySQL (EXPLAIN, PARTITION) — camada `referencia-oficial`.
