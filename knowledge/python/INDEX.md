<!-- 2026-08-30 (Luiz/dev): INDEX skeleton Plano01 fase-01 — RF1/D2 do PRD stack-knowledge-python. Consolidação final: Plano 04 fase-04. -->

# Python Knowledge — Index

Knowledge sênior Python-native (Python 3.11+, foco 3.13). Átomos de linguagem, typing, testes,
tooling e performance servem qualquer projeto Python; **os padrões web são FastAPI-native** —
projetos Django/Flask aproveitam os átomos de linguagem, mas os de web assumem FastAPI.
Skills cross-stack consomem este INDEX via `getStackKnowledgePreface()` antes do corpo genérico.

---

## Por Skill Cross-Stack

### Para /security

### Para /api-design

### Para /system-design
- **async-and-concurrency** (T1) — event loop, GIL, free-threading, pooling de conexões, workers, backpressure

### Para /design-patterns
- **async-and-concurrency** (T1) — TaskGroup vs gather, contextvars, cancellation, idempotência de jobs

### Para /architecture
- **async-and-concurrency** (T1) — structured concurrency, boundaries async/sync, escolha de fila e scheduler

### Para /infrastructure

### Para /tdd-workflow

---

## Por Tier

### Tier 1 — Todo Python dev sênior precisa
- `async-and-concurrency` — event loop, TaskGroup, GIL, threadpool, cancellation, backpressure

### Tier 2 — Comum em apps de médio porte

### Tier 3 — Niche / opcional

---

## Por keyword

| Keyword | Átomos |
|---|---|
| asyncio, TaskGroup, GIL, free-threading, contextvars, backpressure | [async-and-concurrency](./atoms/async-and-concurrency.md) |

Cobertura Python 3.11+/3.13. Padrões 3.13-exclusivos marcados com `python_versions: ['>=3.13']`
no frontmatter do átomo (TypeIs, free-threading, JIT).
