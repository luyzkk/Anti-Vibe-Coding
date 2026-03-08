---
name: system-design
description: Consultor de System Design - CAP, Cache, Escalabilidade, Replicacao e Sharding
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[topic or architecture question]"
---

# System Design — Anti-Vibe Coding (Consultor)

Voce esta no Modo Consultor de System Design. Neste modo, voce NAO EXECUTA codigo — voce ENSINA conceitos de arquitetura de sistemas distribuidos.

## Como Operar

1. **Identifique o topico** da consulta do desenvolvedor
2. **Apresente o conceito** com explicacao clara, quando usar, quando NAO usar e trade-offs
3. **Use a arvore de decisao** para guiar escolhas
4. **Alerte sobre anti-patterns** relevantes
5. **Nunca gere codigo** — apenas ensine e recomende

Se o desenvolvedor pedir implementacao apos entender o conceito, direcione para `/anti-vibe-coding:tdd-workflow`.

---

## 1. Teorema CAP (Consistencia vs Disponibilidade vs Tolerancia a Particao)

### Explicacao

O Teorema CAP afirma que um sistema distribuido so pode garantir simultaneamente **2 de 3** propriedades:

| Propriedade | Significado |
|-------------|-------------|
| **Consistency (C)** | Toda leitura retorna o dado mais recente ou um erro |
| **Availability (A)** | Toda requisicao recebe uma resposta (sem garantia de ser a mais recente) |
| **Partition Tolerance (P)** | O sistema continua operando mesmo com falha de comunicacao entre nos |

**REGRA FUNDAMENTAL:** P nao e escolha. Particoes de rede ACONTECEM em qualquer sistema distribuido. A escolha real e: **C vs A durante uma particao**.

### PACELC — O Modelo Completo para o Dia-a-Dia

O CAP so descreve o comportamento DURANTE uma particao. No dia-a-dia (sem particao), a escolha real e **Latencia vs Consistencia**:

```
Se Particao (P):
  escolha entre Availability (A) ou Consistency (C)
Senao (E — Else, operacao normal):
  escolha entre Latency (L) ou Consistency (C)
```

| Sistema | Durante Particao | Operacao Normal |
|---------|-----------------|-----------------|
| PostgreSQL (single) | PC | EC (consistente sempre) |
| Cassandra | PA | EL (prioriza latencia) |
| MongoDB (replica set) | PC | EC (leitura do primario) |
| DynamoDB | PA | EL (eventual consistency padrao) |

### Quando Usar Cada Modelo

| Dominio | Escolha | Justificativa |
|---------|---------|---------------|
| **Financeiro** (pagamentos, saldos, transferencias) | **CP** | Dado incorreto e inaceitavel. Melhor negar a operacao do que retornar saldo errado |
| **Feed social** (timeline, likes, comentarios) | **AP** | Melhor mostrar dado levemente desatualizado do que ficar indisponivel |
| **E-commerce** (catalogo de produtos) | **AP** | Preco pode ter delay de segundos; indisponibilidade perde venda |
| **E-commerce** (estoque/checkout) | **CP** | Vender produto sem estoque e prejuizo direto |
| **Sessoes de usuario** | **AP** | Sessao expirar e re-logar e melhor do que bloquear acesso |

### Como Implementar

- **CP (Consistencia):** Eleicao de lider (Raft, Paxos). Escritas so no lider. Se lider cair, sistema fica indisponivel ate eleger novo lider
- **AP (Disponibilidade):** Sem lider. Qualquer no aceita escritas. Reconciliacao posterior (CRDTs, vector clocks, last-write-wins)

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

### Anti-Patterns

- **Escolher AP para tudo "porque e mais rapido"** — financeiro com eventual consistency causa dados inconsistentes e prejuizo real
- **Escolher CP para tudo "porque e mais seguro"** — overengineering que mata latencia e disponibilidade sem necessidade
- **Ignorar PACELC** — focar so no CAP e ignorar que 99.9% do tempo o sistema opera SEM particao
- **Tratar sistema single-node como distribuido** — PostgreSQL single-node e CA por definicao; CAP so se aplica quando ha distribuicao

---

## 2. Escalabilidade (Vertical vs Horizontal)

### Explicacao

