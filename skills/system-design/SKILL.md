---
name: system-design
description: "This skill should be used when the user asks about 'CAP theorem', 'PACELC', 'system design', 'caching strategies', 'Redis', 'horizontal scaling', 'vertical scaling', 'load balancer', 'load balancing algorithms', 'round robin', 'least connections', 'consistent hashing', 'database replication', 'sharding', 'SQL vs NoSQL', 'eventual consistency', 'CDN', 'edge server', 'anycast', 'cache invalidation', 'serverless', 'Lambda', 'cold start', 'serverfull', 'VPS', 'EC2', 'PM2', 'message queue', 'pub/sub', 'message broker', 'delivery semantics', 'exactly-once', 'idempotent consumer', 'idempotency key', 'message ordering', 'dead letter queue', 'DLQ', 'poison message', 'backpressure', 'load leveling', 'backlog', 'RabbitMQ', 'quorum queue', 'background jobs', 'BullMQ', 'outbox pattern', 'message durability', 'database index', 'B-tree', 'B+ tree', 'clustered index', 'covering index', 'write amplification', 'WAL', 'write-ahead log', 'journal mode', 'ACID', 'BASE', 'EXPLAIN', 'query plan', 'EXPLAIN ANALYZE', 'table partitioning', 'partition pruning', 'recursive CTE', 'SQLite in production', 'IOPS', 'disaggregated storage', 'load shedding', 'goodput', 'shuffle sharding', 'blast radius', 'deadline propagation', 'distributed systems failure modes', 'overload', 'fault isolation', or faces infrastructure and scaling decisions. Provides expert consultation on distributed systems architecture, CDN, serverless, message queues, SQL internals, distributed resilience, and trade-offs."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[topic or architecture question]"
---

<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-01 — profile-aware-preface (PRD §RF-MH-05).
// Lê context UMA vez via readPrefaceContext (Plano 01). Lookup table per-skill (G3).
// Quando ctx.profile === null: fallback default = comportamento v6.2 intacto (CA-02).

import { readPrefaceContext } from '../lib/preface-context'
import { SYSTEM_DESIGN_PREFACE_BY_PROFILE, DEFAULT_SYSTEM_DESIGN_PREFACE } from './lib/system-design-prefaces'

const ctx = readPrefaceContext(process.cwd())
const preface = ctx.profile
  ? (SYSTEM_DESIGN_PREFACE_BY_PROFILE[ctx.profile] ?? DEFAULT_SYSTEM_DESIGN_PREFACE)
  : DEFAULT_SYSTEM_DESIGN_PREFACE

// Quando ctx.profile é não-nulo, prepend preface ao corpo da skill.
// Quando null, behavior idêntico a v6.2 (CA-02).
```

Se `preface` for não-vazio, inicie sua resposta com o conteúdo de `preface` e em seguida proceda com a consulta de system design normal.
Se `preface` for vazio (profile null), comportamento v6.2 intacto — sem preface, ir direto ao corpo.
<!-- profile-aware-preface:end -->

<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 03 fase-01 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// G1 do plano: bloco verbatim do Plano 01 fase-04 (security wire). Path fixo .claude/knowledge/INDEX.md (D11).
// CA-09: se INDEX ausente, preface = ''; comportamento da skill = v6.3.1 intacto.

import { getStackKnowledgePreface } from '../security/lib/stack-aware-preface'

const stackKnowledgePreface = getStackKnowledgePreface(process.cwd())
```

Se `stackKnowledgePreface` for não-vazio, **prepende** esta frase ao início da resposta (após o `preface` profile-aware, se ambos existirem). Se vazio, ignore — comportamento da skill segue do bloco `profile-aware-preface` acima sem mudança (CA-09).
<!-- stack-aware-preface:end -->

