# Database Patterns — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos relacionados a banco de dados, queries e ORMs.

## Problema N+1 (Critico)

- DETECTAR: query dentro de loop = N+1
- NUNCA confiar em lazy loading em loops
- Usar eager loading explicito:
  - Django: `prefetch_related()`, `select_related()`
  - Drizzle/Prisma: `include`, `with` clause
  - SQL: JOINs ou subqueries
- Profiler de queries obrigatorio em endpoints criticos
- Teste: contar queries executadas (devem ser constantes, nao proporcionais a N)

## Indices

- Toda query critica DEVE ter indice correspondente
- Queries sem indice em tabelas grandes → full table scan
- Indices compostos: ordem dos campos importa (mais seletivo primeiro)
- EXPLAIN ANALYZE para validar uso de indices
- Nao criar indices desnecessarios (custo de escrita)

## Cache

- Estrategia padrao: cache-aside (lazy loading)
- TTL obrigatorio em toda entrada de cache (5-60 min tipico)
- Hit rate >= 85% (alertar se cair)
- Cache distribuido (Redis/Memcached) quando 2+ servidores
- NUNCA cache local em ambiente escalado horizontalmente
- Implementar trava para Cache Stampede (evitar dog-pile)
- NUNCA cachear dados que exigem consistencia imediata (saldo bancario)
- Eviction: LRU (padrao) ou LFU (dados quentes)

## Escolha de Banco de Dados

- REGRA: Comece relacional (PostgreSQL/MySQL)
- SQL: ACID, JOINs, queries flexiveis, integridade referencial
- NoSQL SÓ quando problema comprovado:
  - KV (Redis): cache, sessoes, performance extrema
  - Document (MongoDB): flexibilidade de schema, busca por ID
  - Graph (Neo4j): relacoes complexas muitos-para-muitos
  - Columnar (Cassandra): analise em massa, time-series
- Polyglot persistence: SÓ quando caso especifico justifica

## Escalabilidade de BD

- Progressao: otimize queries → indices → cache → replicacao → sharding
- Replicacao: 1 primario + N replicas (escala leitura)
- Read Your Own Writes: apos escrita, ler do primario
- Monitorar replication lag (alertar > 1s)
- Sharding: ÚLTIMO recurso (escala escrita)
  - Hash sharding (distribuicao uniforme)
  - Shard key imutavel e deterministica
  - NUNCA JOINs entre shards

## Transacoes e Consistencia

- ACID para operacoes financeiras (SEMPRE)
- BASE (eventual consistency) SÓ para dados nao-criticos
- Idempotency keys para operacoes financeiras
- Atomic updates quando possivel (melhor performance que locks)
- Locks distribuidos para estados compartilhados criticos

## Anti-Patterns

- Queries sem WHERE em tabelas grandes
- SELECT * em producao (selecionar campos necessarios)
- Lazy loading implicito em loops (N+1)
- Cache sem TTL (inconsistencia silenciosa)
- Sharding prematuro (complexidade desnecessaria)
- Range sharding que gera hot spots
- Logica de sharding espalhada no codigo da aplicacao
