# API Standards — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos em `api/`, `routes/` e `app/api/`.

## Princípios

- **No Fat Controllers** — Controllers com >100 linhas devem ser refatorados
- Controllers apenas: recebem request, validam input, delegam para service, retornam response
- Regras de negócio vivem em Services, NUNCA em Controllers

## Validação

- SEMPRE valide input com Zod ou similar
- Valide na borda (entry point da API), não internamente
- Retorne erros descritivos (não genéricos 500)

## Error Handling

```typescript
// Pattern correto
export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await service.execute(parsed.data)
  return Response.json(result)
}
```

## Segurança

- NUNCA escreva SQL puro como string — use query-builders
- SEMPRE verifique autenticação/autorização
- NUNCA exponha dados internos (IDs de banco, stack traces) em respostas
- Rate limiting em endpoints públicos
- Sanitize inputs contra XSS e injection
- Siga OWASP top 10

## Response Format

- Use status codes HTTP corretos (201 para criação, 204 para delete, etc.)
- Respostas de erro devem ter formato consistente
- Inclua informação suficiente para debugging sem expor dados sensíveis

## Logging

- Log toda request com método, path, status, duração
- Log erros com stack trace (apenas server-side, nunca no response)
- Use structured logging (JSON) para observability

## URL Design

- SEMPRE substantivos, NUNCA verbos em URLs
  - ERRADO: `GET /getProducts`, `POST /createUser`, `DELETE /deleteOrder`
  - CORRETO: `GET /products`, `POST /users`, `DELETE /orders/:id`
- SEMPRE nomes no plural para colecoes
  - ERRADO: `/product/:id`, `/user/:id`
  - CORRETO: `/products/:id`, `/users/:id`
- Nested resources: maximo 3 niveis de profundidade
  - ACEITAVEL: `GET /users/:id/orders`
  - ACEITAVEL: `GET /users/:id/orders/:orderId/items`
  - DEMAIS: `GET /users/:id/orders/:orderId/items/:itemId/reviews` → flatten para `GET /reviews?item_id=X`
- Versionamento obrigatorio: `/api/v1/`, `/api/v2/`
- URLs em kebab-case: `/user-profiles` (NUNCA camelCase `/userProfiles`)
- Trailing slash consistente (escolha um padrao e mantenha)

## Paginacao

- SEMPRE pagine endpoints que retornam listas (NUNCA retorne colecao inteira)
- Parametros minimos: `page` + `pageSize` (ou `limit` + `offset`)
- Limite maximo de `pageSize` (ex: max 100, default 20)
- Resposta DEVE incluir metadados de paginacao:
```typescript
// Pattern correto
{
  data: [...],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 150,
    totalPages: 8,
    hasNext: true,
    hasPrev: false
  }
}
```
- Para datasets grandes (>10k registros): use cursor pagination
```typescript
// Cursor pagination
{
  data: [...],
  pagination: {
    cursor: "eyJpZCI6MTAwfQ==",
    hasNext: true,
    pageSize: 20
  }
}
```
- NUNCA `findAll()` ou `SELECT *` sem `LIMIT` — query sem limite e bomba-relogio

## Status Codes

- Use status codes semanticos — NUNCA 200 para tudo
- Criacao bem-sucedida: `201 Created` (NUNCA 200)
- Delete bem-sucedido sem body: `204 No Content`
- Request invalido (validacao): `400 Bad Request`
- Nao autenticado: `401 Unauthorized`
- Sem permissao: `403 Forbidden`
- Recurso nao encontrado: `404 Not Found`
- Conflito (duplicata): `409 Conflict`
- Entidade invalida (semantica): `422 Unprocessable Entity`
- Erro do servidor: `500 Internal Server Error` (APENAS para erros inesperados)
- NUNCA retorne `500` para erros de validacao ou regra de negocio
- NUNCA retorne `200` com `{ success: false }` no body — use o status code correto