<!-- stale-capabilities-check:start -->
```typescript
// 2026-05-15 (Luiz/dev): wire-up CA-09 v6.3.0 (closed em v6.3.1 RF-SH-02) — non-blocking warning.
// G2 do plano02: NUNCA bloqueia execução — alinhado com stale-detector.ts:8-10.
// G6 do plano02: capabilities.json AUSENTE NÃO emite warning falso (silently null).
// G7 do plano02: shape atual de capabilities.json não tem `storedChecksums` — check direto por age.
// SYNC: logica espelhada em skills/lib/__tests__/stale-warning.test.ts:checkStaleCapabilities.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const __STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h — CA-09 PRD v6.3.1

function __readCapabilitiesGeneratedAt(projectRoot: string): string | null {
  try {
    const raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { generated_at?: unknown }
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  } catch {
    return null
  }
}

const __caps_generated_at = __readCapabilitiesGeneratedAt(process.cwd())
if (__caps_generated_at !== null) {
  const __age = Date.now() - new Date(__caps_generated_at).getTime()
  if (Number.isFinite(__age) && __age > __STALE_THRESHOLD_MS) {
    process.stderr.write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}
```
<!-- stale-capabilities-check:end -->

# System Design — Modo Consultor

Operar no Modo Consultor de System Design. ENSINAR conceitos de arquitetura de sistemas distribuidos — NAO executar codigo.

## Como Operar

1. Identificar o topico da consulta
2. Apresentar o conceito com explicacao clara, quando usar, quando NAO usar e trade-offs
3. Usar a arvore de decisao para guiar escolhas
4. Alertar sobre anti-patterns relevantes
5. Nunca gerar codigo — apenas ensinar e recomendar

Para implementacao apos entender o conceito, direcionar para `/anti-vibe-coding:tdd-workflow`.

> Cada topico tem um arquivo de referencia detalhado em `references/`. Consultar quando precisar de profundidade.

---

## 1. Teorema CAP e PACELC

O Teorema CAP afirma que um sistema distribuido so garante **2 de 3**: Consistencia, Disponibilidade, Tolerancia a Particao. Como particoes de rede ACONTECEM, a escolha real e **C vs A durante uma particao**.

PACELC estende o CAP para o dia-a-dia: sem particao, a escolha e **Latencia vs Consistencia**.

### Arvore de Decisao

```
O dado incorreto causa PREJUIZO FINANCEIRO ou LEGAL?
  SIM → CP (consistencia forte)
  NAO → O usuario percebe dado desatualizado por 1-5 segundos?
    NAO → AP (disponibilidade + eventual consistency)
    SIM → Depende da tolerancia do negocio
      Toleravel → AP com TTL curto
      Intoleravel → CP
```

> **Detalhes completos:** `references/cap-theorem.md` — posicionamento de bancos no PACELC, split-brain, quorum, eleicao de lider, implementacao CP vs AP.

---

## 2. Escalabilidade

**REGRA:** Vertical primeiro. Mais simples, mais barato, sem mudanca arquitetural. Horizontal so ao atingir limite ou precisar de redundancia.

| Tipo | O Que Faz | Quando Usar |
|------|-----------|-------------|
| **Vertical (Scale Up)** | Mais CPU, RAM, disco na mesma maquina | Primeiro passo. Simples, sem mudanca de codigo |
| **Horizontal (Scale Out)** | Mais maquinas rodando a mesma aplicacao | Limite do vertical atingido ou alta disponibilidade necessaria |

### Arvore de Decisao

```
Precisa de alta disponibilidade (99.9%+)?
  SIM → Horizontal (minimo 2 nos em AZs diferentes)
  NAO → Servidor atual com CPU > 70% sustentado?
    NAO → Ficar no vertical. Otimizar codigo e queries primeiro
    SIM → Resolver com maquina maior (custo aceitavel)?
      SIM → Scale up. Mais simples
      NAO → Scale out. Preparar stateless + load balancer
```

> **Detalhes completos:** `references/scalability.md` — arquitetura stateless, load balancer L4/L7, algoritmos de balanceamento, auto-scaling, CDN, arquitetura em tres camadas.

---

## 3. Estrategias de Cache

**REGRA:** Comecar com Cache-Aside. So mudar se houver problema comprovado com essa estrategia.

| Estrategia | Quando Usar |
|------------|-------------|
| **Cache-Aside** | **PADRAO.** App verifica cache → miss → busca banco → grava cache |
| **Write-Through** | Dados SEMPRE lidos logo apos escrita |
| **Write-Behind** | Write-heavy com tolerancia a perda (analytics, logs) |
| **Read-Through** | Quando cache provider suporta auto-fetch |

