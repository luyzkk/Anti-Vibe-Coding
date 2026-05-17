---
topic: type-system-idioms
stack: nodejs-typescript
layer: both
sources:
  - research: f8f4e50c (claude-code/knowledge/Nodejs/compass_artifact_wf-f8f4e50c-24d6-4d5b-b823-75d7fdae759c_text_markdown.md)
  - research: 2230af87 (claude-code/knowledge/Nodejs/compass_artifact_wf-2230af87-8246-4c0f-817d-16030a2c0e0e_text_markdown.md)
tier: 1
triggers: [type, generic, branded, discriminated, satisfies, ESM, CJS]
related_skills: [/design-patterns]
updated: 2026-05-16
---

# Type System Idioms — Node.js + TypeScript

## Quando consultar

- Modelar identificadores de domínio (`UserId`, `OrderId`, `Cents`) que não podem ser trocados acidentalmente.
- Representar estados mutuamente exclusivos (status de pagamento, lifecycle de job, resultado de operação).
- Decidir entre `Result<T,E>` e `throw` para erros em casos de uso.
- Usar `satisfies` vs anotação de tipo vs `as const` num literal de configuração.
- Publicar ou consumir lib com interop ESM/CJS e campos `exports` no `package.json`.

## Padrões sênior

### Pattern: Branded types para identificadores opacos

- **Problema:** TypeScript é estruturalmente tipado — `UserId` e `OrderId` (ambos `string`) são intercambiáveis. `chargeOrder(orderId, userId)` inverte silenciosamente sem erro de compilação.
- **Padrão:**
  ```ts
  declare const __brand: unique symbol;
  type Brand<T, B extends string> = T & { readonly [__brand]: B };
  type UserId  = Brand<string, "UserId">;
  type OrderId = Brand<string, "OrderId">;
  type Cents   = Brand<number, "Cents">;
  // Smart constructor — parse na borda (Zod .brand<"UserId">() integra em um passo)
  const UserId = (s: string): UserId => s as UserId;
  ```
- **Quando usar:** todo ID de entidade, valores monetários (`Cents`), timestamps em formato específico (`EpochMs`), strings validadas (`Email`). Em code-path de pagamento, autenticação e multi-tenant: obrigatório.
- **Quando NÃO usar:** primitivos verdadeiramente genéricos em funções utilitárias puras (ex.: argumento de `clamp(n: number)`).

---

### Pattern: Discriminated unions com exhaustiveness

- **Problema:** objetos com múltiplos campos opcionais que sinalizam estado permitem combinar campos incoerentes — o compilador não sabe que `ok === true` implica `data` definido.
- **Padrão:**
  ```ts
  // Discriminante canônica: `status`, `kind`, `type`, `tag`
  type Payment =
    | { status: "pending";   amount: Cents }
    | { status: "succeeded"; amount: Cents; txId: TxId }
    | { status: "failed";    reason: string };

  function assertNever(x: never): never {
    throw new Error(`Caso não tratado: ${JSON.stringify(x)}`);
  }

  switch (payment.status) {
    case "pending":   return ...;
    case "succeeded": return ...;
    case "failed":    return ...;
    default: return assertNever(payment); // erro de compilação se case faltando
  }
  ```
- **Quando usar:** estados de UI, resultados de operações, mensagens de protocolo, eventos de domínio. `ts-pattern` substitui `switch` quando matching é multi-campo.
- **Quando NÃO usar:** quando há apenas uma variante — use type alias direto.

---

### Pattern: `satisfies` operator (TS 4.9+)

- **Problema:** anotar `: Record<string, {path: string}>` alarga o tipo literal; usar `as` mente sem verificar shape; `as const` preserva literais mas não valida o contrato.
- **Padrão:**
  ```ts
  const routes = {
    home: { path: "/" },
    auth: { path: "/auth" },
  } as const satisfies Record<string, { path: string }>;
  // routes.home.path é "/" (literal), não string — mas shape validado
  ```
- **Quando usar:** objetos de configuração, route maps, dicionários de constantes onde você precisa validar shape E preservar literais. Combinar `as const satisfies T` é o padrão mais robusto.
- **Quando NÃO usar:** quando você quer deliberadamente alargar o tipo para o contrato de uma função (use anotação `: T` normal).

---

### Pattern: `Result<T, E>` para erros de domínio em handlers Node

- **Problema:** `throw` não aparece na assinatura — o caller não sabe que existe um erro de domínio esperado (saldo insuficiente, e-mail duplicado). Em queue workers e HTTP handlers, erros de negócio misturados com erros de infra viram catch-all obscuros.
- **Padrão:**
  ```ts
  type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
  const ok  = <T>(value: T): Result<T, never> => ({ ok: true, value });
  const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

  type ChargeError =
    | { kind: "insufficient_balance"; available: Cents }
    | { kind: "card_declined"; reason: string };

  async function charge(userId: UserId, amount: Cents): Promise<Result<TxId, ChargeError>> {
    const balance = await getBalance(userId);
    if (balance < amount) return err({ kind: "insufficient_balance", available: balance });
    return ok(txId);
  }
  // No handler — switch exaustivo no `error.kind` (discriminated union acima)
  ```
  Alternativa: `neverthrow` (ResultAsync ergonômico), `fp-ts` (bundle maior).
