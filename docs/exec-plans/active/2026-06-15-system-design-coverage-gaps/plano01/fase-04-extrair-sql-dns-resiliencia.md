# Fase 04: Extrair SQL-internals + DNS-routing + Resiliência (Fase 1 do Pipeline)

**Plano:** 01 — Fundação do Corpus
**Sizing:** 2h
**Depende de:** fase-02 (precisa dos `normalized/` dessas fontes). **NÃO depende da fase-03** — pode rodar em paralelo (fontes disjuntas).
**Visual:** false

---

## O que esta fase entrega

Extração das fontes restantes — `primary_bucket ∈ {sql-internals, dns-routing, resilience}` — com o mesmo contrato isolado 1/fonte da fase-03, incluindo o `rescue-nugget` Pixeltable (D5) e o rescue `deploy-sem-derrubar-blue-green` (R). Fecha o atom-store das ondas 2 e 3.

---

## Paralelismo com fase-03

Esta fase e a fase-03 dependem **ambas só da fase-02** e operam sobre **conjuntos disjuntos de fontes** (primary-queues vs SQL/DNS/resiliência). **Podem rodar em paralelo.** A fase-05 (audit) é que espera as duas fecharem.

---

## Fontes a extrair (19 fontes: 6 SQL + 1 Pixeltable rescue + 4 DNS + 8 resiliência)

### SQL-internals (6) + Pixeltable rescue (1)

| source_id | Autor | all_buckets | Notas de extração |
|---|---|---|---|
| `acid-base-explicado` | Augusto Galego | [sql-internals] | **D9** — atomicidade/isolamento/durabilidade/BASE/eventual-consistency/hash-index p/ unicidade. **C7** (ACID p/ dinheiro: pragmático NoSQL em pagamentos). |
| `btree-vs-bplustree-db` | Hussein Nasser | [sql-internals] | índices internals (deep); B-tree×B+tree, nós internos só-chave, folhas ligadas, RAM-fit, range queries; MongoDB/Discord caso real. **C9** (B+ absolutismo — apresentar nuance). |
| `sqlite-wal-mode-fast` | Aaron Francis | [sql-internals] | WAL×rollback (~10x), checkpoint, snapshot isolation, pages/journal. Camadas O,RO. |
| `dhh-sqlite-stoicism` | Aaron Francis & DHH | [sql-internals, queues, resilience] | SQLite prod (single-writer contention, evitar long transactions), fila/cache DB-backed (Solid). **C5** (DB-queue×broker — átomo `bucket: queues`). |
| `making-mysql-faster-planetscale-metal` | A.Francis & R.Crowley | [sql-internals, resilience, dns-routing] | IOPS/NVMe×EBS, semi-sync replication, surge-replacement. **C6** (storage desagregado×co-locado). Átomos cross-bucket: resiliência (surge-replacement) + DNS. |
| `sql-recursive-cte-missing-order` | Aaron Francis | [sql-internals] | recursive CTE + LEFT JOIN IS NULL p/ gap detection (webhook perdido). Camada operacional. |
| `pixeltable-multimodal-ai-db` | A.Francis & M.Kornacker | [off-topic, sql-internals, resilience] | **D5 rescue-nugget** — extrair SÓ ~3-4 átomos: ACID atômico all-or-nothing no pipeline, Postgres-como-fila-transacional, DAG incremental recompute. **Ignorar a narrativa de produto.** Todos `flags: [rescue-nugget]`. |

> **GOTCHA IMPORTANTE (D6):** os docs oficiais Postgres/MySQL (EXPLAIN-reading, mecânica de partições) **NÃO são extraídos aqui.** Eles são puxados durante a SÍNTESE (Plano 03 fase-02) como camada `referencia-oficial` via WebFetch. Plano 01 cobre **apenas as 32 fontes do corpus.** Se uma fonte do corpus mencionar EXPLAIN/partições de passagem, extrai-se o átomo normalmente (camada conforme a fonte) — o suplemento oficial é outra camada, adicionada na síntese.

### DNS-routing (4)

| source_id | Autor | all_buckets | Notas de extração |
|---|---|---|---|
| `route53-choosing-policy-pytholic` | Pythalic | [dns-routing, resilience] | 6 políticas (simple/weighted/latency/failover-active-active+active-passive/geolocation/multivalue), fórmulas, regras de health-check. Camadas J,O,RO. `anchor: paragraphs`. |
| `route53-policies-tutorial-india` | desconhecido | [dns-routing, resilience] | overview 5 políticas core, framing de negócio (canary, HA, localização) + custo. `anchor: paragraphs`. |
| `route53-latency-vs-geoproximity-vs-geolocation-ellerbeck` | Michael Ellerbeck | [dns-routing] | **ÚNICA fonte com geoproximity + bias + Traffic Flow.** latency×geoproximity×geolocation. `anchor: section-headings`. |
| `route53-handson-mcleod-academy` | McLeod Academy | [dns-routing, resilience] | public/private hosted zones, decouple-via-private-DNS, setup passo-a-passo. Camadas J,O,RO. `anchor: section-headings`. |

### Resiliência (8)