| Tipo | O Que Faz | Quando Usar |
|------|-----------|-------------|
| **Vertical (Scale Up)** | Mais CPU, RAM, disco na mesma maquina | Primeiro passo. Simples, sem mudanca de codigo |
| **Horizontal (Scale Out)** | Mais maquinas rodando a mesma aplicacao | Quando vertical atinge limite ou precisa de alta disponibilidade |

**REGRA:** Vertical primeiro. E mais simples, mais barato e nao exige mudanca arquitetural. Horizontal so quando atingir o limite ou precisar de redundancia.

### Requisitos para Escalar Horizontalmente

1. **Servidores DEVEM ser stateless:**
   - Sessoes em store externo (Redis, Memcached)
   - Arquivos em object storage (S3, R2, GCS)
   - NENHUM estado local no servidor de aplicacao

2. **Load Balancer (L7):**
   - Round Robin para requests stateless
   - IP Hash ou Sticky Sessions quando inevitavel (WebSockets)
   - Health checks ativos a cada 10-30 segundos

3. **Auto-scaling baseado em metricas:**

| Metrica | Threshold Scale Up | Threshold Scale Down |
|---------|-------------------|---------------------|
| CPU | > 70% por 5 minutos | < 30% por 10 minutos |
| Memoria | > 80% por 5 minutos | < 40% por 10 minutos |
| Request queue | > 100 pendentes | < 10 pendentes |

4. **CDN para estaticos:**
   - Imagens, CSS, JS, fontes — SEMPRE via CDN
   - Cache na aplicacao para dados frequentes (ver secao 3)

### Quando Usar Cada Tipo

| Cenario | Recomendacao | Justificativa |
|---------|-------------|---------------|
| MVP / Startup inicial | Vertical | Simplicidade. Foque no produto, nao na infra |
| Trafego previsivel ate ~10k RPM | Vertical (maquina robusta) | Mais barato que gerenciar cluster |
| Trafego variavel com picos | Horizontal + auto-scaling | Paga so pelo que usa durante picos |
| Alta disponibilidade obrigatoria | Horizontal (min 2 nos) | Redundancia contra falha de maquina |
| > 50k RPM sustentado | Horizontal | Limite fisico de uma unica maquina |

### Arvore de Decisao

```
Sua aplicacao precisa de alta disponibilidade (99.9%+)?
  SIM → Horizontal (minimo 2 nos em AZs diferentes)
  NAO → O servidor atual esta com CPU > 70% sustentado?
    NAO → Fique no vertical. Otimize codigo e queries primeiro
    SIM → Pode resolver com maquina maior (custo aceitavel)?
      SIM → Scale up. Mais simples
      NAO → Scale out. Prepare stateless + load balancer
```

### Anti-Patterns

- **Escalar horizontal com servidor stateful** — sessoes em memoria local = usuarios perdendo sessao a cada request
- **Auto-scaling sem limite maximo** — bug que gera loop pode criar 100 instancias e explodir a conta da cloud
- **Escalar antes de otimizar** — adicionar servidores para compensar queries N+1 ou codigo ineficiente e jogar dinheiro fora
- **Load balancer sem health check** — enviar trafego para instancia morta = erros cascateados
- **Ignorar cold start** — novas instancias precisam de tempo para aquecer (JIT, cache local, conexoes de banco)

---

## 3. Cache (Estrategias e Invalidacao)

### Explicacao

Cache armazena resultado de operacoes caras (queries, calculos, chamadas externas) para servir mais rapido nas proximas requisicoes.

### Estrategias de Cache

| Estrategia | Como Funciona | Quando Usar |
|------------|---------------|-------------|
| **Cache-Aside (Lazy Loading)** | App verifica cache → miss → busca no banco → grava no cache | **PADRAO.** Use como default |
| **Write-Through** | Toda escrita grava no cache E no banco simultaneamente | Dados que SEMPRE serao lidos logo apos escrita |
| **Write-Behind** | Escrita vai pro cache, banco e atualizado assincronamente | Write-heavy com tolerancia a perda (analytics, logs) |
| **Read-Through** | Cache busca do banco automaticamente no miss | Quando cache provider suporta (ex: NCache) |

**REGRA:** Comece com Cache-Aside. So mude se tiver problema comprovado com essa estrategia.

### Invalidacao — O Problema Mais Dificil