- **Quando usar:** erros que fazem parte do contrato do caso de uso; lógica interna de domínio; quando o caller precisa tratar casos distintos.
- **Quando NÃO usar:** erros de programação (bug, invariante violada), falhas infraestruturais transitórias (DB down, timeout) — nesses casos `throw` + framework error handler é mais simples. Nunca misture: ou a função retorna `Result` ou ela lança — os dois juntos são o pior dos dois mundos.

---

### Pattern: ESM vs CJS interop em libs publicadas

- **Problema:** lib publicada como CJS quebra em projetos `"type": "module"`; dual-package com `.cjs`/`.mjs` gera instâncias duplicadas de singletons se bundler resolver ambas.
- **Padrão para Node 20+/22+ (aplicação, não lib):**
  ```json
  // package.json — aplicação
  { "type": "module" }
  ```
  ```json
  // tsconfig.json
  { "module": "NodeNext", "moduleResolution": "NodeNext", "verbatimModuleSyntax": true }
  ```
  Imports relativos exigem extensão `.js` (mesmo em `.ts`): `import { fn } from "./utils.js"`.
- **Padrão para lib publicada (dual package):**
  ```json
  // package.json
  {
    "exports": {
      ".": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs",
        "types": "./dist/index.d.ts"
      }
    }
  }
  ```
  Usar `tsup` para gerar ambos os formatos automaticamente.
- **Quando usar:** `"type": "module"` + `nodenext` em todo projeto novo. Dual package só se a lib precisa suportar consumers CJS legados.
- **Quando NÃO usar:** não crie dual package se a lib é interna ao monorepo — use `moduleResolution: "bundler"` no consumer.

---

## Anti-padrões

- **`any` como escape hatch:** `any` desliga o type checker localmente e vaza para todos os callers. Substitua por `unknown` + type guard explícito ou schema Zod. Com `useUnknownInCatchVariables: true` (incluído em `strict`), variáveis de catch já são `unknown` automaticamente.

- **`as` casting sem validação:** `value as User` passa no compilador mesmo se o shape estiver errado — falha em runtime silenciosamente. Correção: parse via `UserSchema.parse(value)` na borda; use `satisfies` para literais internos; encapsule casts obrigatórios (interop com SDK de tipos ruins) em wrapper isolado com `InvoiceSchema.parse(raw)` saindo tipado.

- **Generics sem `extends` (generic decorativo):** `function parse<S>(input: string): S` — `S` aparece só no retorno, força o caller a anotar e mente sobre garantia real. Regra de ouro (Ryan Cavanaugh): type parameter deve aparecer ≥ 2 vezes na assinatura para relacionar dois tipos. Correção: retorne tipo concreto ou aceite `unknown` + cast documentado no caller.

- **`enum` em vez de union literal:** `enum Status { Pending, Paid }` emite IIFE com reverse mapping (não tree-shakes), é incompatível com `isolatedModules`/esbuild para `const enum`, e não aceita string literals diretamente. Correção: `const Status = { Pending: "pending", Paid: "paid" } as const; type Status = (typeof Status)[keyof typeof Status];`. Exceção: quando Prisma ou OpenAPI geram enums TypeScript — nesses o Prisma já os trata como union em tipo.

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Modelar id de domínio que não pode ser confundido com outro | Branded type + smart constructor |
| Modelar estado finito com handlers exaustivos | Discriminated union + switch + `assertNever` |
| Validar shape de constante sem perder literal type | `as const satisfies T` |
| Erro de domínio esperado com tratamentos distintos no caller | `Result<T, E>` (inline ou neverthrow) |
| Erro de programação / falha de infra transitória | `throw` — deixar framework tratar |
| Decidir entre `enum` e union para status de domínio | Union literal + `as const` (sempre, exceto codegen) |
| Aplicação Node 20+ nova, sem lib para publicar | `"type": "module"` + `moduleResolution: "nodenext"` |
| Lib npm que precisa suportar consumers CJS | Dual package via `exports` field + tsup |

---

## Referências externas

- Skill: `/design-patterns` — Result Pattern, error handling cross-stack, state machines
- Research: `f8f4e50c` — `claude-code/knowledge/Nodejs/compass_artifact_wf-f8f4e50c-24d6-4d5b-b823-75d7fdae759c_text_markdown.md`
- Research: `2230af87` — `claude-code/knowledge/Nodejs/compass_artifact_wf-2230af87-8246-4c0f-817d-16030a2c0e0e_text_markdown.md`
