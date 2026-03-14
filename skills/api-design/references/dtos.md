# DTOs (Data Transfer Objects) — Referencia Completa

## Conceito

DTOs sao objetos que definem EXATAMENTE quais dados entram e saem da API. Criam uma barreira de seguranca entre o mundo externo e o modelo de dominio.

## Input DTO vs Output DTO

| Aspecto | Input DTO (request) | Output DTO (response) |
|---------|--------------------|-----------------------|
| **ID** | NUNCA aceitar | Incluir (public ID, preferencialmente UUID) |
| **Campos sensiveis** | Rejeitar extras (`isAdmin`, `role`) | NUNCA expor (`password`, `tokens`, `internal_id`) |
| **Validacao** | SEMPRE no back-end | N/A (dados ja validados) |
| **Campos opcionais** | Explicitos com defaults | Incluir sempre (evitar `undefined`) |
| **Versionamento** | Versionar se API publica | Versionar se API publica |

## Regras Fundamentais

1. **Instanciar DTO ANTES de persistir** — nunca passar o body cru para o banco
2. **Rejeitar campos extras** — `{ name: "Jo", isAdmin: true }` deve ignorar ou rejeitar `isAdmin`
3. **Validacao SEMPRE no back-end** — front-end e UX, nao seguranca
4. **DTO != Modelo de Dominio** — DTO e contrato da API; modelo e regra de negocio
5. **Versionar DTOs se a API e publica** — `UserResponseV1`, `UserResponseV2`

## Exemplos de Implementacao

### Com Zod (TypeScript)

```typescript
// Input DTO — define o que ACEITAR
const CreateUserInput = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})
// Campos como isAdmin, role, id sao IGNORADOS automaticamente

type CreateUserInput = z.infer<typeof CreateUserInput>

// Output DTO — define o que EXPOR
const UserOutput = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().datetime(),
})
// Campos como password_hash, internal_id sao OMITIDOS

type UserOutput = z.infer<typeof UserOutput>
```

### No Handler/Controller

```typescript
// CORRETO: DTO instanciado antes de persistir
async function createUser(req: Request) {
  const input = CreateUserInput.parse(req.body)  // Valida + filtra campos
  const user = await userService.create(input)    // Apenas campos permitidos
  return UserOutput.parse(user)                   // Filtra output
}

// ANTI-PATTERN: Body cru direto no banco
async function createUser(req: Request) {
  const user = await db.users.create({ data: req.body })  // Mass Assignment!
  return user  // Vaza password_hash, internal_id, etc.
}
```

### Separacao por Operacao

```typescript
// Criar — sem ID, senha obrigatoria
const CreateUserInput = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
})

// Atualizar — tudo opcional, sem senha (endpoint separado)
const UpdateUserInput = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
})

// Output — mesmo para ambas operacoes
const UserOutput = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  updatedAt: z.string().datetime(),
})
```

## Anti-Patterns

| Anti-Pattern | Risco | Solucao |
|-------------|-------|---------|
| Expor modelo do banco na API | Vaza `password_hash`, `internal_notes` | Output DTO obrigatorio |
| Aceitar qualquer campo do body | Mass Assignment (`isAdmin: true`) | Input DTO com whitelist |
| Validar apenas no front-end | Bypass trivial via cURL/Postman | Validacao no back-end |
| Mesmo DTO para input e output | Necessidades diferentes, acoplamento | DTOs separados |
| DTO que espelha 1:1 o modelo | Acoplamento modelo-API | DTO como contrato independente |
| Retornar `undefined` no output | Inconsistencia para consumers | Defaults explicitos ou `null` |

## Padroes de Transformacao

### Modelo → Output DTO

```typescript
// Funcao de transformacao explicita
function toUserOutput(user: UserModel): UserOutput {
  return {
    id: user.publicId,        // Usar ID publico, nao interno
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    // password_hash, role, internalId -> OMITIDOS
  }
}

// Com Zod .parse() — valida e filtra automaticamente
const output = UserOutput.parse(user)
```

### Listas e Paginacao

```typescript
// DTO para listas paginadas
const PaginatedUsersOutput = z.object({
  data: z.array(UserOutput),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})
```

## Checklist de Verificacao

- [ ] Nenhum modelo de banco e exposto diretamente na API
- [ ] Input DTOs rejeitam campos nao permitidos
- [ ] Output DTOs omitem dados sensiveis (senha, tokens, IDs internos)
- [ ] Validacao acontece no back-end (front-end e bonus)
- [ ] DTOs sao instanciados antes de qualquer persistencia
- [ ] DTOs de criacao e atualizacao sao separados
- [ ] API publica tem DTOs versionados
- [ ] Listas retornam formato consistente (com paginacao)
- [ ] Campos opcionais tem defaults explicitos