| source_id | Autor | all_buckets | Notas de extração |
|---|---|---|---|
| `deploy-sem-derrubar-blue-green` | Augusto Galego | [resilience] | **RESCUE** (`rescue_flag:true`): blue-green deploy + health checks antes do switch + zero-downtime cutover (NGINX/VPS). |
| `aws-timeouts-retries-backoff-jitter` | Marc Brooker | [resilience, queues] | timeouts (percentis), backoff exponencial limitado + jitter, retry em UMA camada, retry throttling/token bucket × circuit breaker. Camadas J,O,RO. **C4.** |
| `aws-load-shedding-overload` | David Yanacek | [resilience, queues] | load shedding (goodput×throughput), fast-reject, deadline propagation, degradação graciosa. Camadas J,O,RO. **C4.** |
| `aws-challenges-distributed-systems` | Jacob Gabrielson | [resilience, queues] | 8 modos de falha, estado UNKNOWN, explosão da matriz de testes, propagação epidêmica. Camadas J,RO. |
| `aws-shuffle-sharding-workload-isolation` | Colm MacCárthaigh | [resilience, dns-routing] | shuffle sharding (isolamento combinatório, blast radius, Route 53 2048 vNS). Camadas J,O,RO. Átomo DNS cross-bucket. |
| `shuffle-sharding-fault-isolation` | Colm MacCárthaigh | [resilience, dns-routing, queues] | analogia de cartas, blast radius 1/4→1/1680, stateless×stateful, AZ-aware, Route 53 Infima. **C4** (retries sequenciais). |
| `implementing-health-checks` | David Yanacek | [resilience, dns-routing, queues] | health checks em camadas (liveness/local/dependency/anomaly), fail-open, black-hole, autoridade centralizada. **C3** (degraded-read: servir cache stale). Camadas J,O,RO. |
| `avoiding-fallback-distributed-systems` | Jacob Gabrielson | [resilience] | evitar fallback (código modal, cascata Amazon 2001), endurecer primário, empurrar erro ao caller, fallback→failover exercitado. **C3/C4.** |

> Total desta fase: 6 SQL + 1 Pixeltable + 4 DNS + 8 resiliência = **19 fontes**. Somadas às 13 da fase-03 = 32 in-scope.

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `Infos/_pipeline/atoms/{source_id}/{conceito-slug}.md` | Create | 1 átomo por conceito distinto, schema de 9 campos, `fonte:` obrigatório. Para os 19 source_ids acima. Pixeltable: só os 3-4 nuggets. |

---

## Implementação

### Passo 1: Lançar 1 subagente isolado por fonte

19 subagentes, contexto isolado, paralelizáveis entre si e com a fase-03. Mesmo contrato da fase-03 (recebe só `normalized/{source_id}.md`, extrai exaustivo, grava em `atoms/{source_id}/`).

### Passo 2: Contrato de extração (idêntico ao da fase-03)

Os 9 campos do `extraction-schema.md`, `fonte:` obrigatório, `quando_NAO_usar` obrigatório, `[A DEFINIR]` onde a fonte não cobre, vocabulário canônico (seções SQL-internals / DNS-routing / Resiliência) como guia de nomes de conceito.

### Passo 3: Pixeltable — SÓ nuggets (D5)

`pixeltable-multimodal-ai-db` é `primary_bucket: off-topic`. Extrair APENAS:
1. ACID/atomicidade all-or-nothing no pipeline (`bucket: sql-internals`)
2. Postgres-como-fila-transacional (`bucket: sql-internals` ou `queues` — usar o que o conceito mais se aproxima; o conflict do triage liga a fila-transacional)
3. DAG incremental recompute (`bucket: sql-internals`)
4. (eventual) trade-off de failure-mode ("perde o trabalho na falha, sem restart" — anti-idempotent-retry, `bucket: resilience`)

Todos com `flags: [rescue-nugget]`. **Ignorar** toda a narrativa de produto Pixeltable. Se o subagente produzir átomos de marketing/produto, descartá-los — não é o material in-scope.

### Passo 4: Cross-bucket — marcar `bucket` correto (G1)

Muitas fontes desta fase são cross-bucket:
- `making-mysql-faster-planetscale-metal`: átomos SQL (`bucket: sql-internals`) + surge-replacement (`bucket: resilience`) + qualquer menção DNS (`bucket: dns-routing`).
- `aws-shuffle-sharding-workload-isolation` / `shuffle-sharding-fault-isolation`: átomo de Route 53 nameservers/Infima (`bucket: dns-routing`) além dos de resiliência.
- `implementing-health-checks`: átomo de health-check-ID/DNS-failover-integration (`bucket: dns-routing`), átomo de redelivery (`bucket: queues`), além dos de resiliência.
- `dhh-sqlite-stoicism`: átomo Solid Queue DB-backed (`bucket: queues`) além dos SQL.

A síntese de Filas (Plano 02) e de DNS (Plano 03) vão buscar esses átomos cross-bucket por conceito — daí a importância do campo `bucket` correto.

### Passo 5: Flags & conflitos (não resolver — só ancorar)

