# Node.js + TypeScript — Senior Knowledge Index

> 14 átomos condensando padrões sênior stack-specific Node+TS.
> Cada átomo complementa (não substitui) as skills cross-stack do plugin Anti-Vibe Coding.

## Por keyword

| Keyword | Átomos |
|---|---|
| type, generic, branded, discriminated, satisfies, ESM, CJS | [type-system-idioms](./atoms/type-system-idioms.md) |
| event loop, promise, async, worker, stream, backpressure, AbortController | [async-concurrency-streams](./atoms/async-concurrency-streams.md), [performance-and-internals](./atoms/performance-and-internals.md) |
| error, exception, Result, Pino, telemetry, log, correlation, OTel, LGPD | [error-handling-observability](./atoms/error-handling-observability.md) |
| cache, Redis, AsyncLocalStorage, request-scoped, invalidation, singleflight, stampede | [state-and-caching](./atoms/state-and-caching.md) |
| Prisma, Drizzle, Kysely, N+1, migration, RLS, multi-tenant, pgBouncer, transaction | [data-persistence](./atoms/data-persistence.md) |
| fastify, express, zod, typebox, trpc, openapi, validation | [api-design-stack-specific](./atoms/api-design-stack-specific.md) |
| vitest, jest, node:test, mock, fast-check, pact, stryker, mutation testing | [testing-strategy](./atoms/testing-strategy.md) |
| prototype pollution, npm audit, dotenv, env, primordials, helmet | [security-stack-specific](./atoms/security-stack-specific.md), [dependencies-supply-chain](./atoms/dependencies-supply-chain.md) |
| code smell, refactor, any, enum, await, fire-and-forget, god module | [code-smells-catalog](./atoms/code-smells-catalog.md) |
| layered, modular, DI, ports, adapters, monorepo, conventions | [architecture-conventions](./atoms/architecture-conventions.md) |
| pm2, systemd, docker, cluster, graceful shutdown, health check, 12-factor, zod-config | [operations-and-deploy](./atoms/operations-and-deploy.md) |
| v8, gc, hidden classes, jit, memory leak, profiling, clinic, 0x, UV_THREADPOOL_SIZE | [performance-and-internals](./atoms/performance-and-internals.md) |
| biome, eslint, prettier, tsconfig, strict, husky, lint-staged, knip, sast, semgrep | [tooling](./atoms/tooling.md) |
| lockfile, pnpm, workspaces, SBOM, CycloneDX, supply chain, license | [dependencies-supply-chain](./atoms/dependencies-supply-chain.md) |

## Por layer

**Backend-only:** [data-persistence](./atoms/data-persistence.md), [api-design-stack-specific](./atoms/api-design-stack-specific.md), [security-stack-specific](./atoms/security-stack-specific.md), [performance-and-internals](./atoms/performance-and-internals.md), [operations-and-deploy](./atoms/operations-and-deploy.md), [architecture-conventions](./atoms/architecture-conventions.md), [dependencies-supply-chain](./atoms/dependencies-supply-chain.md)

**Both (backend + frontend):** [async-concurrency-streams](./atoms/async-concurrency-streams.md), [type-system-idioms](./atoms/type-system-idioms.md), [error-handling-observability](./atoms/error-handling-observability.md), [state-and-caching](./atoms/state-and-caching.md), [testing-strategy](./atoms/testing-strategy.md), [code-smells-catalog](./atoms/code-smells-catalog.md), [tooling](./atoms/tooling.md)

**Frontend-only:** — (nenhum átomo é exclusivamente frontend nesta versão)

## Por tier

**Tier 1 — must-know (sempre vale consultar em projeto Node+TS):**
- [async-concurrency-streams](./atoms/async-concurrency-streams.md)
- [type-system-idioms](./atoms/type-system-idioms.md)
- [error-handling-observability](./atoms/error-handling-observability.md)

**Tier 2 — context-dependent (consultar quando keyword bate):**
- [state-and-caching](./atoms/state-and-caching.md)
- [data-persistence](./atoms/data-persistence.md)
- [api-design-stack-specific](./atoms/api-design-stack-specific.md)
- [testing-strategy](./atoms/testing-strategy.md)
- [security-stack-specific](./atoms/security-stack-specific.md)
- [code-smells-catalog](./atoms/code-smells-catalog.md)
- [architecture-conventions](./atoms/architecture-conventions.md)
- [dependencies-supply-chain](./atoms/dependencies-supply-chain.md)

**Tier 3 — deep dive (consultar quando o problema exige):**
- [performance-and-internals](./atoms/performance-and-internals.md)
- [operations-and-deploy](./atoms/operations-and-deploy.md)
- [tooling](./atoms/tooling.md)

## Como consultar

1. Identifique a keyword da query (ou conceito principal da skill cross-stack ativada).
2. Bata contra "Por keyword" — se 1 átomo, abrir direto; se múltiplos, decidir por `layer`.
3. Query genérica de senior Node+TS sem keyword óbvia: comece pelos 3 tier-1 — cobrem ~80% das decisões diárias.
4. Skills cross-stack (`/security`, `/api-design`, etc.) recebem este INDEX via preface — citar o átomo relevante antes do corpo genérico.
5. Cada átomo tem `related_skills:` no frontmatter — ao terminar, considerar invocar a skill relacionada para princípios cross-stack.
