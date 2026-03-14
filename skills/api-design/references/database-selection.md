# Selecao de Banco de Dados — Referencia Completa

## Principio Fundamental

NAO existe "melhor banco de dados". Existe o banco certo para o problema certo. Basear a decisao em caracteristicas dos dados e padroes de acesso, nao em hype.

## REGRA DE OURO

**Comecar com SQL (PostgreSQL).** Migrar para NoSQL apenas quando houver problema comprovado que SQL nao resolve eficientemente.

Justificativa:
- SQL resolve 90%+ dos casos de uso
- PostgreSQL suporta JSON, full-text search, e extensoes (praticamente "multi-modelo")
- Migrar de SQL para NoSQL e mais facil que o contrario
- ACID e crucial — descobrir que precisa de transacoes DEPOIS e custoso

## Comparativo Detalhado

| Tipo | Exemplos | Forca | Fraqueza | Caso de uso ideal |
|------|----------|-------|----------|-------------------|
| **SQL Relacional** | PostgreSQL, MySQL | ACID, JOINs, queries flexiveis | Schema rigido, escala horizontal complexa | Dados relacionais, financeiro, transacional |
| **NoSQL Key-Value** | Redis, DynamoDB | Performance extrema, simplicidade | Sem queries complexas | Cache, sessoes, rate limiting |
| **NoSQL Document** | MongoDB, Firestore | Schema flexivel, dev rapido | JOINs limitados, consistencia eventual | CMS, catalogo de produtos, configs |
| **NoSQL Graph** | Neo4j, ArangoDB | Relacoes complexas, traversal eficiente | Nicho, curva de aprendizado | Redes sociais, recomendacoes, fraude |
| **NoSQL Columnar** | Cassandra, ClickHouse | Escrita massiva, series temporais | Queries ad-hoc limitadas | Logs, metricas, IoT, analytics |

## ACID vs BASE

### ACID (SQL)

| Propriedade | Significado | Exemplo |
|-------------|-------------|---------|
| **Atomicity** | Tudo ou nada | Transferencia bancaria: debito + credito juntos |
| **Consistency** | Dados sempre validos | Saldo nunca fica negativo (se constraint existir) |
| **Isolation** | Transacoes nao interferem | Dois debitos simultaneos nao causam saldo errado |
| **Durability** | Dados persistem apos commit | Mesmo com crash, dados commitados estao la |

**Quando ACID e inegociavel:**
- Operacoes financeiras (pagamentos, transferencias, saldos)
- Inventario/estoque (evitar venda de item inexistente)
- Qualquer operacao onde inconsistencia = prejuizo real

### BASE (NoSQL)

| Propriedade | Significado | Exemplo |
|-------------|-------------|---------|
| **Basically Available** | Sistema sempre responde | Feed mostra posts, mesmo que alguns estejam desatualizados |
| **Soft state** | Estado pode mudar sem input | Cache expira, replicas convergem |
| **Eventually consistent** | Consistencia com atraso | Post criado aparece para todos apos alguns segundos |

**Quando BASE e aceitavel:**
- Feeds de redes sociais (eventual consistency OK)
- Analytics e metricas (dados de ontem sao suficientes)
- Cache e sessoes (perder sessao = re-login, nao perda financeira)
- Logs e telemetria (ordem aproximada e suficiente)

## Polyglot Persistence

Usar o banco certo para cada tipo de dado dentro do mesmo sistema.

### Exemplo Pratico: E-commerce

| Dado | Banco | Motivo |
|------|-------|--------|
| Usuarios, pedidos, pagamentos | PostgreSQL | ACID, relacoes, integridade |
| Sessoes, carrinho temporario | Redis | Performance, TTL automatico |
| Catalogo de produtos | MongoDB/PostgreSQL JSONB | Schema flexivel por categoria |
| Busca de produtos | Elasticsearch/Meilisearch | Full-text search otimizado |
| Analytics de navegacao | ClickHouse | Escrita massiva, queries analiticas |

### Regras para Polyglot Persistence

1. **Comecar com um banco** (PostgreSQL) — adicionar outros apenas com necessidade comprovada
2. **Cada banco adicional = complexidade operacional** — backup, monitoramento, deploys
3. **Manter fonte de verdade clara** — se dado existe em 2 bancos, qual e o primario?
4. **Sincronizacao entre bancos** — definir estrategia (eventos, CDC, cron)
5. **NAO usar 5 bancos em projeto pequeno** — complexidade desproporcional

## PostgreSQL como "Multi-Modelo"

Antes de adicionar outro banco, verificar se PostgreSQL ja resolve:

| Necessidade | Feature do PostgreSQL |
|-------------|----------------------|
| Documentos JSON | `jsonb` com indices GIN |
| Full-text search | `tsvector` + `tsquery` |
| Key-value simples | `hstore` extension |
| Dados geoespaciais | PostGIS extension |
| Series temporais | TimescaleDB extension |
| Grafos simples | Recursive CTEs, `ltree` |
| Filas de mensagens | `LISTEN/NOTIFY`, pgmq |

## Anti-Patterns

| Anti-Pattern | Consequencia |
|-------------|-------------|
| Escolher NoSQL porque "e mais moderno" | Over-engineering sem beneficio real |
| MongoDB para dados altamente relacionais | Reinventar JOINs no codigo da aplicacao |
| SQL para cache de alta performance | Latencia desnecessaria — Redis existe |
| Misturar 5 bancos em projeto pequeno | Complexidade operacional insustentavel |
| NoSQL para dados financeiros sem ACID | Inconsistencias, dinheiro "sumindo" |
| Ignorar indices em SQL | Performance degradada, queries lentas |
| Escolher banco por familiaridade do time | Tech debt se o caso de uso nao encaixar |

## Checklist de Verificacao

- [ ] Escolha de banco justificada por caso de uso, nao por preferencia
- [ ] Se NoSQL, documentado por que SQL nao atendia
- [ ] Se SQL, indices criados para queries frequentes
- [ ] Estrategia de backup e recovery definida
- [ ] Fonte de verdade clara para cada tipo de dado
- [ ] Se polyglot, estrategia de sincronizacao documentada
- [ ] Considerou PostgreSQL com extensoes antes de adicionar outro banco
- [ ] Complexidade operacional avaliada (cada banco = mais monitoramento)
- [ ] Plano de migração/fallback definido
