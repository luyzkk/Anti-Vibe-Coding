# REST API Avancado — Referencia Detalhada

## URL Design

### Regras Fundamentais

1. **Nouns, nao verbs.** O metodo HTTP define a acao
   - Correto: `GET /products`, `POST /orders`, `DELETE /users/123`
   - Errado: `GET /getProducts`, `POST /createOrder`, `GET /deleteUser/123`

2. **Plural SEMPRE** para nomes de recursos
   - Correto: `/products`, `/users`, `/orders`
   - Errado: `/product`, `/user`, `/order`

3. **kebab-case** para URLs multi-palavras
   - Correto: `/order-items`, `/user-profiles`
   - Errado: `/orderItems`, `/user_profiles`

4. **Nested resources** para relacoes hierarquicas (max 3 niveis)
   - Correto: `/products/:id/reviews`
   - Correto: `/users/:id/orders/:orderId/items`
   - Errado: `/users/:id/orders/:oid/items/:iid/subitems/:sid` (profundo demais)

5. **Versionamento** no path
   - Correto: `/api/v1/products`
   - Alternativa: header `Accept: application/vnd.api+json;version=1`

### Anti-patterns de URL

- Verbos na URL: `/getProducts`, `/createUser`
- Acoes como sub-recursos: `/users/123/delete` (usar `DELETE /users/123`)
- Singular: `/product/123` (usar `/products/123`)
- Mais de 3 niveis de nesting sem necessidade

---

## Status Codes — Guia Completo

### Sucesso (2xx)

| Code | Nome | Quando usar |
|------|------|-------------|
| 200 | OK | GET com dados, PUT/PATCH com corpo de resposta |
| 201 | Created | POST que criou recurso (incluir `Location` header) |
| 204 | No Content | DELETE bem-sucedido, PUT/PATCH sem corpo de resposta |

### Redirecionamento (3xx)

| Code | Nome | Quando usar |
|------|------|-------------|
| 301 | Moved Permanently | URL mudou definitivamente |
| 304 | Not Modified | Cache valido (ETag/If-None-Match) |

### Erro do Cliente (4xx)

| Code | Nome | Quando usar |
|------|------|-------------|
| 400 | Bad Request | Body invalido, parametros faltando, validacao falhou |
| 401 | Unauthorized | Nao autenticado (sem token ou token invalido) |
| 403 | Forbidden | Autenticado mas sem permissao |
| 404 | Not Found | Recurso nao existe |
| 405 | Method Not Allowed | Metodo HTTP nao suportado neste endpoint |
| 409 | Conflict | Conflito de estado (ex: recurso ja existe) |
| 422 | Unprocessable Entity | Validacao de negocio falhou (dados sintaticamente corretos mas semanticamente invalidos) |
| 429 | Too Many Requests | Rate limit excedido |

### Erro do Servidor (5xx)

| Code | Nome | Quando usar |
|------|------|-------------|
| 500 | Internal Server Error | Erro inesperado no servidor |
| 502 | Bad Gateway | Upstream retornou resposta invalida |
| 503 | Service Unavailable | Servidor temporariamente indisponivel |
| 504 | Gateway Timeout | Upstream nao respondeu a tempo |

### Anti-patterns de Status Code

- **200 para tudo:** Cliente nao sabe se criou (201), atualizou (200) ou falhou
- **500 para erro de validacao:** Usar 400/422 (erro do CLIENTE, nao do servidor)
- **200 com `{ "error": true }` no body:** Usar status code semantico
- **404 vs 403:** Se recurso existe mas usuario nao tem acesso, retornar 403 (nao 404, a menos que queira esconder existencia)

---

## Pagination — Decision Tree

