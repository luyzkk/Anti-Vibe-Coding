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
