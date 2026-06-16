# Extraction Schema — Átomo de Conhecimento (Fase 1)

**PRD:** ./PRD.md · **Context:** ./CONTEXT.md · **Date:** 2026-06-15

Contrato que cada subagente de extração (Fase 1, 1 por fonte, contexto isolado) preenche para **cada conceito** que a fonte ensina. **Extrair, não resumir.** Um átomo = um conceito-em-uma-fonte. Subagentes **escrevem os átomos em disco**; o contexto pai não re-transcreve.

---

## Os 9 campos

```yaml
conceito:        # nome canônico do conceito (usar o vocabulário abaixo p/ permitir regrupar na Fase 2)
afirmacao:       # a regra/insight, em 1-3 frases. O núcleo. Específico, não genérico.
camada:          # julgamento | operacional | referencia-oficial   (ver semântica abaixo)
quando_usar:     # condições em que a afirmação se aplica
quando_NAO_usar: # condições em que NÃO se aplica (obrigatório — metade do valor consultor)
trade_off:       # o custo do "sim"; o que se perde ao seguir a afirmação
anti_pattern:    # o erro comum que esta afirmação previne
regra_de_decisao:# o gatilho acionável: "SE <condição> ENTÃO <escolha>"
fonte:           # autor | título | âncora   (CITAÇÃO OBRIGATÓRIA — ver formato abaixo)
```

### Campos auxiliares (metadata, não conteúdo)

```yaml
source_id:       # id da fonte (do triage-results.json)
bucket:          # queues | sql-internals | dns-routing | resilience
flags:           # lista opcional: [misconception, unverified, rescue-nugget]
```

---

## Semântica de `camada`

| Camada | O que é | Vai para |
|---|---|---|
| **julgamento** | Trade-off, "quando usar/NÃO", árvore de decisão. O conteúdo do Modo Consultor. | Seção no SKILL.md + topo da reference |
| **operacional** | Como fazer: snippet, config, output de comando, esqueleto de implementação. | Corpo da reference (com código, D3) |
| **referencia-oficial** | Fato canônico de doc oficial (Postgres EXPLAIN, AWS Route 53 limits). Usado p/ suprir sub-tópicos finos (D6) e fixar fatos contestados. | Reference, marcado como citação oficial |

Uma fonte pode produzir átomos em múltiplas camadas. Sub-tópicos finos (EXPLAIN-reading, partitioning — D6) recebem átomos `referencia-oficial` extraídos de doc oficial citada, com `flags: [unverified]` até revisão.

---

## Formato de `fonte` (citação obrigatória)

```
<autor> | <título da fonte> | <âncora>
```

`<âncora>` conforme `citation_anchor_style` da triagem:
- **video-transcription** sem timestamps → `seção: <tema>` ou `trecho: "<5-8 palavras>"`
- **blog-article / aws-builders-library** → `seção: <heading>` ou `parágrafo: <tema>`

Exemplos:
- `Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: "The Solution"`
- `David Yanacek | Avoiding insurmountable queue backlogs | seção: dead-letter queues`
- `PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html` (camada referencia-oficial)

**Sem `fonte` válido, o átomo não persiste.** (RNF source-driven.)

---

## Regras de extração

1. **Exaustivo por fonte** — extrair TODO conceito distinto; melhor um átomo a mais que perder um.
2. **Um conceito por átomo** — não agrupar dois insights num só.
3. **`afirmacao` específica** — "use índice composto quando a query filtra por A e ordena por B" > "índices ajudam".
4. **`quando_NAO_usar` é obrigatório** — se a fonte não diz, inferir do trade-off ou marcar `[A DEFINIR]`.
5. **`flags: [misconception]`** — quando a fonte afirma algo que outra fonte refuta (ex: `pubsub-nao-mq` tratando exactly-once como selecionável). A síntese (Fase 2) corrige e cita a correção. NÃO descartar o átomo.
6. **`flags: [unverified]`** — átomo de doc oficial (D6) ou afirmação não-confirmada; revisão humana antes de persistir na skill.
7. **`flags: [rescue-nugget]`** — átomo in-scope vindo de fonte majoritariamente off-topic (Pixeltable D5). Só os nuggets; ignorar a narrativa de produto.
8. **Não inventar** — se a fonte não cobre um campo, `[A DEFINIR]`, nunca preencher por suposição.

---

## Convenção de disco

```
Infos/_pipeline/
├── normalized/{source_id}.md          # Fase 0
├── triage/triage-results.json         # Fase 0.5 ✅
├── atoms/{source_id}/{conceito-slug}.md   # Fase 1 (subagentes escrevem aqui)
└── synthesis/{conceito-slug}.md       # Fase 2 (1 por conceito canônico)
```

