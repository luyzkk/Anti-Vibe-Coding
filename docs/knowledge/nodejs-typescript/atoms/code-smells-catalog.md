---
topic: code-smells-catalog
stack: nodejs-typescript
layer: both
sources:
  - research: 98973791
tier: 2
triggers: [code smell, refactor, any, enum, await, fire-and-forget, god module]
related_skills: [/design-patterns]
updated: 2026-05-16
---

# Code Smells Catalog — Node.js + TypeScript

## Quando consultar

- Code review em PR que toca boundary (HTTP handler, queue consumer, repositório).
- Onboarding de junior — serve de checklist de "o que evitar" em Node+TS.
- Spike de refactor: priorizar o que atacar primeiro (severidade × urgência abaixo).
- Diagnóstico de bug silencioso em async ou de crash de runtime por tipo incorreto.
- Pré-migração: inventariar dívida antes de subir versão do Node ou do ORM.

## Padrões sênior

### Smell: `any` leak via `JSON.parse` / `Response.json()`

- **Sintoma:** `const data = JSON.parse(body)` ou `const res = await fetch(...); const json = await res.json()` — tipo inferred é `any`, que propaga para toda a call chain.
- **Por que dói:** o type checker desliga silenciosamente nos callers; um campo renomeado na API externa quebra em runtime sem warning. "The single most unsafe part of TypeScript's type system" (Josh Goldberg, typescript-eslint maintainer, jan/2025).
- **Refactor:** parse na borda com Zod — `const data = UserSchema.parse(JSON.parse(body))` — retorna tipo narrow sem `any`. Alternativa leve: `satisfies` se o shape for interno e confiável.
- **Quando tolerar:** scripts descartáveis, mocks de teste onde o tipo já é conhecido e trivial.

---

### Smell: `enum` numérico em contexto literal-friendly

- **Sintoma:** `enum Status { Pending, Paid, Failed }` — valores numéricos no runtime, IIFE emitido, reverse mapping desnecessário.
- **Por que dói:** não tree-shakes; incompatível com `isolatedModules` / esbuild para `const enum`; não aceita string literals diretamente; dificulta serialização JSON e logs.
- **Refactor:** `const Status = { Pending: "pending", Paid: "paid", Failed: "failed" } as const; type Status = (typeof Status)[keyof typeof Status];`
- **Quando tolerar:** código gerado por Prisma ou OpenAPI — não reescreva; os toolings já tratam internamente.

---

### Smell: type assertion (`as Foo`) sem type guard

- **Sintoma:** `const user = response as User` ou `value as unknown as SomeType` em boundary externo.
- **Por que dói:** o compilador aceita, mas o shape pode estar errado; falha em runtime silenciosamente (campo undefined) ou corrompe dado persistido.
- **Refactor:** type predicate function (`function isUser(x: unknown): x is User { ... }`) ou `UserSchema.parse(value)` na borda. Casts obrigatórios (SDK com tipos ruins) encapsulados em wrapper isolado com comentário de justificativa.
- **Quando tolerar:** interop com SDKs externos cujos tipos são declarados incorretamente — encapsule em um único adapter, não espalhe.

---

### Smell: forgotten `await` (floating Promise)

- **Sintoma:** `saveRecord(data)` sem `await` num `async` handler; `ESLint: @typescript-eslint/no-floating-promises` sinalizaria, mas a regra não está ativa.
- **Por que dói:** a Promise fica pendente; erros somem (unhandled rejection no Node 22+ encerra o processo por padrão); o handler responde antes da operação terminar.
- **Refactor:** adicionar `await`; se intencional (fire-and-forget auditado), use `void saveRecord(data)` explícito + comentário. Ativar a regra ESLint `@typescript-eslint/no-floating-promises` em CI.
- **Quando tolerar:** nunca em handler HTTP/queue. Em scripts one-shot onde o processo encerra logo depois: ok com `void`.

---

### Smell: fire-and-forget sem error boundary

- **Sintoma:** `worker.queue(job)` ou `sendNotification(payload)` sem `.catch(...)` e sem registro de falha.
- **Por que dói:** falhas de rede, timeout ou bug no worker somem silenciosamente; nenhum alerta, nenhuma DLQ, nenhum retry — o usuário pensa que a operação funcionou.
- **Refactor:** wrapper de queue que captura, loga (Pino com correlation ID) e encaminha para DLQ ou retry. Se a operação é crítica, use `await` e trate explicitamente.
- **Quando tolerar:** telemetria não-crítica (analytics hit) onde perda ocasional é aceitável — documente isso explicitamente no código.

---

### Smell: sequential `await` em loop quando paralelo é seguro

- **Sintoma:** `for (const id of ids) { const item = await fetch(id); results.push(item); }` — N chamadas serializadas.
- **Por que dói:** latência = soma de todas as chamadas; para 10 itens com 100ms cada: 1s vs 100ms paralelo.
- **Refactor:** `const results = await Promise.all(ids.map(id => fetch(id)))`. Para batches grandes ou rate limits: `p-limit` com concorrência controlada. Para dependência entre iterações: `await` sequencial é correto — não paralelize.
- **Quando tolerar:** quando cada iteração depende do resultado da anterior; quando o target tem rate limit estrito por cliente.

---

### Smell: sem validação de DTO no input

