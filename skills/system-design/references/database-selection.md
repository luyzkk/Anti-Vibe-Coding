# Selecao de Banco de Dados — Referencia Detalhada

## Tipos de Banco de Dados

| Tipo | Exemplos | Caracteristicas | Modelo de Dados |
|------|----------|-----------------|-----------------|
| **Relacional (SQL)** | PostgreSQL, MySQL, CockroachDB | ACID, schema fixo, JOINs, queries flexiveis | Tabelas com linhas e colunas |
| **Documento (NoSQL)** | MongoDB, CouchDB, Firestore | Schema flexivel, documentos JSON, escala horizontal | Documentos JSON/BSON aninhados |
| **Chave-Valor (NoSQL)** | Redis, DynamoDB, Memcached | Ultra-rapido, simples, sem queries complexas | Pares chave-valor |
| **Colunar (NoSQL)** | Cassandra, HBase, ScyllaDB | Write-heavy, time-series, escala massiva | Colunas agrupadas por familia |
| **Grafo (NoSQL)** | Neo4j, ArangoDB, Neptune | Relacionamentos complexos, travessias | Nos e arestas |
| **Busca (Complementar)** | Elasticsearch, Meilisearch, Typesense | Full-text search, facets, autocomplete | Documentos indexados invertidos |

**REGRA FUNDAMENTAL:** Comecar relacional (PostgreSQL). So adicionar NoSQL quando houver um PROBLEMA COMPROVADO que relacional nao resolve.

---

## ACID vs BASE

### ACID (Bancos Relacionais)

| Propriedade | Significado | Implicacao |
|-------------|-------------|------------|
| **Atomicity** | Transacao completa ou falha inteira | Sem estados intermediarios |
| **Consistency** | Banco sempre em estado valido | Constraints e foreign keys respeitadas |
| **Isolation** | Transacoes concorrentes nao interferem | Locks, MVCC, serializable |
| **Durability** | Dados confirmados sobrevivem a falhas | Write-ahead log, fsync |

### BASE (Bancos NoSQL)

| Propriedade | Significado | Implicacao |
|-------------|-------------|------------|
| **Basically Available** | Sistema responde sempre | Pode retornar dado desatualizado |
| **Soft state** | Estado pode mudar sem input | Propagacao assincrona entre nos |
| **Eventually consistent** | Dados convergem eventualmente | Janela de inconsistencia aceitavel |

### Quando Escolher ACID vs BASE

| Necessidade | Escolha | Justificativa |
|-------------|---------|---------------|
| Transacoes financeiras | ACID | Dado incorreto e inaceitavel |
| Inventario com reserva | ACID | Overselling causa prejuizo |
| Feed social | BASE | Delay de segundos e imperceptivel |
| Contadores de analytics | BASE | Exatidao pode ter delay |
| Registro de audit/compliance | ACID | Integridade legal obrigatoria |

---

## Quando Usar Relacional (SQL)

Cenarios onde SQL e a escolha correta (maioria dos casos):

- Dados com relacionamentos claros (usuarios, pedidos, produtos)
- Necessidade de transacoes ACID (financeiro, inventario)
- Queries ad-hoc frequentes (relatorios, analytics internas)
- Integridade referencial e importante (foreign keys, constraints)
- Time pequeno/medio (SQL e conhecimento universal)
- Dados estruturados com schema previsivel
- Necessidade de JOINs entre entidades

---

## Quando Considerar NoSQL

| Problema Comprovado | Solucao NoSQL | Exemplo Concreto |
|---------------------|---------------|------------------|
| Escrita massiva (>100k writes/s) | Cassandra, ScyllaDB, DynamoDB | Logs, IoT, metricas em tempo real |
| Dados sem schema fixo (varia muito) | MongoDB, DynamoDB | CMS com tipos de conteudo variados |
| Cache de alta performance | Redis, Memcached | Sessoes, cache de API, rate limiting |
| Grafos de relacionamentos profundos | Neo4j | Rede social, sistema de recomendacao |
| Busca full-text avancada | Elasticsearch, Meilisearch | Busca em catalogo de produtos |
| Key-value com latencia ultra-baixa | Redis, DynamoDB | Leaderboards, contadores real-time |
| Time-series em volume massivo | TimescaleDB, InfluxDB, Cassandra | Metricas de infraestrutura, IoT |

### Sinais de Que NAO Precisa de NoSQL

- "Schema flexivel" mas dados tem estrutura previsivel → PostgreSQL JSONB
- "Escala" mas trafego atual e < 10k RPM → PostgreSQL com indice otimizado
- "Busca" mas sao queries simples LIKE → PostgreSQL full-text search
- "Performance" mas nao otimizou queries nem adicionou cache → otimizar primeiro

---

## PostgreSQL JSONB — O Melhor dos Dois Mundos