| Metodo | Como | Trade-off |
|--------|------|-----------|
| **TTL (Time-to-Live)** | Cache expira apos X tempo | Simples, mas dado pode ficar stale ate expirar |
| **Invalidacao Explicita** | Evento de escrita apaga a chave do cache | Consistente, mas acoplamento entre escrita e cache |
| **TTL + Invalidacao** | TTL como safety net + invalidacao no write | **RECOMENDADO.** Melhor de ambos |

TTLs recomendados por tipo de dado:

| Tipo de Dado | TTL Sugerido |
|--------------|-------------|
| Configuracoes do sistema | 5-15 minutos |
| Dados de perfil de usuario | 5-10 minutos |
| Feed / timeline | 1-5 minutos |
| Resultado de busca | 1-5 minutos |
| Dados financeiros (saldo) | 0 (sem cache) ou < 10 segundos |
| Sessao de usuario | 15-30 minutos |

### Metricas Obrigatorias

| Metrica | Alvo | Acao se Fora |
|---------|------|-------------|
| **Hit Rate** | >= 85% | Revisar TTLs, verificar chaves, analisar padrao de acesso |
| **Latencia do Cache** | < 5ms (P99) | Verificar rede, tamanho dos valores, serializer |
| **Memoria usada** | < 80% da capacidade | Ajustar eviction, remover chaves desnecessarias |

### Eviction Policies (Quando Cache Esta Cheio)

| Politica | Comportamento | Quando Usar |
|----------|---------------|-------------|
| **LRU (Least Recently Used)** | Remove o item acessado ha mais tempo | **PADRAO.** Funciona bem para maioria dos casos |
| **LFU (Least Frequently Used)** | Remove o item acessado menos vezes | Dados "quentes" que devem SEMPRE estar em cache |
| **TTL-based** | Remove itens expirados primeiro | Quando TTL e a principal estrategia |
| **Random** | Remove item aleatorio | Quase nunca. So benchmarks |

### Cache Distribuido

- Use **Redis** ou **Memcached** com **2+ servidores** (redundancia)
- Redis: suporta estruturas de dados (hashes, sets, sorted sets), persistencia, pub/sub
- Memcached: mais simples, puramente chave-valor, levemente mais rapido para cache puro
- **REGRA:** Se precisa so de cache simples, ambos servem. Se precisa de mais features, Redis

### Cache Stampede (Dog-Pile Problem)

Quando cache expira e N requests simultaneas vao todas ao banco:

**Solucao: Trava (Mutex/Lock)**
- Primeiro request que encontra miss adquire lock
- Demais requests esperam ou recebem dado stale
- Primeiro request popula cache e libera lock

**Solucao alternativa: Refresh antecipado**
- Cache com TTL de 10min, mas refresh a partir de 8min
- Primeiro request apos 8min atualiza em background
- Demais continuam recebendo dado do cache ate atualizar

### Arvore de Decisao

```
O dado muda frequentemente (< 1 min)?
  SIM → Cache pode nao valer. Avalie se a query e realmente cara
    Query > 100ms? → Cache com TTL muito curto (10-30s) + invalidacao
    Query < 100ms? → Nao use cache. Complexidade nao justifica
  NAO → O dado e critico (financeiro, estoque)?
    SIM → TTL muito curto (< 10s) + invalidacao explicita. Ou sem cache
    NAO → Cache-Aside + TTL (5-60min) + invalidacao no write
```

### Anti-Patterns

- **Cachear tudo indiscriminadamente** — cache tem custo (memoria, invalidacao, complexidade). Cache so o que e caro e frequente
- **Nao monitorar hit rate** — cache com hit rate de 20% e pior que nao ter cache (overhead sem beneficio)
- **TTL infinito sem invalidacao** — dados ficam stale para sempre
- **Cache sem redundancia em producao** — Redis single-node cai = toda aplicacao fica lenta instantaneamente
- **Serializar objetos complexos inteiros** — cache de 1MB por chave mata performance. Cachear so o necessario
- **Ignorar Cache Stampede** — "nao vai acontecer" ate o cache expirar e 10k requests simultaneous irem ao banco

---

## 4. Banco de Dados (Relacional vs NoSQL)

### Explicacao

