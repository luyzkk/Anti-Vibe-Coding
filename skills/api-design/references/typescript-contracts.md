# Contratos TypeScript em Tempo de Compilacao — Referencia Completa

## Conceito

Contratos de API podem ser verificados em dois momentos: em runtime (validacao com Zod, schemas) ou em tempo de compilacao (tipos TypeScript). Ambos sao complementares — um nao substitui o outro.

Esta referencia cobre duas tecnicas de modelagem de contrato em tempo de compilacao:

1. **Discriminated Unions** — modelar variantes de resposta de forma que o compilador force tratamento exaustivo.
2. **Branded Types** — prevenir confusao entre IDs de tipos distintos sem precisar de `as`.

**Conexao com o mandato global:** o CLAUDE.md proibe `any` e prefere type guards. Unions discriminadas dao narrowing exaustivo; branded IDs eliminam a necessidade de `as`-casting entre IDs de diferentes entidades.

> Para separacao de Input DTO vs Output DTO e schemas Zod, ver `references/dtos.md`.

---

## Discriminated Unions para Variantes

### O problema

Endpoints que retornam shapes diferentes por condicao (ex: sucesso vs erro, entidade ativa vs arquivada) precisam modelar essas variantes de forma que o compilador exija tratamento de cada caso.

Sem discriminated union, o codigo faz `if (response.data)` sem garantia de exaustividade — casos novos sao ignorados silenciosamente.

### Estrutura

Uma discriminated union usa um campo literal comum (`kind`, `type`, `status`) como discriminante. O compilador estreita o tipo automaticamente em cada branch.

```typescript
// Variantes de status de uma tarefa
type TaskStatus =
  | { kind: 'pending'; scheduledAt: string }
  | { kind: 'running'; startedAt: string; progress: number }
  | { kind: 'done'; completedAt: string; result: string }
  | { kind: 'failed'; failedAt: string; reason: string }

// Narrowing exaustivo — compilador avisa se novo 'kind' nao for tratado
function describeStatus(status: TaskStatus): string {
  switch (status.kind) {
    case 'pending':  return `Agendado para ${status.scheduledAt}`
    case 'running':  return `Em progresso: ${status.progress}%`
    case 'done':     return `Concluido em ${status.completedAt}`
    case 'failed':   return `Falhou: ${status.reason}`
    // Sem 'default' necessario — TypeScript garante exaustividade
  }
}
```

### Exaustividade com `never`

Para garantir que adicionar uma nova variante cause erro de compilacao em todos os pontos nao atualizados:

```typescript
function assertNever(x: never): never {
  throw new Error(`Caso nao tratado: ${JSON.stringify(x)}`)
}

function describeStatus(status: TaskStatus): string {
  switch (status.kind) {
    case 'pending':  return `Agendado para ${status.scheduledAt}`
    case 'running':  return `Em progresso: ${status.progress}%`
    case 'done':     return `Concluido em ${status.completedAt}`
    case 'failed':   return `Falhou: ${status.reason}`
    default:         return assertNever(status) // Erro de compilacao se novo kind nao for tratado
  }
}
```

### Quando usar

- Endpoints que retornam shapes diferentes por condicao de negocio (entidade em estados distintos).
- Responses de webhook com tipos de evento heterogeneos.
- Resultados de operacoes que podem ter multiplos tipos de sucesso ou falha.

---

## Branded Types para IDs

### O problema

IDs de entidades diferentes sao todos `string` em JavaScript. O compilador nao distingue `userId` de `orderId` — e facil passar um no lugar do outro sem erro em tempo de compilacao.

```typescript
// Sem branded types — TypeScript aceita isso silenciosamente:
function getOrder(orderId: string): Order { ... }
const userId = "usr_123"
getOrder(userId)  // Nenhum erro — bug em producao
```

### Estrutura

Branded types adicionam uma "marca" nominal ao tipo primitivo. O `__brand` nunca existe em runtime — e pura informacao de tipo para o compilador.

```typescript
// Definicao dos branded types
type UserId  = string & { readonly __brand: 'UserId' }
type OrderId = string & { readonly __brand: 'OrderId' }

// Funcao de criacao (o unico lugar onde 'as' e aceitavel — encapsulado)
function toUserId(raw: string): UserId   { return raw as UserId }
function toOrderId(raw: string): OrderId { return raw as OrderId }

// Agora o compilador distingue:
function getOrder(orderId: OrderId): Order { ... }

const userId = toUserId("usr_123")
getOrder(userId)  // Erro de compilacao: UserId nao e assignavel a OrderId
```

### Integracao com Zod

```typescript
import { z } from 'zod'

// Schema com branded type
const UserIdSchema = z.string().uuid().brand<'UserId'>()
type UserId = z.infer<typeof UserIdSchema>

// Parse na fronteira (Input DTO) — valida formato e aplica brand
const userId = UserIdSchema.parse(req.params.id)
```

### Quando usar

- APIs com multiplos tipos de ID (user, order, product, session) onde confusao e possivel.
- Funcoes que recebem IDs como argumentos e precisam ser type-safe.
- Camadas de servico que recebem IDs vindos de DTOs validados.

---

## Anti-Patterns

| Anti-Pattern | Risco | Solucao |
|-------------|-------|---------|
| `type Status = string` sem discriminante | Compiler nao estreita, codigo usa `if/else` fragil | Discriminated union com campo `kind` |
| `default:` capturando casos novos silenciosamente | Novos estados ignorados em producao | `assertNever` para exaustividade |
| Todos os IDs sao `string` sem brand | Confusao de IDs sem erro de compilacao | Branded types por entidade |
| `as UserId` espalhado no codigo | `as` desabilita checagem — bugs escapam | Encapsular em funcoes `toUserId()` na fronteira |
| Discriminated union sem `__brand` em IDs | IDs ainda sao intercambiaveis | Usar ambas as tecnicas onde aplicavel |

---

## Checklist de Verificacao

- [ ] Variantes de response modeladas com discriminated union (nao `any` ou `object`)
- [ ] Switch sobre discriminante usa `assertNever` (ou exaustividade via linter)
- [ ] IDs de entidades distintas tem branded types proprios
- [ ] Conversao `as BrandedType` encapsulada em funcao de criacao, nao espalhada
- [ ] Schemas Zod usam `.brand<'NomeDoTipo'>()` para IDs validados na fronteira
- [ ] Nenhum ID e passado como `string` generico entre camadas diferentes
