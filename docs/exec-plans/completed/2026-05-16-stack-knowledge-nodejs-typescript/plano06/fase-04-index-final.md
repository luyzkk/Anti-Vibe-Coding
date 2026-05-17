<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
O INDEX é gerado por agregação manual (ou script auxiliar local) dos frontmatters dos 14 átomos.
-->

# Fase 04: INDEX.md final consolidado (mapas por keyword, layer, tier)

**Plano:** 06 — Atom Batch C + INDEX + Polish
**Sizing:** 1.5-2h
**Depende de:** fase-01, fase-02, fase-03 deste plano (3 átomos tier 3) + Plano 04 fase-01..05 (5 átomos Batch A) + Plano 05 fase-01..05 (5 átomos Batch B) + Plano 01 fase-02 (piloto) = 14 átomos populados
**Visual:** false

---

## O que esta fase entrega

Substitui o INDEX skeleton criado em `docs/knowledge/nodejs-typescript/INDEX.md` (Plano 01 fase-01) pelo INDEX final consolidado: mapa de keywords (cada keyword aponta para 1+ átomos via `triggers:` agregados dos 14 átomos), mapa por layer (backend/frontend/both), mapa por tier (1/2/3), seção "Como consultar" orientando a skill cross-stack como decidir qual átomo abrir. Cap ≤100 linhas (NFR Manutenibilidade do PRD). Saída deve ser navegável pelo agente em <1s e por humano em <30s.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/INDEX.md` | Modify | Substitui completamente o skeleton do Plano 01 pelo INDEX final consolidado (~80-100 linhas) |
| `docs/knowledge/nodejs-typescript/atoms/*.md` | Read | Lê frontmatter dos 14 átomos para agregar triggers/layer/tier |

---

## Implementacao

### Passo 1: Verificar inventário de átomos (G7 do plano — cobertura de 14, não 13 nem 15)

```bash
ls docs/knowledge/nodejs-typescript/atoms/*.md | wc -l
# Esperado: 14
```

Listar nominalmente para conferência (14 esperados — sequência canônica do `_topic-plan.md` §"Lista final proposta"):

1. `async-concurrency-streams.md` (Plano 04 fase-01, tier 1, both)
2. `type-system-idioms.md` (Plano 01 fase-02 piloto, tier 1, both)
3. `error-handling-observability.md` (Plano 04 fase-02, tier 1, both)
4. `state-and-caching.md` (Plano 04 fase-04, tier 2, both)
5. `data-persistence.md` (Plano 04 fase-03, tier 2, backend)
6. `api-design-stack-specific.md` (Plano 05 fase-01, tier 2 thin, backend)
7. `testing-strategy.md` (Plano 05 fase-03, tier 2, both)
8. `performance-and-internals.md` (deste plano fase-01, tier 3, backend)
9. `security-stack-specific.md` (Plano 05 fase-02, tier 2 thin, backend)
10. `code-smells-catalog.md` (Plano 04 fase-05, tier 2, both)
11. `architecture-conventions.md` (Plano 05 fase-04, tier 2, both)
12. `operations-and-deploy.md` (deste plano fase-02, tier 3, backend)
13. `tooling.md` (deste plano fase-03, tier 3, both)
14. `dependencies-supply-chain.md` (Plano 05 fase-05, tier 2, both)

Se o count diferir de 14, **parar imediatamente** — sinal de átomo faltando (regressão de algum plano anterior) ou átomo fantasma (ex: alguém criou `primordials.md` em vez de migrar inline em security-stack-specific.md). Resolver antes de continuar.

### Passo 2: Extrair frontmatter de cada átomo (Read em paralelo)

Para cada um dos 14 átomos, ler o frontmatter e extrair:
- `topic` (slug do átomo)
- `layer` (backend | frontend | both)
- `tier` (1 | 2 | 3)
- `triggers` (lista de keywords)
- `related_skills` (lista de skills citadas)

Recomendação: agregar em estrutura mental (ou tabela temp em scratch) para facilitar agrupamento no Passo 3-5.

### Passo 3: Gerar mapa por keyword (deduplicar, agrupar por átomo)

Cada keyword aponta para 1+ átomos. Quando keyword aparece em múltiplos átomos, listar todos (separados por vírgula) para que o agente saiba escolher.

Formato esperado (compactado para caber em ≤100 linhas total):

```markdown
## Por keyword

| Keyword | Átomos |
|---|---|
| event loop, promise, async, worker, stream, backpressure | [async-concurrency-streams](./atoms/async-concurrency-streams.md), [performance-and-internals](./atoms/performance-and-internals.md) |
| type, generic, branded, discriminated, satisfies, esm, cjs | [type-system-idioms](./atoms/type-system-idioms.md) |
| error, exception, result, pino, telemetry, log, observability | [error-handling-observability](./atoms/error-handling-observability.md) |
| cache, redis, in-memory, request-scoped, asynclocalstorage | [state-and-caching](./atoms/state-and-caching.md) |
| prisma, drizzle, kysely, n+1, rls, multi-tenant, migration | [data-persistence](./atoms/data-persistence.md) |
| fastify, express, zod, typebox, trpc, openapi, rest, graphql | [api-design-stack-specific](./atoms/api-design-stack-specific.md) |
| vitest, jest, node:test, mock, fast-check, pact, stryker | [testing-strategy](./atoms/testing-strategy.md) |
| v8, gc, hidden classes, jit, profiling, clinic, 0x, native memory | [performance-and-internals](./atoms/performance-and-internals.md) |
| prototype pollution, npm audit, dotenv, schema-config, primordials | [security-stack-specific](./atoms/security-stack-specific.md) |
| code smell, refactor, anti-pattern, type smell, async smell | [code-smells-catalog](./atoms/code-smells-catalog.md) |
| architecture, layered, modular, vertical slice, dependency injection | [architecture-conventions](./atoms/architecture-conventions.md) |
| pm2, systemd, docker, cluster, graceful shutdown, 12-factor, health check | [operations-and-deploy](./atoms/operations-and-deploy.md) |
| tsc, tsx, bun, esbuild, biome, eslint, pnpm, turborepo, nx, watch mode | [tooling](./atoms/tooling.md) |
| lockfile, workspace, audit, sbom, license, supply chain | [dependencies-supply-chain](./atoms/dependencies-supply-chain.md) |
```

**Importante:** os triggers exatos vêm do frontmatter de cada átomo (Passo 2) — esta tabela é exemplo do formato, não da agregação final. Cada átomo pode trazer keywords adicionais; consolidar todas, dedupar, agrupar.

### Passo 4: Gerar mapa por layer (backend/frontend/both)

```markdown
## Por layer

**Backend-only:** data-persistence, api-design-stack-specific, security-stack-specific, performance-and-internals, operations-and-deploy

**Both (backend + frontend):** async-concurrency-streams, type-system-idioms, error-handling-observability, state-and-caching, testing-strategy, code-smells-catalog, architecture-conventions, tooling, dependencies-supply-chain

**Frontend-only:** — (nenhum átomo é exclusivamente frontend nesta versão — frontend-heavy fica para v6.3.3+ se houver demanda)
```

### Passo 5: Gerar mapa por tier (1/2/3)

```markdown
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
```

### Passo 6: Seção "Como consultar" (orientação para a skill cross-stack)

Bloco curto (5-10 linhas) explicando a heurística que a skill cross-stack deve seguir:

```markdown
## Como consultar

1. Identifique a keyword da query do dev (ou conceito principal da skill cross-stack ativada).
2. Bata contra a tabela "Por keyword" — se 1 átomo, abrir direto; se múltiplos, decidir por `layer` (a query é sobre backend, frontend, ou ambos?).
3. Se a query é genérica de senior Node+TS sem keyword óbvia, comece pelos 3 tier-1 (`type-system-idioms`, `error-handling-observability`, `async-concurrency-streams`) — cobrem ~80% das decisões diárias.
4. Skills cross-stack (`/security`, `/api-design`, etc.) recebem este INDEX via preface — devem citar o átomo relevante antes do corpo genérico.
5. Cada átomo tem `related_skills:` no frontmatter — ao terminar de ler o átomo, considerar invocar a skill relacionada para princípios cross-stack.
```

### Passo 7: Montar INDEX completo (cap ≤100 linhas)

Estrutura final do arquivo:

```markdown
# Node.js + TypeScript — Senior Knowledge Index

> 14 átomos condensando ~27.000 linhas de pesquisa Node+TS em padrões sênior stack-specific.
> Cada átomo complementa (não substitui) as skills cross-stack do plugin Anti-Vibe Coding.

[seção Por keyword — Passo 3]

[seção Por layer — Passo 4]

[seção Por tier — Passo 5]

[seção Como consultar — Passo 6]
```

**Conferir `wc -l INDEX.md ≤ 100`** ao terminar. Se passar, condensar a tabela de keywords (agrupar keywords muito específicas em "etc." apontando para um átomo) ou remover bullets redundantes em "Como consultar".

### Passo 8: Validar que cada átomo aparece em pelo menos uma seção (não-órfão)

```bash
# Cada átomo deve ser referenciado em alguma seção do INDEX (keyword OU layer OU tier)
for atom in docs/knowledge/nodejs-typescript/atoms/*.md; do
  slug=$(basename "$atom" .md)
  if ! grep -q "$slug" docs/knowledge/nodejs-typescript/INDEX.md; then
    echo "ORFAO: $slug não está referenciado no INDEX.md"
  fi
done
```

Se algum átomo não aparece (órfão), revisitar Passo 3-5 e adicionar.

### Passo 9: Validar que nenhuma keyword no INDEX aponta para arquivo inexistente

```bash
# Cada link [nome](./atoms/X.md) no INDEX deve apontar para arquivo que existe
grep -oE '\.\./atoms/[a-z-]+\.md|\./atoms/[a-z-]+\.md' docs/knowledge/nodejs-typescript/INDEX.md | sort -u | while read path; do
  resolved="docs/knowledge/nodejs-typescript/${path#./}"
  if ! [ -f "$resolved" ]; then
    echo "LINK QUEBRADO: $path"
  fi
done
```

---

## Gotchas

- **G7 do plano (cobertura exata de 14 átomos):** se `ls atoms/*.md | wc -l` ≠ 14, parar e investigar. 13 = átomo faltando; 15 = átomo fantasma (ex: alguém criou primordials.md em vez de migrar inline em security-stack-specific.md). NÃO seguir com INDEX se contagem errada.
- **G1 do plano (zero drift de formato):** frontmatter dos 14 átomos deve ter os mesmos 8 campos na mesma ordem. Se Passo 2 detectar drift de frontmatter (ex: átomo sem `triggers:` ou com `keywords:` em vez), abrir retrabalho no plano correspondente antes de gerar INDEX — agregação de triggers depende dessa consistência.
- **Local — cap de 100 linhas é apertado para 14 átomos:** uma linha por keyword + 3 seções por layer + 14 linhas por tier já passa de 60. Restante é overhead (header + "Como consultar" + tabela de keywords). Otimização: na tabela "Por keyword", **agrupar keywords cognatas em uma linha por átomo** (ex: "fastify, express, zod, typebox, trpc, openapi, rest, graphql" tudo numa linha para `api-design-stack-specific`).
- **Local — INDEX é consumido pela skill cross-stack via `stack-aware-preface` (path fixo `.claude/knowledge/INDEX.md`):** estrutura precisa ser parseável por agente sem regex complexa. Manter formatação consistente (tabelas markdown, bullets, sem ASCII art) — agente entende markdown nativo.
- **Local — keywords são case-sensitive no agente? Não — markdown não impõe case, mas tabela usa lowercase por consistência.** Triggers no frontmatter de cada átomo também são lowercase (per convenção do piloto). Se algum átomo trouxer trigger em CamelCase ou MAIÚSCULO, normalizar para lowercase no INDEX (e abrir issue para corrigir no átomo de origem em iteração futura — fora de escopo desta fase).
- **Local — frontend-only vazio em v6.3.2 é esperado:** confirmar com `_topic-plan.md` §"Lista final proposta" — nenhum dos 14 átomos é exclusivamente frontend nesta versão. Manter a linha "**Frontend-only:** — (nenhum...)" para explicitar; futuro PRD pode adicionar átomos React/Vue/Svelte específicos.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é geração/agregação de INDEX, não código de runtime.

### Checklist

- [ ] `ls docs/knowledge/nodejs-typescript/atoms/*.md | wc -l` retorna exatamente 14 (G7)
- [ ] Os 14 átomos estão nomeados conforme `_topic-plan.md` (sem typo, sem átomo extra)
- [ ] Cada átomo tem `triggers:` no frontmatter (zero átomo sem keywords)
- [ ] INDEX.md tem seção "Por keyword" cobrindo triggers agregados dos 14
- [ ] INDEX.md tem seção "Por layer" com 3 buckets (Backend-only / Both / Frontend-only — pode ser vazio)
- [ ] INDEX.md tem seção "Por tier" com 3 buckets (Tier 1 / Tier 2 / Tier 3)
- [ ] INDEX.md tem seção "Como consultar" (5-10 linhas de orientação)
- [ ] Cada um dos 14 átomos é referenciado em **pelo menos uma** seção (não-órfão — Passo 8)
- [ ] Cada link `./atoms/X.md` no INDEX aponta para arquivo que existe (Passo 9)
- [ ] `wc -l docs/knowledge/nodejs-typescript/INDEX.md` retorna ≤ 100 (NFR Manutenibilidade)
- [ ] `bun run harness:validate` verde com o novo INDEX

---

## Criterio de Aceite

**Por maquina:**
- `wc -l docs/knowledge/nodejs-typescript/INDEX.md | awk '{print $1}'` retorna valor ≤ 100
- `ls docs/knowledge/nodejs-typescript/atoms/*.md | wc -l` retorna exatamente 14
- Para cada um dos 14 átomos, `grep -c "$(basename atom .md)" docs/knowledge/nodejs-typescript/INDEX.md` retorna ≥1
- `grep -oE '\./atoms/[a-z-]+\.md' docs/knowledge/nodejs-typescript/INDEX.md | sort -u | while read p; do test -f "docs/knowledge/nodejs-typescript/${p#./}" || echo "$p missing"; done` retorna vazio (nenhum link quebrado)
- INDEX.md contém pelo menos as 3 seções: `## Por keyword`, `## Por layer`, `## Por tier`, `## Como consultar` (4 headers H2)
- `bun run harness:validate` exit 0

**Por humano:**
- INDEX lê como mapa navegável em <30s
- Skill cross-stack consegue decidir qual átomo abrir lendo apenas o INDEX (a tabela "Por keyword" é parse-friendly)
- Nenhum trigger no INDEX é tão genérico que não ajuda a decidir ("javascript" não conta; "event loop" conta)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