```
Dados sao estaticos ou mudam pouco?
├─ SIM → Offset/Page pagination (simples, suficiente)
├─ NAO (dados mudam frequentemente)
│   ├─ Dataset e grande (>10K registros)?
│   │   ├─ SIM → Cursor pagination ✓ (performante, consistente)
│   │   ├─ NAO → Offset pagination (simples, aceitavel)
│   ├─ Precisa de "ir para pagina X" diretamente?
│   │   ├─ SIM → Offset/Page pagination (cursor nao permite)
│   │   ├─ NAO → Cursor pagination ✓
```

### Tipos de Pagination

#### 1. Page-based
```
GET /products?page=3&limit=10
```
- Mais intuitivo
- UI pode mostrar "Pagina 3 de 15"
- Problema: se novos itens forem adicionados, paginas mudam

#### 2. Offset-based
```
GET /products?offset=20&limit=10
```
- Flexivel (pular N itens)
- Mesmo problema de consistencia do page-based
- Performance degrada em datasets grandes (DB precisa percorrer N registros)

#### 3. Cursor-based (RECOMENDADO para datasets grandes)
```
GET /products?cursor=eyJpZCI6MTIzfQ&limit=10
```
- Cursor e um token opaco (base64 do ultimo ID, timestamp, etc.)
- Consistente mesmo com dados mutaveis
- Performance constante (WHERE id > cursor LIMIT N)
- NAO permite "ir para pagina X" (apenas proximo/anterior)

### Response de Pagination

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 10,
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTMzfQ"
  }
}
```

**Regra:** SEMPRE paginar endpoints que retornam colecoes. NUNCA retornar todos os registros.

---

## Filtering e Sorting

### Filtering via Query Parameters

```
GET /products?category=electronics&in_stock=true&price_min=10&price_max=100
```

**Regras:**
- snake_case para parametros
- Valores booleanos: `true`/`false`
- Ranges: `_min`/`_max` ou `_gte`/`_lte`
- Multiplos valores: `?status=active,pending` ou `?status=active&status=pending`

### Sorting

```
GET /products?sort=price_asc
GET /products?sort=-price    # prefixo - para descendente
GET /products?sort=price:asc,name:desc  # multiplos campos
```

**SEMPRE fazer sorting no backend.** Frontend carregaria todos os dados para ordenar localmente — ineficiente.

---

## Idempotencia e Safety

| Metodo | Safe? | Idempotent? | Nota |
|--------|-------|-------------|------|
| GET | SIM | SIM | Nao altera estado |
| HEAD | SIM | SIM | Como GET sem body |
| OPTIONS | SIM | SIM | Metadados |
| PUT | NAO | SIM | Substitui recurso inteiro |
| DELETE | NAO | SIM | Deletar 2x = mesmo resultado |
| POST | NAO | NAO | Cada call cria novo recurso |
| PATCH | NAO | NAO* | *Depende da implementacao |

**PUT vs PATCH:**
- **PUT:** Substitui recurso INTEIRO. Campos omitidos sao removidos
- **PATCH:** Atualiza APENAS campos enviados. Demais permanecem

---

## HATEOAS (Hypermedia)

Links na resposta indicam acoes disponiveis:

```json
{
  "id": 123,
  "name": "Product",
  "links": {
    "self": "/api/v1/products/123",
    "reviews": "/api/v1/products/123/reviews",
    "update": "/api/v1/products/123",
    "delete": "/api/v1/products/123"
  }
}
```

**Na pratica:** Poucas APIs implementam HATEOAS completo. Util para APIs publicas e discoverability.

---

## Checklist REST API

- [ ] URLs com nouns plurais (nao verbos)
- [ ] Versionamento no path (`/api/v1/`)
- [ ] Status codes semanticos (nao 200 para tudo)
- [ ] Pagination em TODOS os endpoints de colecao
- [ ] Filtering e sorting via query parameters
- [ ] PUT para substituicao completa, PATCH para parcial
- [ ] 201 + Location header para criacao
- [ ] 204 para delete sem body
- [ ] Rate limiting (429 Too Many Requests)
- [ ] Nested resources com max 3 niveis