### Arvore de Decisao

```
O dado muda frequentemente (< 1 min)?
  SIM → Cache pode nao valer. Avaliar se a query e realmente cara
    Query > 100ms? → Cache com TTL curto (10-30s) + invalidacao
    Query < 100ms? → Nao usar cache. Complexidade nao justifica
  NAO → O dado e critico (financeiro, estoque)?
    SIM → TTL muito curto (< 10s) + invalidacao explicita. Ou sem cache
    NAO → Cache-Aside + TTL (5-60min) + invalidacao no write
```

> **Detalhes completos:** `references/cache-strategies.md` — invalidacao (TTL/explicita), eviction (LRU/LFU), cache stampede, cold start, local vs distribuido, Redis vs Memcached, metricas de hit rate.

---

## 4. Selecao de Banco de Dados

**REGRA FUNDAMENTAL:** Comecar relacional (PostgreSQL). So adicionar NoSQL quando houver um PROBLEMA COMPROVADO que relacional nao resolve.

### Arvore de Decisao

```
Tem um problema COMPROVADO com banco relacional?
  NAO → Usar PostgreSQL. Parar aqui
  SIM → Qual e o problema?
    Performance de escrita (>100k writes/s) → Cassandra / DynamoDB
    Schema muda constantemente → MongoDB (considerar JSONB no PostgreSQL antes)
    Busca full-text complexa → Elasticsearch (complemento, nao substituto)
    Relacionamentos profundos (6+ niveis) → Neo4j (complemento)
    Cache de alta velocidade → Redis
    Nenhum dos acima → Provavelmente resolver com PostgreSQL otimizado
```

> **Detalhes completos:** `references/database-selection.md` — SQL vs NoSQL (documento, chave-valor, colunar, grafo), ACID vs BASE, polyglot persistence, PostgreSQL JSONB, quando usar cada tipo.

---

## 5. Replicacao e Sharding

**REGRA:** Cada etapa resolve 10x mais carga que a anterior. Nunca pular etapas.

```
Progressao correta:
1. Otimizar queries e indices ← COMECAR AQUI
2. Adicionar cache (Redis)
3. Replicacao de leitura
4. Sharding ← ULTIMO RECURSO
```

### Arvore de Decisao

```
Banco esta lento?
  SIM → Queries e indices otimizados?
    NAO → Otimizar primeiro (EXPLAIN ANALYZE). Parar aqui
    SIM → Cache implementado?
      NAO → Implementar cache (Redis). Parar aqui
      SIM → Gargalo e LEITURA ou ESCRITA?
        LEITURA → Replicacao (adicionar replicas)
        ESCRITA → Volume > 100k writes/s ou dados > 10TB?
          NAO → Otimizar mais. Batch writes, compressao, particionamento
          SIM → Sharding (ultimo recurso)
  NAO → NAO MUDAR NADA. Over-engineering e desperdicio
```

> **Detalhes completos:** `references/replication-sharding.md` — replicacao sincrona/assincrona/semi, replication lag, read-your-own-writes, estrategias de sharding (hash/range/directory), selecao de shard key, servicos gerenciados, caminho progressivo de escalabilidade.

---

## 6. Load Balancer Decision Guide

> Referencia completa: `references/load-balancing.md`

### Progressive Scaling

```
Single Server → Separar Web + DB → DNS Round Robin → Load Balancer → Health Checks → SPOF Mitigation
```

**NUNCA pular etapas.** Cada passo so quando o anterior nao basta.

### 7 Algoritmos — Decision Tree

```
Servidores com capacidade diferente?
├─ SIM → Weighted Round Robin / Weighted Least Connections
├─ NAO
│   ├─ Requests com duracao variavel? → Least Connections
│   ├─ Latencia critica? → Least Response Time
│   ├─ Session affinity? → IP Hash ou Consistent Hashing
│   ├─ Usuarios em multiplas regioes? → Geographical
│   ├─ Caso simples? → Round Robin ✓ (padrao)
```

### L4 vs L7

- **L4 (Transport):** TCP/UDP. Mais rapido, menos inteligente. HAProxy modo TCP
- **L7 (Application):** HTTP. Content-based routing, SSL termination. Nginx, ALB