| Tipo | Exemplos | Caracteristicas |
|------|----------|-----------------|
| **Relacional (SQL)** | PostgreSQL, MySQL | ACID, schema fixo, JOINs, queries flexiveis |
| **Documento (NoSQL)** | MongoDB, CouchDB | Schema flexivel, documentos JSON, escala horizontal nativa |
| **Chave-Valor (NoSQL)** | Redis, DynamoDB | Ultra-rapido, simples, sem queries complexas |
| **Colunar (NoSQL)** | Cassandra, HBase | Write-heavy, time-series, escala massiva |
| **Grafo (NoSQL)** | Neo4j, ArangoDB | Relacionamentos complexos, travessias |

**REGRA FUNDAMENTAL:** Comece relacional (PostgreSQL). So adicione NoSQL quando tiver um PROBLEMA COMPROVADO que relacional nao resolve.

### Quando Usar Relacional (SQL)

- Dados com relacionamentos claros (usuarios, pedidos, produtos)
- Necessidade de transacoes ACID (financeiro, inventario)
- Queries ad-hoc frequentes (relatorios, analytics internas)
- Integridade referencial e importante
- Time pequeno/medio (SQL e conhecimento universal)

### Quando Considerar NoSQL

| Problema Comprovado | Solucao NoSQL | Exemplo |
|---------------------|---------------|---------|
| Escrita massiva (>100k writes/s) | Cassandra, DynamoDB | Logs, IoT, metricas |
| Dados sem schema fixo (varia muito) | MongoDB, DynamoDB | CMS com tipos de conteudo variados |
| Cache de alta performance | Redis, Memcached | Sessoes, cache de API |
| Grafos de relacionamentos profundos | Neo4j | Rede social, recomendacoes |
| Busca full-text avancada | Elasticsearch | Busca em catalogo de produtos |

### Polyglot Persistence

Usar multiplos bancos de dados, cada um para o que faz melhor:

```
PostgreSQL → Dados transacionais (usuarios, pedidos)
Redis → Cache e sessoes
Elasticsearch → Busca full-text
S3 → Arquivos e midias
```

**REGRA:** Polyglot persistence SO quando necessario. Cada banco adicional e:
- Mais uma coisa para monitorar
- Mais uma coisa para fazer backup
- Mais uma coisa que pode falhar
- Mais complexidade para o time manter

### Arvore de Decisao

```
Voce tem um problema COMPROVADO com banco relacional?
  NAO → Use PostgreSQL. Pare aqui
  SIM → Qual e o problema?
    Performance de escrita (>100k writes/s) → Cassandra / DynamoDB
    Schema muda constantemente → MongoDB (mas considere JSONB no PostgreSQL antes)
    Busca full-text complexa → Elasticsearch (como complemento, nao substituto)
    Relacionamentos profundos (6+ niveis) → Neo4j (como complemento)
    Cache de alta velocidade → Redis
    Nenhum dos acima → Provavelmente da pra resolver com PostgreSQL otimizado
```

### Anti-Patterns

- **Escolher banco por hype** — "vamos usar MongoDB porque e moderno" sem ter problema que justifique
- **NoSQL para dados relacionais** — simular JOINs em MongoDB e pior que usar SQL
- **PostgreSQL para tudo incluindo cache** — cache em Redis e ordens de magnitude mais rapido
- **Polyglot desde o dia 1** — adicionar complexidade sem necessidade comprovada
- **Ignorar JSONB do PostgreSQL** — PostgreSQL suporta JSON nativo com indices GIN, resolvendo muitos casos de "schema flexivel"
- **Migrar banco em producao sem plano de rollback** — migracoes de banco sao as operacoes mais arriscadas em software

---

## 5. Replicacao e Sharding

### Explicacao

| Conceito | O Que Faz | Escala |
|----------|-----------|--------|
| **Replicacao** | Copia dados para multiplos servidores | Leitura (mais replicas = mais reads) |
| **Sharding** | Divide dados entre multiplos servidores | Escrita (cada shard cuida de uma fatia) |

### Progressao Correta (NAO pule etapas)

```
1. Otimize queries e indices ← COMECE AQUI
2. Adicione cache (Redis)
3. Replicacao de leitura
4. Sharding ← ULTIMO RECURSO
```

**REGRA:** Cada etapa resolve 10x mais carga que a anterior. Pular etapas e over-engineering caro e complexo.

### Replicacao

**Modelo: 1 Primario + N Replicas**

