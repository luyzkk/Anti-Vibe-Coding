# Python Knowledge — Index
<!-- 2026-08-31 (Luiz/dev): INDEX final consolidado, Plano04 fase-04 — RF1/CA-05/D2 do PRD stack-knowledge-python. H1 na linha 1 de proposito (G18): getStackKnowledgePreface exige startsWith('# '). -->

Knowledge sênior Python-native (Python 3.11+, foco 3.13), em 18 átomos. Linguagem, typing, testes,
tooling, debugging e performance servem qualquer projeto Python; **os padrões web são FastAPI-native**
— Django/Flask aproveitam os de linguagem, não os de web. Consumido via `getStackKnowledgePreface()`.

---

## Por Skill Cross-Stack

### Para /security
- **security-fastapi-owasp** (T1) — injeção, JWT, argon2id, CSRF, XSS, CORS, SecretStr, código de IA
- **dependencies-and-packaging-uv** (T2) — supply chain, dependency confusion, slopsquatting, SBOM
- **errors-logging-observability** (T1) — vazamento de PII em log e serialização

### Para /api-design
- **api-design-and-contracts** (T2) — REST, versionamento, paginação, idempotência, RFC 9457, ETag
- **security-fastapi-owasp** (T1) — auth como dependency, validação de JWT, rate limiting
- **graphql-grpc-contracts** (T3) — GraphQL/Strawberry, gRPC/Protobuf, evolução de contrato

### Para /system-design
- **async-and-concurrency** (T1) — event loop, GIL, TaskGroup, pooling, backpressure, cancellation
- **sqlalchemy-async-and-orm** (T2) — sessão async, N+1, pool, deadlock, RLS, read replica
- **performance-and-profiling** (T2) — profiling, memória, GC, cache stampede, sizing por benchmark

### Para /design-patterns
- **python-idioms-and-antipatterns** (T1) — EAFP, default mutável, Protocol vs ABC, frozen, PEP 695
- **code-smells-and-refactoring** (T2) — fat route, on_event→lifespan, strangler fig, complexidade
- **errors-logging-observability** (T1) — AppError, raise from, structlog, retry, circuit breaker

### Para /architecture
- **architecture-and-di-fastapi** (T2) — camadas, DI com Annotated, repository/UoW, import-linter, ADR
- **typing-and-static-analysis** (T1) — mypy strict, TypeIs vs TypeGuard, NewType, Protocol, variance
- **migrations-and-schema-evolution** (T2) — Alembic, expand/contract, backfill, constraints

### Para /infrastructure
- **deployment-and-production** (T2) — uvicorn workers, Docker, graceful shutdown, health check, rollback
- **dependencies-and-packaging-uv** (T2) — uv, lockfile com hash, pinning, Trusted Publishing

### Para /tdd-workflow
- **pytest-and-testing-strategy** (T1) — fixtures, AsyncClient, dependency_overrides, smells de IA
- **debugging-pdb-debugpy** (T3) — pytest `--pdb`/`--trace`, post-mortem de teste
- **tooling-ruff-mypy-precommit** (T2) — Ruff, pre-commit, deptry, branch coverage

---

## Por Tier

### Tier 1 — Todo Python dev sênior precisa (6 átomos)
- `async-and-concurrency` — event loop, TaskGroup, GIL, threadpool, cancellation, backpressure
- `python-idioms-and-antipatterns` — EAFP, defaults mutáveis, Protocol, frozen, metaclasses, PEP 695
- `typing-and-static-analysis` — mypy strict, TypeIs, NewType, discriminated unions, variance, dmypy
- `errors-logging-observability` — AppError, ExceptionGroup, structlog, correlation id, RFC 9457
- `pytest-and-testing-strategy` — fixtures, factories, respx, testcontainers, mutation, test smells
- `security-fastapi-owasp` — OWASP, injeção, JWT, senhas, sessão, CORS, upload, SSRF, slopsquatting