### Health Checks e SPOF

- LB DEVE fazer health checks continuos (`GET /health`)
- Servidor doente → remover do pool → re-adicionar quando recuperar (self-healing)
- LB e NOVO SPOF → redundancia: Active-Passive ou Active-Active

---

## 7. CDN Architecture

> Referencia completa: `references/cdn-mechanics.md`

### Quando usar CDN

```
Conteudo estatico (HTML, CSS, JS, imagens)? → CDN ✓
Usuarios em multiplas regioes? → CDN ESSENCIAL
Conteudo dinamico personalizavel? → NAO cachear (ou cache por segmento)
```

### Componentes

- **Origin Server:** Servidor com arquivos originais
- **Edge Server:** Cache proximo ao usuario (POP)
- **POP (Point of Presence):** Data center regional com edge servers
- **Anycast:** Um IP → varios servidores. DNS roteia para o mais proximo

### Cache Hit vs Miss

| Cenario | Latencia | Acao |
|---------|----------|------|
| Cache HIT | ~10-50ms | Edge serve diretamente |
| Cache MISS | ~200-500ms | Edge busca no origin, cacheia, responde |

### TTL Strategy

| Tipo | TTL |
|------|-----|
| Assets imutaveis (hashed) | 1 ano |
| CSS/JS com versioning | 1 semana - 1 mes |
| HTML pages | 1 hora - 1 dia |
| API responses | Segundos - minutos |

**Cache busting:** Versioned filenames (`app.abc123.js`) — deploy novo = filename novo = cache automaticamente invalidado.

---

## 8. Serverless vs Serverfull

> Referencia completa: `references/serverless-vs-serverfull.md`

### Decision Tree

```
Latencia consistente necessaria? → Serverfull
Carga variavel/esporadica? → Serverless ✓
Execucao longa (>15min)? → Serverfull
Event-driven (webhook, S3, cron)? → Serverless ✓
Carga constante alta? → Serverfull (mais economico)
WebSockets / conexoes persistentes? → Serverfull
Prototipo / MVP? → Serverless ✓ (custo zero quando nao usa)
```

### Comparativo Rapido

| Aspecto | Serverfull | Serverless |
|---------|-----------|------------|
| Disponibilidade | 24/7 | Sob demanda |
| Cold start | Zero | Sim (~100ms-5s) |
| Connection pool | Persistente | Problematico |
| Cobranca | Por uptime | Por invocacao |
| Escala | Manual | Automatica |

### Cold Start — Mitigacao

- **Provisioned Concurrency:** Manter instancias quentes (custo fixo)
- **Runtime leve:** Node.js/Python > Java
- **Minimizar dependencias:** Menos codigo = start mais rapido
- **Connection pooler externo:** RDS Proxy, PgBouncer (evitar 1000 conexoes ao DB)

### Casos de Uso Ideais

- **Serverless:** Webhooks, processamento de eventos, cron jobs leves, APIs esporadicas
- **Serverfull:** APIs de alta carga, WebSockets, processamento longo, state em memoria

---

## 9. Filas e Mensageria

**REGRA:** Projetar para **at-least-once + consumidor idempotente**. "Exactly-once delivery" nativo prometido por um broker e red flag — desconfiar. A fila desacopla producao de consumo; nao e garantia de entrega magica.

### Quando Usar Fila

```
O trabalho pode ser assincrono (usuario nao precisa do resultado na request)?
  NAO → sincrono. Fila so adiciona latencia e complexidade
  SIM → precisa de fan-out (N consumidores recebem o mesmo fato)?
    SIM → Pub/Sub (broadcast de eventos)
    NAO → trabalho processado por UM worker → Message Queue / Background Job (Bull, SQS, RabbitMQ)
```

### Garantias de Entrega — a Regra que Nao Muda

- **at-most-once** e **at-least-once** sao as unicas semanticas factiveis. **exactly-once delivery e impossivel** em sistema distribuido (Two Generals + FLP)
- O que E alcancavel e exactly-once *processing*: at-least-once + dedup/idempotencia no consumidor
- Duplicatas sao esperadas (retry do publisher, ack falho do consumidor). Tratar como dadas

