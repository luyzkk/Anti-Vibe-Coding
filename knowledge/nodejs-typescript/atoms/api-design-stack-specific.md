---
topic: api-design-stack-specific
stack: nodejs-typescript
layer: backend
sources:
  - research: 26cc8f92 (claude-code/knowledge/Nodejs/compass_artifact_wf-26cc8f92-38dd-42cc-90e8-1610235e9a71_text_markdown.md)
  - skill: nodejs-backend-patterns/SKILL.md (claude-code/knowledge/Nodejs/nodejs-backend-patterns/SKILL.md)
tier: 2
triggers: [fastify, express, zod, typebox, trpc, openapi, validation]
related_skills: [/api-design]
updated: 2026-05-16
---

# API Design — Node.js + TypeScript stack-specific

## Quando consultar

- Escolher entre Fastify e Express para um novo serviço Node+TS.
- Decidir qual lib de validação usar na fronteira HTTP (Zod, TypeBox, Valibot).
- Avaliar tRPC vs REST para uma API interna em monorepo TypeScript.
- Gerar documentação OpenAPI a partir dos tipos TS sem duplicar schema.

## Padrões sênior

### Pattern: Fastify vs Express na borda HTTP

- **Problema:** Express é o default histórico, mas Fastify oferece validação de schema built-in via JSON Schema — a escolha afeta como tipos fluem do request para o domínio.
- **Padrão:** Fastify com TypeBox como source of truth de schema: o mesmo objeto `TObject` valida em runtime (AJV interno do Fastify) e gera o tipo TS via `Static<typeof Schema>`. Express requer um passo extra — parse manual com Zod/TypeBox no handler.
  ```ts
  // Fastify + TypeBox: schema valida E tipa em um passo
  import { Type, Static } from "@sinclair/typebox";
  const Body = Type.Object({ name: Type.String(), email: Type.String({ format: "email" }) });
  type BodyT = Static<typeof Body>;
  fastify.post<{ Body: BodyT }>("/users", { schema: { body: Body } }, async (req) => {
    const { name, email } = req.body; // tipado + validado
  });
  ```
- **Quando usar Fastify:** novo serviço onde schema validation e OpenAPI gen são críticos; performance importa no hot path.
- **Quando usar Express:** integração com middleware legado; equipe fluente em Express sem tempo de migração; ecossistema de plugins específicos não portado para Fastify.

---

### Pattern: Validação no boundary com Zod ou TypeBox

- **Problema:** `req.body as MyType` passa no compilador mas não valida em runtime — qualquer payload inesperado causa erro 500 obscuro ou corrupção silenciosa.
- **Padrão:** Parse explícito na fronteira antes do domínio. Zod gera tipo TS via `z.infer<typeof Schema>`; TypeBox gera JSON Schema nativo (útil para Fastify e OpenAPI). Standard Schema 1.0 (jan/2025) cobre Zod, Valibot, ArkType e Effect Schema — reduz risco de lock-in.
  ```ts
  // Zod: DX, tipos inferidos, Standard Schema compatível
  const CreateUserBody = z.object({ email: z.string().email(), name: z.string().min(1) });
  type CreateUserInput = z.infer<typeof CreateUserBody>;
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) return problem(res, 422, parsed.error.issues);
  const input: CreateUserInput = parsed.data; // tipo garantido
  ```
- **Quando usar Zod:** DX prioritária, runtime valida + tipos TS, ecossistema massivo (Standard Schema).
- **Quando usar TypeBox:** Fastify schema built-in, OpenAPI generation direta, hot paths de alta frequência (TypeBox+Ajv é mais rápido que Zod para validação pura).
- **Quando usar Valibot:** bundle size crítico (bundle menor que Zod para mesmo schema de login, per research 26cc8f92).

---

### Pattern: tRPC para APIs internas em monorepo TypeScript

- **Problema:** APIs REST internas entre serviços TS exigem manter schema OpenAPI em sincronia com tipos — overhead de codegen para consumers que já são TypeScript.
- **Padrão:** tRPC v11 em monorepos onde client e server são TS e deployados juntos. Type safety end-to-end sem geração de schema; mudança de contrato é um PR que atravessa os pacotes afetados.
- **Quando usar:** monorepo TS, client interno controlado, deploys coordenados.
- **Quando NÃO usar:** client externo ou polyglot (tRPC é TypeScript-only nos dois lados — "not suitable for public APIs", per maintainers); contratos versionados estáveis com SLA explícito; outro time não-TS consome o endpoint.

---

## Anti-padrões

- **Validação ad-hoc com `if (!body.field)`:** campos opcionais mal tipados, sem mensagem de erro estruturada, sem cobertura de tipos aninhados. Correção: schema de boundary (Zod/TypeBox) no início do handler; `safeParse` retorna erros tipados; tipos fluem para baixo via inferência sem cast manual.

- **`req.body as MyType` sem parse:** `as` silencia o compilador mas não valida em runtime — payload inesperado gera 500 com "Cannot read property X of undefined". Correção: `schema.parse(req.body)` ou `schema.safeParse(req.body)` antes de qualquer acesso ao body; em falha, retornar `422` com Problem Details (RFC 9457).

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| API externa, contrato versionado, client polyglot | REST + OpenAPI gerado de Zod/TypeBox |
| Monorepo TS, client interno controlado | tRPC (type-safety sem codegen) |
| Schema validation crítico, OpenAPI automático | Fastify + TypeBox |
| Middleware legado, equipe fluente em Express | Express + Zod no boundary |
| Bundle size crítico (edge, lambdas pequenas) | Valibot (bundle menor) |

## Referências externas

- Skill: `/api-design` — princípios cross-stack: idempotência, REST URL design, pagination cursor, status codes, GraphQL vs REST conceitual, webhooks, Problem Details RFC 9457
- Research: `26cc8f92` — `claude-code/knowledge/Nodejs/compass_artifact_wf-26cc8f92-38dd-42cc-90e8-1610235e9a71_text_markdown.md`
- Skill: `nodejs-backend-patterns/SKILL.md` — `claude-code/knowledge/Nodejs/nodejs-backend-patterns/SKILL.md`