- **Sintoma:** `const { email, role } = req.body as CreateUserDTO` — handler HTTP ou consumer de fila consome o payload direto como tipo de domínio.
- **Por que dói:** dados malformados ou maliciosos chegam ao domínio; erros de runtime em vez de erros de validação claros; sem mensagem de erro útil para o caller.
- **Refactor:** `const dto = CreateUserSchema.parse(req.body)` no início do handler — Zod lança `ZodError` que o error handler central formata. Tipo de domínio só é construído após validação.
- **Quando tolerar:** endpoints internos entre serviços controlados pelo mesmo time, com contrato garantido por schema compartilhado e CI.

---

### Smell: ORM model vazando para response

- **Sintoma:** `res.json(user)` onde `user` é o modelo Prisma/TypeORM diretamente — `passwordHash`, `internalFlags`, campos de auditoria expostos.
- **Por que dói:** vaza dados sensíveis; acopla contrato de API ao schema de banco; qualquer migration de banco quebra o contrato de API silenciosamente.
- **Refactor:** DTO de saída explícito + mapper: `res.json(toUserDTO(user))`. Definir `UserDTO` no módulo de API, não no de domínio.
- **Quando tolerar:** protótipos internos sem dados sensíveis, quando o modelo == o DTO intencionalmente (simples CRUDs admin).

---

### Smell: `process.env` lido em runtime (não no boot)

- **Sintoma:** `const db = new DB({ url: process.env.DATABASE_URL })` dentro de um handler ou factory chamado em hot path.
- **Por que dói:** sem validação — um env var ausente falha tarde (no request, não no boot); lento em hot path; dificulta testes (exige mockar `process.env`).
- **Refactor:** parse e validate no boot com Zod schema de env: `const env = EnvSchema.parse(process.env)`. Injetar `env` como objeto tipado — funções recebem `config.databaseUrl`, não leem `process.env` diretamente.
- **Quando tolerar:** scripts CLI curtos onde o processo inicia e encerra rapidamente.

---

### Smell: `try/catch` swallowing (erro silenciado)

- **Sintoma:** `try { ... } catch (e) { return null; }` ou `catch (e) { console.log(e); }` sem re-throw nem Result.
- **Por que dói:** o caller recebe `null` sem saber o motivo; o erro some dos logs; debugging fica impossível; pode mascarar erros de programação (bug real) como "not found".
- **Refactor:** re-throw com `cause` chain — `throw new AppError("save failed", { cause: e })` — ou retornar `Result.err(...)` explícito. Centralizar o log no error handler de borda, não no catch local.
- **Quando tolerar:** quando o erro é genuinamente irrelevante e o código comentado explica o motivo (raro).

---

### Smell: god module (>500 linhas, múltiplas responsabilidades)

- **Sintoma:** `user.service.ts` com 800 linhas cobrindo auth, profile update, notification dispatch e billing validation.
- **Por que dói:** alto risco de regression a cada toque; testes de unidade ficam lentos de montar (muitas dependências); conflitos de merge constantes; onboarding novo dev leva horas para entender o arquivo.
- **Refactor:** extrair por responsabilidade — `auth.service.ts`, `profile.service.ts`, `notification.service.ts`. Critério de corte: se a classe tem mais de uma razão para mudar (SRP), extraia. Usar módulos de pasta com `index.ts` como fachada.
- **Quando tolerar:** durante uma sprint de feature urgente — criar ticket de tech debt imediatamente; não tolerar por mais de um sprint.

---

## Anti-padrões

- **Auto-fix em massa sem revisar:** `eslint --fix` em PR grande aplica centenas de mudanças automaticamente — pode remover `await` floating que era intencional, alterar comportamento de erros, renomear variáveis em contexto errado. Correção: rodar fixes em PRs pequenos por categoria de smell, revisar diff manualmente antes de merge.

- **Atacar todos os 52 smells de uma vez:** criar um backlog de refactor com 52 itens garante que nenhum seja feito. Correção: priorizar 3-5 smells por sprint usando a tabela severidade × urgência; fechar antes de abrir novos.

- **Confundir smell com bug:** smell é sinal de risco e de dívida técnica — não é erro confirmado. Tratar smell como bug urgente gera over-engineering; ignorar smell grave gera bugs reais. Correção: usar a tabela abaixo para decidir urgência; smell "Refactor agora" tem risco de bug iminente, os demais são dívida gerenciada.

## Critérios de decisão

| Smell | Severidade | Urgência |
|---|---|---|
| `any` leak via input externo | Alta | Refactor agora — bug em potencial |
| Forgotten `await` | Alta | Refactor agora — data race / unhandled rejection |
| Fire-and-forget sem error boundary | Alta | Refactor agora — perde falha silenciosamente |
| Sem validação de DTO no input | Alta | Refactor agora — vulnerabilidade de boundary |
| ORM model vazando para response | Alta | Refactor agora — vaza dados sensíveis |
| `try/catch` swallowing | Alta | Refactor agora — mascara bugs reais |
| `process.env` em runtime | Média | Refactor quando tocar o módulo |
| Sequential `await` em loop | Média | Refactor quando hot path confirmado |
| God module >500 linhas | Média | Refactor quando tocar de novo; ticket de debt agora |
| Type assertion sem guard | Média | Refactor se input não trustável |
| `enum` numérico | Baixa | Refactor oportunista no próximo toque |

## Referências externas

- Skill: `/design-patterns` — smells cross-stack (long method, feature envy, primitive obsession) e Fowler refactoring catalog; não duplicado aqui, foco neste átomo é Node+TS-specific.
- Research: `98973791` — `claude-code/knowledge/Nodejs/compass_artifact_wf-98973791-5fa9-4b2a-b2d6-04b515df7652_text_markdown.md` (catálogo completo de 52 smells com scores de prioridade, codemods e exemplos before/after)
