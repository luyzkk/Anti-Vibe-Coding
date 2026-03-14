# Problema N+1 — Referencia Completa

## Conceito

O problema N+1 ocorre quando uma query inicial busca uma lista de N itens, e para cada item uma query adicional e disparada para buscar dados relacionados. Resultado: 1 + N queries ao banco.

```
// ANTI-PATTERN: N+1
const orders = await db.orders.findAll()          // 1 query
for (const order of orders) {
  order.customer = await db.customers.find(order.customerId)  // N queries
}
// Total: 1 + N queries (100 orders = 101 queries)
```

## Quando Acontece

- **Lazy loading em loops** — ORM carrega relacao sob demanda a cada iteracao
- **Iteracao manual** sobre resultados sem pre-carregar relacoes
- **APIs REST** que retornam IDs e forcam o client a buscar cada recurso individualmente
- **GraphQL sem DataLoader** — cada resolver busca dados independentemente

## Estrategias de Solucao

| Estrategia | Exemplo | Quando usar |
|------------|---------|-------------|
| **Eager Loading** | `select_related`, `prefetch_related`, `with()`, `include` | Sempre que iterar sobre relacoes conhecidas |
| **JOIN explicito** | `SELECT * FROM orders JOIN customers ON ...` | Quando precisa de dados de ambas tabelas em uma unica query |
| **Batch Loading** | DataLoader (GraphQL), `WHERE id IN (...)` | APIs GraphQL ou quando eager loading nao esta disponivel |
| **Subquery** | `WHERE customer_id IN (SELECT id FROM ...)` | Quando JOIN gera duplicatas indesejadas |

### Exemplos por ORM/Framework

```
// Prisma — Eager Loading
const orders = await prisma.order.findMany({
  include: { customer: true }  // 2 queries no total (orders + customers)
})

// Drizzle — JOIN explicito
const result = await db
  .select()
  .from(orders)
  .leftJoin(customers, eq(orders.customerId, customers.id))

// TypeORM — Relations
const orders = await orderRepo.find({
  relations: ['customer']
})

// Sequelize — Include
const orders = await Order.findAll({
  include: [Customer]
})
```

### DataLoader (GraphQL)

```
// Sem DataLoader: N+1 por resolver
const resolvers = {
  Order: {
    customer: (order) => db.customers.find(order.customerId)  // 1 query por order
  }
}

// Com DataLoader: Batch automático
const customerLoader = new DataLoader(async (ids) => {
  const customers = await db.customers.findMany({ where: { id: { in: ids } } })
  return ids.map(id => customers.find(c => c.id === id))
})

const resolvers = {
  Order: {
    customer: (order) => customerLoader.load(order.customerId)  // Batched!
  }
}
```

## Deteccao

- **Regra de ouro:** query dentro de loop = N+1
- Usar profiler de queries (ex: `pg_stat_statements`, query logger do ORM)
- Monitorar: se numero de queries cresce linearmente com dados, e N+1
- Escrever testes de performance que falham acima de X queries por endpoint
- Habilitar logging de queries em desenvolvimento:

```
// Prisma — habilitar log de queries
const prisma = new PrismaClient({
  log: ['query']  // Mostra cada query no console
})

// TypeORM
const connection = await createConnection({
  logging: true  // Loga todas as queries
})
```

### Sinais de Alerta

| Sinal | Indicacao |
|-------|-----------|
| Endpoint lento que piora com mais dados | Provavel N+1 |
| Quantidade de queries proporcional a itens retornados | Confirmado N+1 |
| `await` ou query dentro de `for/forEach/map` | Pattern suspeito |
| Tempo de resposta OK com 5 itens, timeout com 500 | Crescimento linear = N+1 |

## Anti-Patterns Relacionados

- Assumir que o ORM otimiza automaticamente (lazy loading e o padrao em muitos ORMs)
- Resolver N+1 com cache sem corrigir a query (mascara o problema)
- Eager loading de TUDO (over-fetching — carregar apenas relacoes necessarias)
- Ignorar N+1 em endpoints de baixo trafego (divida tecnica acumula)

## Checklist de Verificacao

- [ ] Nenhuma query e executada dentro de loops
- [ ] Relacoes necessarias sao carregadas via eager loading
- [ ] Profiler de queries ativo em desenvolvimento
- [ ] Testes validam numero maximo de queries por operacao
- [ ] DataLoader implementado para resolvers GraphQL
- [ ] Logging de queries habilitado em ambiente de dev
- [ ] Endpoints com listas foram testados com volume realista de dados