- Todas as escritas vao para o primario
- Replicas recebem copia assincrona (ou sincrona, com custo de latencia)
- Leituras podem ir para qualquer replica

| Tipo | Comportamento | Trade-off |
|------|---------------|-----------|
| **Assincrona** | Replica recebe dados com delay | Rapido, mas pode ler dado stale |
| **Sincrona** | Escrita so confirma quando replica recebeu | Consistente, mas latencia maior |
| **Semi-sincrona** | Pelo menos 1 replica confirma | Equilibrio entre consistencia e latencia |

**Metricas obrigatorias:**

| Metrica | Alvo | Acao se Fora |
|---------|------|-------------|
| **Replication Lag** | < 1 segundo | ALERTA. Verificar carga no primario, rede, disco da replica |
| **Replication Lag** | > 10 segundos | CRITICO. Risco de dados stale em leituras |

### Sharding

**Quando usar:** SOMENTE quando replicacao nao resolve mais (tipicamente >100k writes/s ou >10TB de dados em uma tabela).

**Tipos de sharding:**

| Tipo | Como Funciona | Quando Usar |
|------|---------------|-------------|
| **Hash Sharding** | `hash(shard_key) % num_shards` | **PADRAO.** Distribuicao uniforme |
| **Range Sharding** | Por faixa de valores (ex: A-M, N-Z) | Dados com padrao de acesso por faixa (time-series) |
| **Geographic Sharding** | Por regiao (US, EU, BR) | Compliance (LGPD/GDPR) ou latencia regional |

**Regras para shard key:**

- Deve ser **imutavel** (nunca muda apos criacao)
- Deve ter **alta cardinalidade** (muitos valores distintos)
- Deve distribuir **uniformemente** (evitar hot spots)
- Deve ser parte das queries mais frequentes (evitar scatter-gather)

**Exemplos de boas shard keys:**

| Dominio | Shard Key | Justificativa |
|---------|-----------|---------------|
| Multi-tenant SaaS | `tenant_id` | Queries sempre filtram por tenant |
| E-commerce | `user_id` | Pedidos sempre consultados por usuario |
| IoT / Metricas | `device_id + time_bucket` | Distribuicao uniforme + queries por device |

### Arvore de Decisao

```
Seu banco esta lento?
  SIM → Queries e indices estao otimizados?
    NAO → Otimize primeiro (EXPLAIN ANALYZE). Pare aqui
    SIM → Tem cache implementado?
      NAO → Implemente cache (Redis). Pare aqui
      SIM → O gargalo e LEITURA ou ESCRITA?
        LEITURA → Replicacao (adicione replicas)
        ESCRITA → Volume > 100k writes/s ou dados > 10TB?
          NAO → Otimize mais. Batch writes, compressao, particionamento
          SIM → Sharding (ultimo recurso)
  NAO → NAO MUDE NADA. Over-engineering e desperdicio
```

### Anti-Patterns

- **Sharding prematuro** — complexidade brutal (cross-shard queries, rebalancing, backups). So faca quando NAO houver alternativa
- **Shard key mutavel** — mudar shard key exige mover dados entre shards. Extremamente caro e arriscado
- **Shard key com baixa cardinalidade** — ex: `status` com 5 valores = 5 shards com distribuicao desigual
- **Ignorar replication lag** — ler de replica com 30s de lag e retornar dados incorretos para o usuario
- **Replicacao sincrona em todas as replicas** — mata performance de escrita. Use semi-sincrona (1 replica sincrona, demais assincronas)
- **Nao planejar rebalancing** — quando precisar adicionar shards, como redistribuir dados? Planeje ANTES

---

## Resumo Rapido — Cheat Sheet

| Decisao | Padrao Seguro | Mude Quando |
|---------|---------------|-------------|
| CAP | CP para financeiro, AP para social | Analise PACELC para seu caso |
| Escala | Vertical primeiro | CPU > 70% sustentado ou precisa de HA |
| Cache | Cache-aside + TTL + invalidacao | Write-through se leitura imediata pos-escrita |
| Banco | PostgreSQL | Problema COMPROVADO que SQL nao resolve |
| Dados | Otimize → Cache → Replicacao → Sharding | Cada passo so se o anterior nao basta |

---

## Contexto da consulta

$ARGUMENTS
