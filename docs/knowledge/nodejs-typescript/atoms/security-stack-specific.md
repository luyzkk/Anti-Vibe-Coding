---
topic: security-stack-specific
stack: nodejs-typescript
layer: backend
sources:
  - research: security-guide
  - skill: nodejs-core/rules/primordials.md
tier: 2
triggers: [prototype pollution, npm audit, dotenv, env, primordials, supply chain, helmet]
related_skills: [/security]
updated: 2026-05-16
---

# Security — Node.js + TypeScript stack-specific

## Quando consultar

- Parsear ou fazer deep-merge de JSON externo (risco de prototype pollution).
- Ler `process.env` em múltiplos arquivos do projeto ou configurar headers HTTP de defesa.
- Comparar tokens/API keys ou configurar CI para bloquear dependências vulneráveis.

## Padrões sênior

### Pattern: Defesa contra prototype pollution (RF8/D12 — primordials)

- **Problema:** `__proto__`/`constructor` injetados via JSON ou deep-merge corrompem `Object.prototype`. `lodash.merge({}, JSON.parse('{"__proto__":{"x":1}}'))` → `{}.x === 1`.
- **Padrão — 3 opções:**
  ```ts
  // 1. Object.create(null): sem prototype chain
  const map = Object.create(null) as Record<string, unknown>;
  // 2. Filtrar keys perigosas no reviver
  JSON.parse(input, (k, v) =>
    ['__proto__', 'constructor', 'prototype'].includes(k) ? undefined : v);
  // 3. Lib segura por design
  import { defu } from 'defu'; // deepmerge-ts >=7 também
  const merged = defu(userInput, defaults);
  ```
  **Primordials (Node core — audit trail RF8/D12):** `lib/internal/` usa `SafeMap`/`SafeSet` (null-prototype) e destrói de `primordials`; inaplicável a código de aplicação (fonte: `nodejs-core/rules/primordials.md`). Flag: `node --disable-proto=delete server.js`.
- **Quando NÃO usar `Object.create(null)`:** objetos que precisam de prototype chain (instâncias de classe).

### Pattern: Config schema-validada no boot

- **Problema:** `process.env` é `Record<string, string | undefined>`; leitura direta espalha validação e `dotenv` carrega sem validar.
- **Padrão:**
  ```ts
  // config.ts — parse único, falha rápida
  import { z } from 'zod';
  export const config = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
  }).parse(process.env);
  ```
- **Quando NÃO usar:** scripts CLI efêmeros com uma variável — overhead injustificado.

### Pattern: `crypto.timingSafeEqual` para tokens

- **Problema:** `===` encerra no primeiro byte diferente — timing side-channel revela prefixos de HMAC/API key.
- **Padrão:**
  ```ts
  import { timingSafeEqual } from 'node:crypto';
  function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a), bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) { timingSafeEqual(bufA, bufA); return false; }
    return timingSafeEqual(bufA, bufB);
  }
  ```
- **Quando NÃO usar:** comparações não-secretas (`req.method === 'GET'`).

## Anti-padrões

- **`process.env.X` espalhado:** audit vira caça aos fantasmas. Correção: `config.ts` com Zod, importar `config.*` nos módulos.
- **`_.merge` sem allow-list:** `lodash` < 4.17.21 (CVE-2019-10744, CVE-2020-8203). Correção: `defu` / `deepmerge-ts` >= 7.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Map com chaves de input externo | `Object.create(null)` ou `Map` |
| Deep-merge com dados externos | `defu` / `deepmerge-ts` >= 7 |
| Comparar token/HMAC/API key | `crypto.timingSafeEqual` (nunca `===`) |
| `process.env` em múltiplos arquivos | Schema Zod no boot em `config.ts` |
| CI bloquear PR com CVE | `npm audit --omit=dev --audit-level=high` |
| Headers HTTP de defesa | `helmet` / `@fastify/helmet` |

## Referências externas
- Skill: `/security` — OWASP Top 10, JWT/OAuth2, RBAC/ABAC, criptografia (cross-stack; não duplicar aqui)
- Source: `claude-code/knowledge/Nodejs/nodejs-typescript-security-guide.md` (§11, §23, §3.2, §22.1)
- Source: `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` (RF8/D12 — integrado inline; preservado como audit trail)
