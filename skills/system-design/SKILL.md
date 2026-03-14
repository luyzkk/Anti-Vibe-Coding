---
name: system-design
description: "This skill should be used when the user asks about 'CAP theorem', 'PACELC', 'system design', 'caching strategies', 'Redis', 'horizontal scaling', 'vertical scaling', 'load balancer', 'load balancing algorithms', 'round robin', 'least connections', 'consistent hashing', 'database replication', 'sharding', 'SQL vs NoSQL', 'eventual consistency', 'CDN', 'edge server', 'anycast', 'cache invalidation', 'serverless', 'Lambda', 'cold start', 'serverfull', 'VPS', 'EC2', 'PM2', or faces infrastructure and scaling decisions. Provides expert consultation on distributed systems architecture, CDN, serverless, and trade-offs."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[topic or architecture question]"
---

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

## Cheat Sheet — Referencia Rapida

| Decisao | Padrao Seguro | Mude Quando |
|---------|---------------|-------------|
| CAP | CP para financeiro, AP para social | Analisar PACELC para o caso especifico |
| Escala | Vertical primeiro | CPU > 70% sustentado ou precisa de HA |
| Cache | Cache-aside + TTL + invalidacao | Write-through se leitura imediata pos-escrita |
| Banco | PostgreSQL | Problema COMPROVADO que SQL nao resolve |
| Dados | Otimize → Cache → Replicacao → Sharding | Cada passo so se o anterior nao basta |

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