### Arvore de Decisao — Correcao sob Duplicata

```
Reprocessar a mensagem tem efeito colateral observavel?
  NAO (logica naturalmente idempotente) → consumir a vontade. Sem dedup
  SIM → o efeito todo cabe numa transacao de banco?
    SIM → idempotent consumer: logica + marcador de dedup no MESMO commit
    NAO (efeito cross-system) → API externa suporta idempotency key?
      SIM → passar o message ID como key; a API deduplica
      NAO → outbox: gravar a intencao na transacao; processador publica depois
```

### Arvore de Decisao — DB-backed vs Broker Dedicado

```
Volume baixo/medio E atomicidade fila-estado importa?
  SIM → fila no banco (Solid Queue, Postgres) — menos moving parts, durabilidade ACID herdada
  NAO → throughput/SLA e o gargalo ou precisa fan-out real?
    SIM → broker dedicado (RabbitMQ Quorum, Kafka, SQS)
```

### Sempre

- **DLQ obrigatoria** — mensagem que falha repetidamente (poison message) vai para dead-letter queue, nao trava a fila
- **Backpressure / load leveling** — a fila absorve picos; o consumidor processa no seu ritmo. Nao confundir com load shedding (descarte)
- **Retry com backoff + jitter**, em UMA camada so, e so para erros transitorios (4xx nao-retry)

> **Detalhes completos:**
> - `references/messaging-models.md` — pub/sub vs fila, semantica de entrega, exactly-once delivery vs processing (Treat-Kreps), ordenacao, processamento assincrono de arquivos
> - `references/messaging-reliability.md` — consumidor idempotente, chaves de idempotencia, outbox, retry/backoff/jitter, DLQ/poison
> - `references/messaging-operations.md` — landscape de brokers, tipos de fila RabbitMQ, background jobs (Bull), durabilidade (fsync/WAL), backlog, backpressure

---

## 10. SQL Internals

**REGRA:** Antes de otimizar, **leia o plano (EXPLAIN)** — nao adivinhe. B+tree e o default de indice (range scans); **cada indice e custo de escrita** (write amplification). Para dinheiro, **transacao ACID**, salvo escala extrema com mecanismo de compensacao. Particione so quando a tabela e grande o bastante.

### Arvore de Decisao — Query Lenta

```
A query esta lenta?
  → rode EXPLAIN / EXPLAIN ANALYZE primeiro — leia o plano antes de mexer
    Seq Scan onde devia haver index? → falta indice (ou o filtro nao e SARGable)
    Index existe mas nao e usado?    → estatisticas velhas (rode ANALYZE) ou seletividade baixa
    Tabela grande demais p/ varrer?  → particionamento (range/list/hash) + partition pruning
    Custo concentrado num JOIN/SORT? → indice composto cobrindo filtro + ordenacao
```

### Indices — a Regra que Nao Muda

- **B+tree e o default** em RDBMS: nos internos so-chave (mais fanout, arvore rasa, fit em RAM) + folhas ligadas (range scans / ORDER BY eficientes)
- **Cada indice e write amplification** — toda escrita atualiza a tabela E todos os indices afetados. Indice nao usado e custo puro
- **Caveat (C9):** "B+tree e sempre melhor" e absolutismo — MongoDB usa B-tree; o recorte muda com RAM-fit. Detalhe em `sql-indexing-and-storage.md`

### Arvore de Decisao — ACID para Dinheiro (C7)

```
O dado e dinheiro / saldo / estoque (perda = prejuizo direto)?
  SIM → transacao ACID (SQL relacional). Atomicidade + isolamento nao sao opcionais
        ... salvo escala extrema (volume que o relacional nao aguenta) E voce tem
            mecanismo de compensacao (reconciliacao, saga) → NoSQL pragmatico e defensavel
  NAO → BASE / eventual consistency pode bastar (ver CAP em `cap-theorem.md`)
```
> C-de-ACID (consistencia transacional) != C-de-CAP (consistencia distribuida). Nao confundir.

### Sempre