### Tier 2 — Comum em apps de médio porte (9 átomos)
- `architecture-and-di-fastapi` — pastas por domínio, camadas, DI, repository/UoW, enforcement, ADR
- `api-design-and-contracts` — REST, evolução aditiva, cursor, idempotência, webhooks, OpenAPI
- `sqlalchemy-async-and-orm` — AsyncSession, MissingGreenlet, selectinload, pool, RLS, JSONB
- `migrations-and-schema-evolution` — Alembic, zero downtime, CONCURRENTLY, backfill, constraints
- `dependencies-and-packaging-uv` — uv, PEP 621/751/735, lockfile, pip-audit, SBOM, workspaces
- `tooling-ruff-mypy-precommit` — Ruff select, B008, pre-commit, deptry, coverage, Vulture
- `code-smells-and-refactoring` — smells async, refatorações canônicas, strangler fig, radon/xenon
- `deployment-and-production` — uvicorn/gunicorn, Docker, SIGTERM, blue-green, health, 12-factor
- `performance-and-profiling` — py-spy, tracemalloc, gc.freeze, orjson, cache stampede, sizing

### Tier 3 — Niche / opcional (3 átomos)
- `background-jobs-and-queues` — BackgroundTasks, Celery/arq/TaskIQ, DLQ, poison message, cron
- `debugging-pdb-debugpy` — pdb, PYTHONBREAKPOINT, post-mortem, debugpy DAP, remote-pdb
- `graphql-grpc-contracts` — Strawberry, DataLoader, Protobuf, deadlines, tRPC

---

## Por keyword

| Keyword | Átomos |
|---|---|
| asyncio, TaskGroup, GIL | [async-and-concurrency](./atoms/async-and-concurrency.md) |
| pytest, fixture, mock | [pytest-and-testing-strategy](./atoms/pytest-and-testing-strategy.md) |
| SQLAlchemy, ORM, N+1 | [sqlalchemy-async-and-orm](./atoms/sqlalchemy-async-and-orm.md) |
| Ruff, mypy, pre-commit | [tooling-ruff-mypy-precommit](./atoms/tooling-ruff-mypy-precommit.md) |
| uv, pyproject, lockfile, SBOM | [dependencies-and-packaging-uv](./atoms/dependencies-and-packaging-uv.md) |
| FastAPI, Depends, Annotated, camadas | [architecture-and-di-fastapi](./atoms/architecture-and-di-fastapi.md) |
| Alembic, migration, zero downtime, backfill | [migrations-and-schema-evolution](./atoms/migrations-and-schema-evolution.md) |
| OWASP, JWT, injeção, argon2, CORS | [security-fastapi-owasp](./atoms/security-fastapi-owasp.md) |
| EAFP, Protocol, dataclass, PEP 695 | [python-idioms-and-antipatterns](./atoms/python-idioms-and-antipatterns.md) |
| tipagem, TypeIs, TypeGuard, NewType, variance | [typing-and-static-analysis](./atoms/typing-and-static-analysis.md) |
| exceção, structlog, correlation id, retry, RFC 9457 | [errors-logging-observability](./atoms/errors-logging-observability.md) |
| REST, versionamento, paginação, idempotência, webhook | [api-design-and-contracts](./atoms/api-design-and-contracts.md) |
| profiling, py-spy, tracemalloc, cache stampede | [performance-and-profiling](./atoms/performance-and-profiling.md) |
| deploy, Docker, uvicorn, graceful shutdown, health check | [deployment-and-production](./atoms/deployment-and-production.md) |
| code smell, refactoring, lifespan, strangler fig | [code-smells-and-refactoring](./atoms/code-smells-and-refactoring.md) |
| fila, Celery, DLQ, BackgroundTasks, cron | [background-jobs-and-queues](./atoms/background-jobs-and-queues.md) |
| pdb, breakpoint, debugpy, post-mortem | [debugging-pdb-debugpy](./atoms/debugging-pdb-debugpy.md) |
| GraphQL, Strawberry, gRPC, Protobuf, DataLoader | [graphql-grpc-contracts](./atoms/graphql-grpc-contracts.md) |

Padrões 3.13-exclusivos (TypeIs, free-threading, JIT) marcados com `python_versions: ['>=3.13']` no átomo.