PostgreSQL suporta colunas JSONB com indexacao nativa, resolvendo muitos casos de "schema flexivel" sem precisar de banco NoSQL.

### Quando Usar JSONB

| Cenario | JSONB? | Justificativa |
|---------|--------|---------------|
| Metadados variaveis por registro | SIM | Cada produto pode ter atributos diferentes |
| Preferencias de usuario | SIM | Estrutura varia por usuario |
| Dados de integracao (payload de webhook) | SIM | Schema externo, fora do controle |
| Dados centrais do dominio (user, order) | NAO | Schema fixo, usar colunas tipadas |
| Dados frequentemente consultados com JOIN | NAO | JSONB nao faz JOIN eficiente |

### Indices GIN para JSONB

Criar indice GIN para queries em campos JSONB:

```sql
-- Indice para queries em qualquer campo do JSONB
CREATE INDEX idx_metadata ON products USING GIN (metadata);

-- Indice para campo especifico (mais eficiente)
CREATE INDEX idx_metadata_color ON products USING GIN ((metadata->'color'));
```

### Limites do JSONB

- Sem foreign keys dentro do JSONB
- Sem constraints (check, unique) em campos internos
- Queries em JSONB profundamente aninhado ficam complexas e lentas
- Atualizacao parcial de JSONB reescreve o documento inteiro (ate PostgreSQL 16)

Se precisar de foreign keys, constraints ou JOINs frequentes nos dados → usar colunas relacionais.

---

## Polyglot Persistence

Usar multiplos bancos de dados, cada um para o que faz melhor:

```
PostgreSQL  → Dados transacionais (usuarios, pedidos, pagamentos)
Redis       → Cache, sessoes, rate limiting
Elasticsearch → Busca full-text em catalogo
S3/R2       → Arquivos e midias
TimescaleDB → Metricas e time-series
```

### Regras para Polyglot Persistence

1. **So adicionar banco novo quando necessario** — cada banco adicional e mais complexidade operacional
2. **PostgreSQL e a fonte de verdade** — outros bancos sao complementares
3. **Dados devem fluir em uma direcao** — PostgreSQL → Elasticsearch (sync), nao o contrario
4. **Monitorar TODOS os bancos** — backup, alertas, metricas para cada um
5. **Documentar fluxo de dados** — qual dado esta onde e por que

### Custo de Cada Banco Adicional

Cada banco adicionado ao stack significa:
- Mais uma coisa para monitorar (alertas, dashboards)
- Mais uma coisa para fazer backup (e testar restore)
- Mais uma coisa que pode falhar (e precisa de fallback)
- Mais complexidade para o time manter (conhecimento especializado)
- Sincronizacao de dados entre bancos (consistencia eventual)

---

## Comparativo para Decisao Rapida

| Criterio | PostgreSQL | MongoDB | DynamoDB | Cassandra | Redis |
|----------|-----------|---------|----------|-----------|-------|
| Transacoes ACID | Nativo | Limitado (4.0+) | Limitado | Nao | Nao |
| Schema | Fixo + JSONB | Flexivel | Flexivel | Fixo por familia | N/A |
| JOINs | Eficientes | Nao recomendado | Nao | Nao | Nao |
| Escrita massiva | Moderada | Boa | Excelente | Excelente | Excelente |
| Leitura massiva | Boa (com replicas) | Boa | Excelente | Boa | Excelente |
| Latencia | ~1-10ms | ~1-10ms | ~1-5ms | ~1-10ms | ~0.1-1ms |
| Escala horizontal | Limitada (Citus) | Nativa (sharding) | Nativa | Nativa | Cluster |
| Custo operacional | Baixo | Medio | Baixo (gerenciado) | Alto | Baixo |
| Curva de aprendizado | Baixa (SQL) | Media | Media | Alta | Baixa |

---

## Anti-Patterns

- **Escolher banco por hype** — "usar MongoDB porque e moderno" sem ter problema que justifique
- **NoSQL para dados relacionais** — simular JOINs em MongoDB e pior que usar SQL
- **PostgreSQL para tudo incluindo cache** — cache em Redis e ordens de magnitude mais rapido
- **Polyglot desde o dia 1** — adicionar complexidade sem necessidade comprovada
- **Ignorar JSONB do PostgreSQL** — PostgreSQL suporta JSON nativo com indices GIN, resolvendo muitos casos de "schema flexivel"
- **Migrar banco em producao sem plano de rollback** — migracoes de banco sao as operacoes mais arriscadas em software
- **Usar NoSQL para evitar aprender SQL** — SQL e conhecimento fundamental que resolve a maioria dos problemas de dados
- **DynamoDB sem entender access patterns** — DynamoDB exige modelar dados pelos access patterns. Schema errado e irrecuperavel sem recriar tabela