- **Particione so quando a tabela e grande o bastante** — particoes demais = overhead de planning. Particionar cedo numa tabela pequena e custo sem ganho
- **Working set deve caber em RAM** — quando nao cabe, IOPS de disco (random IO) vira o gargalo. NVMe local x storage de rede (EBS) e trade-off latencia x elasticidade
- **WAL da durabilidade + recuperacao** — mas durabilidade local (fsync) != replicacao (sobreviver a perda do no)

> **Detalhes completos:**
> - `references/sql-indexing-and-storage.md` — por que indexar, B-tree vs B+tree (C9), tipos e custo de indice, storage/IOPS, storage desagregado (C6)
> - `references/sql-acid-and-durability.md` — ACID e BASE (C7), WAL/journal modes, SQLite em producao, nugget Pixeltable
> - `references/sql-query-planning.md` — ler EXPLAIN e particionamento (⚠️ doc oficial PostgreSQL, pendente de revisao), deteccao de gap via recursive CTE

---

## 11. Resiliência Distribuída

**REGRA:** Toda chamada que cruza uma fronteira de rede pode produzir **5 resultados**, não 2 — e o pior deles é **UNKNOWN** (timeout): não assuma sucesso nem falha. Sob sobrecarga, **descarte cedo e barato** para preservar goodput, propague o **deadline** por hop em vez de timeout fixo, e isole o blast radius com **shuffle sharding**. Distribuir custa caro (uma expressão local vira ~15 etapas) — antes de tratar os 5 resultados, pergunte se precisa mesmo distribuir.

### Os 5 resultados de toda chamada remota (framing)

Onde o código local tem 2 resultados (sucesso/exceção), toda operação de rede tem **cinco**: **POST_FAILED** (servidor não recebeu → retry seguro), **RETRYABLE** (falha transitória → backoff+jitter), **FATAL** (rejeição definitiva → não retry), **SUCCESS**, e **UNKNOWN** (timeout: pode ter executado ou não). Para UNKNOWN com efeito colateral (cobrança, saque), retry às cegas **duplica** e desistir às cegas **perde** — exija idempotência antes de retentar. Projete para os **8 modos de falha** (cada uma das 8 etapas request/response falha independentemente).
> fonte: Jacob Gabrielson | Challenges with distributed systems | seção: Tratamento da falha

### Regra de overload — descarte para preservar goodput (load shedding)

Sob sobrecarga, aceitar tudo leva a disponibilidade zero para todos: a latência explode, os clientes batem timeout, nada vira resposta útil. A métrica que importa é **goodput** (respostas dentro do prazo), não throughput. Load shedding **rejeita proativamente o excesso** (fast-reject barato) para manter latência baixa no tráfego aceito. Distinga: **shedding DESCARTA** × **backpressure DESACELERA o produtor** (ver `messaging-operations.md`, Onda 1) × **throttling LIMITA por quota**. A requisição mais crítica sob carga é o **health check do LB** — nunca descartar (senão o LB encolhe a frota num death spiral).
> fonte: David Yanacek | Using load shedding to avoid overload | seção: Impedindo que o trabalho seja desperdiçado

### Regra de cadeia — propague o deadline (deadline propagation)

Em chamadas encadeadas (cliente → A → B → C), o recurso escasso não é "quantos segundos cada serviço pode levar" — é **quanto tempo o cliente original ainda espera**. Propague o **tempo restante (deadline)** por hop, não um timeout fixo por serviço, para que serviços fundo na cadeia descartem trabalho já condenado antes de executá-lo. Meça duração com **clock monotônico** (`CLOCK_MONOTONIC` / `nanoTime` / `hrtime`) — nunca wall-clock, que salta no NTP. Não comece trabalho fadado a estourar o deadline.
> fonte: David Yanacek | Using load shedding to avoid overload | seção: Como ficar de olho no relógio

### Regra de isolamento — contenha o blast radius (shuffle sharding)

Num modelo fan-out-para-todos, um **poison request** (que derruba qualquer instância) cascateia até derrubar tudo. Sharding regular reduz o impacto **linearmente** (1/N); **shuffle sharding** reduz **exponencialmente** (1/C(n,k)) sem adicionar hardware — cada cliente recebe uma **combinação** única de operadores, de modo que dois clientes raramente compartilham o conjunto inteiro. Detalhe em `references/replication-sharding.md`.
> fonte: Colm MacCárthaigh | Workload isolation using shuffle sharding | seção: O que é fragmentação aleatória?