- **`rescue-nugget`:** todos os átomos de `pixeltable-multimodal-ai-db`; e o rescue `deploy-sem-derrubar-blue-green` é rescue-por-título → extrai exaustivamente (não nugget-only), sem flag obrigatório.
- **Conflitos a ancorar (resolução é nas ondas):** C3 (degraded-read) → átomo-âncora em `implementing-health-checks` (servir cache stale) vs `avoiding-fallback-distributed-systems` (cascata 2001). C4 (retry safety) → `aws-timeouts-retries-backoff-jitter` vs `avoiding-fallback` vs `shuffle-sharding-fault-isolation`. C6 (storage desagregado) → `making-mysql-faster`. C7 (ACID p/ dinheiro) → `acid-base-explicado`. C9 (B+ absolutismo) → `btree-vs-bplustree-db`. Garantir que cada fonte produz o átomo da sua posição; **não reconciliar aqui**.

---

## Gotchas

- **G3 do plano (Pixeltable só nuggets):** o erro fácil é extrair a narrativa de produto. Só 3-4 átomos, todos `rescue-nugget`. Se o diretório `atoms/pixeltable-multimodal-ai-db/` tiver muito mais que 4 átomos, provavelmente vazou narrativa de produto.
- **G4 do plano (D6 NÃO aqui):** nenhum WebFetch de doc oficial Postgres/MySQL nesta fase. EXPLAIN-reading e partition-mechanics são supridos na síntese (Plano 03 fase-02), camada `referencia-oficial`. Não confundir "a fonte do corpus mencionou EXPLAIN" (extrai normal) com "puxar a doc oficial de EXPLAIN" (não é aqui).
- **G1 do plano (cross-bucket):** esta fase tem a maior concentração de fontes cross-bucket. Marcar `bucket` correto é o que evita perder átomos de resiliência/DNS/queues escondidos em fontes SQL.
- **G6 do plano (`Infos/` gitignored):** átomos não versionáveis.
- **G7 do plano (rescues por título):** `deploy-sem-derrubar-blue-green` e `pixeltable-multimodal-ai-db` são in_scope apesar do título — extrair (Pixeltable só nuggets; deploy exaustivo).
- **Local — `making-mysql-faster` é tripla-bucket:** primary sql, mas all=[sql,resilience,dns]. É a fonte que mais facilmente perde átomos cross-bucket. Conferir que produziu átomo de surge-replacement (`bucket: resilience`).

---

## Verificação

> **Audit de cobertura por fonte, não TDD.** Cada fonte restante → ≥1 átomo; átomos cross-bucket com `bucket` correto; nuggets Pixeltable marcados `rescue-nugget`.

### Checklist

- [ ] **Cada fonte restante → ≥1 átomo:** existe `atoms/{source_id}/` com ≥1 `.md` para cada um dos 19 source_ids desta fase.
  - Comando: para cada id, contar `*.md` em `atoms/{id}/` → ≥1.
- [ ] **Todo átomo tem `fonte:`:** nenhum átomo desta fase sem a linha `fonte:` (CA-03).
  - Comando (Grep): `.md` sob estes 19 diretórios SEM `^fonte:` → 0.
- [ ] **Pixeltable só nuggets:** `atoms/pixeltable-multimodal-ai-db/` tem 3-4 átomos, TODOS com `rescue-nugget`, nenhum de narrativa de produto.
  - Comando (Grep): todo átomo dessa fonte casa `rescue-nugget`; contagem entre 3 e ~4.
- [ ] **Cross-bucket marcado:** `making-mysql-faster-planetscale-metal` produziu ≥1 átomo `bucket: resilience` (surge-replacement); fontes shuffle-sharding produziram ≥1 átomo `bucket: dns-routing`; `implementing-health-checks` produziu átomo `bucket: dns-routing`.
  - Comando (Grep): `bucket: resilience` e `bucket: dns-routing` aparecem em átomos sob fontes primary-sql e primary-resilience respectivamente.
- [ ] **DNS tem geoproximity:** `route53-latency-vs-geoproximity-vs-geolocation-ellerbeck` produziu átomo de geoproximity+bias (única fonte que cobre).
- [ ] **Conflitos ancorados:** C3/C4/C6/C7/C9 têm átomo-âncora nas fontes indicadas (verificação cruzada com a fase-05).

---

## Critério de Aceite

**Por máquina:**
- Para cada um dos 19 source_ids desta fase, `atoms/{id}/` existe com ≥1 `.md`.
- `atoms/pixeltable-multimodal-ai-db/` tem ≤4 átomos, todos `rescue-nugget`.
- `grep -L '^fonte:'` sobre os átomos desta fase → vazio.
- Existe ≥1 átomo `bucket: resilience` sob `making-mysql-faster-planetscale-metal` e ≥1 `bucket: dns-routing` sob alguma fonte primary-resilience.

**Por humano:**
- Amostragem de `making-mysql-faster-planetscale-metal` (tripla-bucket) confirma que átomos de resiliência (surge-replacement) e DNS não foram perdidos por estarem fora do bucket primary.

---

<!-- Gerado por /plan-feature em 2026-06-15 -->