Tudo gitignored (`Infos/`). A Fase 2 lê `atoms/**` agrupando por `conceito` (não por `source_id`) — daí o vocabulário canônico abaixo.

---

## Vocabulário Canônico de Conceitos (eixo de regrupamento da Fase 2)

Derivado da triagem. Cada agente de síntese (Fase 2) recebe todos os átomos de UM conceito, de TODAS as fontes.

### Filas (Onda 1)
1. Pub/Sub vs Message Queue (fan-out de fatos vs jobs a workers)
2. Delivery semantics: at-most-once / at-least-once / exactly-once
3. Exactly-once: delivery vs processing (**tensão Kreps↔Treat + regra**)
4. Idempotent consumer pattern (dedup store, chave composta + unique index, transação atômica)
5. Idempotency keys (client-supplied vs server-issued; payment-ID weaving)
6. Ordering (Kafka per-partition; buffering/reorder; supersede-by-timestamp/version; concorrência×ordering)
7. Dead-letter queues & poison messages
8. Backlog management (visibility timeout, heartbeat, age-based rerouting, overflow, TTL, LIFO-na-recovery)
9. Backpressure & load leveling
10. Broker landscape (brokerless×brokered; RabbitMQ/Kafka/SQS/NATS/NSQ/Redis)
11. RabbitMQ queue types (Classic / Quorum-Raft-WAL-fsync / Stream-offset)
12. Background jobs operacional (Bull/BullMQ+Redis; worker isolation; retries/priority/delay/rate-limit; monitoring)
13. Outbox pattern (mensageria transacional)
14. Retries + backoff + jitter (retry seguro; uma camada; throttling×circuit breaker)
15. Async file-processing (object-store→queue × API-callback→publish)
16. Durabilidade (fsync; in-memory×persistent; DB-backed queue×broker)

### SQL-internals (Onda 2)
1. Por que índices existem (reduzir espaço de busca; full scan×index)
2. B-tree vs B+ tree (balanceamento; nós internos só-chave; folhas ligadas; RAM-fit; range queries)
3. Tipos e custo de índice (clustered/secondary; write amplification; caveat MongoDB B-tree)
4. EXPLAIN / leitura de query plan **[doc oficial — D6]**
5. Particionamento: range/list/hash, partition pruning **[doc oficial — D6]**
6. WAL / journal modes (SQLite WAL×rollback; checkpoint; snapshot isolation)
7. ACID + BASE (atomicidade/isolamento/durabilidade; eventual consistency; hash index p/ unicidade)
8. Storage & hardware (IOPS, random IO, NVMe×EBS, working set×RAM)
9. SQLite em produção (single-writer contention; evitar long transactions; cache/fila DB-backed)
10. Recursive CTE / detecção de gap (anti-join LEFT JOIN IS NULL)
11. Replicação semi-sync & failover (surge-replacement) → cross-link `replication-sharding`
12. Storage desagregado×co-locado (Aurora×Metal)
13. Nuggets Pixeltable (ACID atômico no pipeline; Postgres-fila-transacional; DAG recompute) **[rescue]**

### DNS-routing (Onda 2)
1. Overview das políticas (simple/weighted/latency/failover/geolocation/geoproximity/multivalue)
2. Simple (registro único; multi-valor aleatório; sem health check)
3. Weighted (0-255; fórmula; canary/A-B; weight 0)
4. Latency-based (multi-região; menor latência)
5. Failover (active-active×active-passive; health check obrigatório; primary/secondary)
6. Geolocation (origem da query; menor-região; default record; GDPR/idioma)
7. Geoproximity (localização + bias; requer Traffic Flow)
8. Multivalue answer (até 8 records health-checked; não substitui LB)
9. Public×private hosted zones (decouple-via-private-DNS)
10. Integração health check (health check ID; /health)
11. TTL & caching
12. Geo×latency×geoproximity (a confusão clássica)

### Resiliência (Onda 3 — enriquecimento)
1. Timeouts (percentil; cobrir todas as chamadas remotas)
2. Retries seguros (idempotência; uma camada; 4xx no-retry)
3. Backoff + jitter (exponencial limitado; thundering herd)
4. Retry throttling / token bucket × circuit breaker
5. Load shedding (goodput×throughput; fast-reject; priorizar health check)
6. Propagação de deadline (tempo-restante por hop; clocks monotônicos)
7. Health checks (liveness/local/dependency/anomaly; fail-open; black-hole)
8. Avoiding fallback (código modal; cascata Amazon 2001; endurecer primário)
9. Shuffle sharding (isolamento combinatório; blast radius; Route 53 nameservers)
10. Challenges distribuídos (8 modos de falha; estado UNKNOWN; explosão de testes)
11. Tensão degraded-read (servir cache stale × avoiding fallback — **C3**)
12. Blue-green deploy (cutover zero-downtime; health check antes do switch)