### Arvore de Decisão — Sobrecarga / Falha Distribuída

```
A operação cruza uma fronteira de rede (domínio de falha distinto)?
  NÃO (in-process) → trate como chamada local. NÃO aplique a maquinaria distribuída
  SIM → preciso mesmo distribuir? (distribuir = ~15 etapas + matriz de teste ×~20)
    Simplicidade local resolve → não distribua
    Necessário → para CADA chamada, trate os 5 resultados (UNKNOWN+efeito → idempotência antes do retry)

O serviço pode receber mais carga do que processa dentro do SLO de latência?
  NÃO → não precisa de shedding ativo
  SIM → o excedente pode ser DESCARTADO?
    NÃO (toda requisição crítica) → backpressure (desacelera produtor) ou fila durável
    SIM → LOAD SHEDDING (fast-reject barato; priorize health check do LB; descarte por idade)

A requisição atravessa múltiplos serviços e o cliente tem timeout?
  NÃO (salto único) → timeout local por chamada basta
  SIM → propague o DEADLINE (tempo restante) por hop; clock monotônico; aborte trabalho órfão

Falha induzida por carga (cliente abusivo / poison request) pode propagar?
  NÃO → capacidade bruta resolve falha orgânica
  SIM → clientes servíveis por QUALQUER operador do subconjunto + toleram retry?
    NÃO → SHARDING REGULAR (bulkhead disjunto, impacto 1/N)
    SIM → SHUFFLE SHARDING (impacto ~1/C(n,k); retry sequencial no cliente EM ORDEM)
```

> **Padrões no nível do serviço** (timeout, retry, circuit breaker, fallback, health check, bulkhead): ver `/anti-vibe-coding:defensive-patterns`.
> **Backpressure / load leveling** (o produtor desacelera em vez de descartar): ver `references/messaging-operations.md` (Onda 1).
> **Shuffle sharding** (isolamento combinatório de blast radius): ver subseção em `references/replication-sharding.md`.

---

## Cheat Sheet — Referencia Rapida

| Decisao | Padrao Seguro | Mude Quando |
|---------|---------------|-------------|
| CAP | CP para financeiro, AP para social | Analisar PACELC para o caso especifico |
| Escala | Vertical primeiro | CPU > 70% sustentado ou precisa de HA |
| Cache | Cache-aside + TTL + invalidacao | Write-through se leitura imediata pos-escrita |
| Banco | PostgreSQL | Problema COMPROVADO que SQL nao resolve |
| Dados | Otimize → Cache → Replicacao → Sharding | Cada passo so se o anterior nao basta |
| Filas | at-least-once + consumidor idempotente | exactly-once nativo prometido = desconfie |
| Indice SQL | B+tree; composto p/ filtrar + ordenar | cada indice e custo de escrita (write amplification) |
| ACID p/ dinheiro | transacao ACID / SQL relacional | escala extrema + compensacao → NoSQL pragmatico |
| Particionar | so quando a tabela e grande o bastante | particoes demais = overhead de planning |
| Sobrecarga | load shedding (fast-reject) p/ preservar goodput | shedding caro/sem instrumentação = pior |
| Cadeia de chamadas | propague deadline (tempo restante) | timeout fixo por hop; clock wall em vez de monotônico |
| Isolar tenant/falha | shuffle sharding (blast radius exponencialmente menor) | poison-request que derruba qualquer worker |

---

## Anti-Patterns Universais

- **Otimizar prematuramente** — adicionar complexidade (cache, replicas, sharding) sem problema comprovado
- **Escolher tecnologia por hype** — "MongoDB porque e moderno" sem necessidade real
- **Pular etapas na progressao de escala** — sharding antes de otimizar queries e jogar dinheiro fora
- **Ignorar metricas** — tomar decisoes de arquitetura sem dados (latencia, hit rate, replication lag)
- **Over-engineering desde o dia 1** — polyglot persistence, microservicos e sharding para um MVP

---

## Contexto da consulta

$ARGUMENTS
