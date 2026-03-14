# GraphQL Patterns — Referencia Detalhada

## Quando Usar GraphQL vs REST

```
GraphQL quando:
- Multiplos clientes com necessidades de dados diferentes (web, mobile, TV)
- Overfetching/underfetching e problema real (muitos round trips)
- Times distribuidos consumindo a mesma API
- Relacoes profundas entre entidades (grafo de dados)

REST quando:
- CRUD simples sem relacoes complexas
- Caching HTTP e importante (GraphQL usa POST, dificulta cache)
- Equipe sem experiencia com GraphQL
- API publica para terceiros (REST e mais universal)
```

**Regra:** Nao adote GraphQL porque e "moderno". Adote quando overfetching/underfetching e um problema real e mensuravel.

---

## Schema Design

### Type System

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  body: String
  author: User!
  comments: [Comment!]!
}

type Comment {
  id: ID!
  text: String!
  author: User!
}
```

**Regras:**
- `!` indica NOT NULL — use para campos obrigatorios
- `[Post!]!` = array nao-null de items nao-null
- Schema deve espelhar o domain model
- Manter schemas pequenos e modulares

### Queries e Mutations

```graphql
type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
  post(id: ID!): Post
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```

### Input Types (OBRIGATORIO para Mutations)

```graphql
input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}
```

**Anti-patterns:**
- Passar parametros individuais em mutations (usar input types)
- Schema monolitico gigante (dividir em modulos)
- Campos desnecessarios "por precaucao" (YAGNI)

---

## Error Handling

GraphQL SEMPRE retorna HTTP 200. Erros vao no campo `errors`.

```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "User not found",
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404
      },
      "path": ["user"]
    }
  ]
}
```

**Regras:**
- Incluir `extensions.code` para erro semantico (NOT_FOUND, UNAUTHORIZED, VALIDATION_ERROR)
- Incluir `path` para indicar qual field falhou
- Dados parciais sao VALIDOS — `data` pode ter campos `null` junto com `errors`
- Monitoring: nao confiar em HTTP status code (sempre 200). Monitorar campo `errors`

---

## Seguranca: Query Depth Limits

Queries aninhadas podem derrubar o servidor:

```graphql
# ATAQUE: query infinitamente aninhada
query {
  user(id: "1") {
    posts {
      author {
        posts {
          author {
            posts {
              # ... infinito
            }
          }
        }
      }
    }
  }
}
```

### Mitigacoes OBRIGATORIAS

1. **Depth limit:** Maximo 6-7 niveis de aninhamento
2. **Query complexity analysis:** Atribuir custo a cada field, rejeitar queries acima do limite
3. **Timeout:** Timeout por query (ex: 10s)
4. **Rate limiting:** Por usuario/IP (igual REST)

```typescript
// Exemplo com graphql-depth-limit
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  validationRules: [depthLimit(7)],
});
```

---

## N+1 em GraphQL: DataLoader

GraphQL e ESPECIALMENTE vulneravel ao N+1 por causa dos resolvers.

```typescript
// PROBLEMA: N+1
const resolvers = {
  User: {
    posts: async (user) => {
      // Chamado para CADA user — N queries!
      return db.posts.findMany({ where: { authorId: user.id } });
    }
  }
};
```

### Solucao: DataLoader (batch loading)

```typescript
import DataLoader from 'dataloader';

const postLoader = new DataLoader(async (userIds) => {
  // UMA unica query para TODOS os userIds
  const posts = await db.posts.findMany({
    where: { authorId: { in: userIds } }
  });
  // Mapear de volta para cada userId
  return userIds.map(id => posts.filter(p => p.authorId === id));
});

const resolvers = {
  User: {
    posts: (user) => postLoader.load(user.id) // Batched automaticamente
  }
};
```

**DataLoader agrupa automaticamente** todas as chamadas `.load()` de um mesmo tick em uma unica query batch.

---

## Checklist GraphQL

- [ ] Depth limit configurado (max 6-7 niveis)
- [ ] Query complexity analysis implementado
- [ ] DataLoader para resolver N+1 em resolvers
- [ ] Input types para todas as mutations
- [ ] Error handling com extensions.code
- [ ] Rate limiting por usuario/IP
- [ ] Schema modular (nao monolitico)
- [ ] Monitoring de campo `errors` (nao HTTP status)
