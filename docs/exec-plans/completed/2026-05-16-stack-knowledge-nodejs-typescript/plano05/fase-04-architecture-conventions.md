<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 04: Átomo `architecture-conventions.md`

**Plano:** 05 — Atom Batch B
**Sizing:** 1.5-2h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 2 full `docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md` (~130 linhas), condensando 112 regras de arquitetura para AI agents em Node+TS (de `3f1af213`, 1712 linhas) + princípios decisivos dos skill packages `nodejs-best-practices` e `nodejs-backend-patterns`. Foca em ~8-12 patterns acionáveis: layered vs modular, DI patterns (constructor + token), boundary types, módulos coesos, ports & adapters quando justifica, e quando NÃO virar Clean Architecture ritual. Cobre o ângulo Node+TS-específico; `/architecture` cobre SOLID, monolith vs microservices, ADRs e princípios cross-stack.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~130 linhas) |

---

## Implementacao

### Passo 1: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: architecture-conventions
stack: nodejs-typescript
layer: backend
sources:
  - research: 3f1af213
  - skill: nodejs-best-practices/SKILL.md
  - skill: nodejs-backend-patterns/SKILL.md
tier: 2
triggers: [layered, modular, dependency injection, DI, ports, adapters, monorepo, conventions]
related_skills: [/architecture]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `3f1af213` — Architecture Conventions (1712 linhas, 112 regras para AI agents em Node+TS)
- `nodejs-best-practices/SKILL.md` — princípios de decisão (framework, runtime, async, security, deploy)
- `nodejs-backend-patterns/SKILL.md` — Express/Fastify, middleware, auth, DB, cache (versão Feb 2026)

### Passo 2: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (verbatim com piloto):

1. `# Architecture Conventions — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets de cenários
3. `## Padrões sênior` — 5-7 patterns condensados (não 112 — selecionar os mais decisivos)
4. `## Anti-padrões` — 2-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skill `/architecture` + paths das fontes

### Passo 3: Conteúdo nuclear esperado (guia editorial — executor expande)

Patterns recomendados (mínimo 5, máximo 7 — condensar 112 regras em ~8-12 decisões, escolher as mais transversais):

- **Pattern: Layered (Express clássico) vs Modular (Fastify plugins / NestJS modules) vs Vertical slices** — layered (controller → service → repo) é didático mas resvala em "anemic models"; modular agrupa por feature em torno de plugins/módulos; vertical slice = um caso de uso por pasta. Quando usar layered: time pequeno, lógica simples. Quando usar modular: serviço com 5+ contextos de negócio. Quando usar vertical slice: monorepo CQRS-leve, time grande.
- **Pattern: DI via constructor + token de interface** — `class Service { constructor(private deps: { repo: UserRepo; clock: Clock }) {} }`. Padrão evita container heavyweight (InversifyJS, tsyringe) quando não justifica. Quando usar DI lib: 50+ services, lifecycle scoping. Quando NÃO usar: serviço pequeno — fábricas simples bastam.
- **Pattern: Boundary types (DTO no edge, domain no core)** — DTO (zod-parsed input do request) vs Domain (tipo interno). Mapear no boundary, nunca passar DTO para o domínio. Quando usar: API pública com schema externo. Quando NÃO usar: lib interna sem boundary externo.
- **Pattern: Módulos coesos com `index.ts` como API pública** — `import { X } from './module'` em vez de `from './module/internal/file'`. Padrão: `index.ts` reexporta só o public surface; vizinhos batem na porta da frente. Quando usar: módulos com >5 arquivos. Quando NÃO usar: módulo de 1-2 arquivos (overhead).
- **Pattern: Ports & adapters quando há 2+ implementações** — repo em PG + repo in-memory (testes) + repo fake (dev local). Padrão: interface `UserRepo`, 2-3 impls. Quando usar: testabilidade real importa. Quando NÃO usar: 1 impl única — interface vira ruído.
- **Pattern: Errors as values (Result<Ok, Err>) no domínio + throw no boundary** — domain retorna `Result`, controller decide HTTP status. Padrão evita throw espalhado. Quando NÃO usar: erros raros e excepcionais (DB down) — throw + Express error middleware é mais natural.
- **Pattern: Monorepo com workspaces (npm/pnpm/bun workspaces ou Nx/Turborepo)** — quando 2+ apps compartilham types/utils. Quando usar pnpm workspaces puros: monorepo simples (2-3 packages). Quando usar Turborepo/Nx: 10+ packages, build cache distribuído crítico.

### Passo 4: Anti-padrões (2-4 armadilhas com correção)

- **Clean Architecture "ritual" em service CRUD trivial** — 4 camadas, mapper duplo (entity→dto→viewmodel) em endpoint de 1 query. Correção: começar layered simples; só virar Clean quando >3 inversões reais aparecem.
- **DI container global injetando tudo via decorator** — runtime DI obscuro, hard to trace, lento em cold start. Correção: constructor injection + fábrica composição-root no entrypoint.
- **`barrel files` (index.ts) reexportando tudo recursivamente** — bundler não tree-shakea, cold start cresce, circular imports aparecem. Correção: barrels apenas no nível do módulo (1 nível), não recursivo.
- **God service de 800 linhas** — `UserService` faz auth + billing + email + notification. Correção: split por contexto de negócio (BillingService, NotificationService), não por nome do entity.

### Passo 5: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Service CRUD pequeno, 1-3 entidades | Layered (controller → service → repo) |
| Serviço com 5+ contextos de negócio | Modular (Fastify plugins ou NestJS modules) |
| Time grande, CQRS-leve | Vertical slice (1 caso de uso por pasta) |
| 50+ services com lifecycle scoping | DI container (tsyringe, InversifyJS) |
| Pequeno-médio | Constructor injection (sem container) |
| 2+ impls de repo (PG + in-memory) | Ports & adapters |
| 2-3 packages compartilhando types | pnpm/npm workspaces (sem build tool extra) |
| 10+ packages, build cache | Turborepo ou Nx |

### Passo 6: Referências externas

- Skill: `/architecture` para SOLID, monolith vs microservices, CQRS, event sourcing, ADRs, Law of Demeter, Tell-Don't-Ask, composition vs inheritance — princípios cross-stack
- Source: `claude-code/knowledge/Nodejs/wf-3f1af213.md` (112 regras — selecionar as mais decisivas para AI agent guidance)
- Source: `claude-code/knowledge/Nodejs/nodejs-best-practices/SKILL.md`
- Source: `claude-code/knowledge/Nodejs/nodejs-backend-patterns/SKILL.md`

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md
```

Resultado esperado: entre 110 e 150 linhas. Alvo: ~130 (per `_topic-plan.md:63`).

---

## Gotchas

- **G1 do plano:** frontmatter verbatim com piloto (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`). Qualquer drift invalida CA-01.
- **G2 do plano:** cap de 200 linhas. 112 regras → 8-12 patterns é compressão de ~10×; resistir a listar regras como bullets soltos. Faixa saudável: 110-150 linhas.
- **G5 do plano (overlap com `/architecture`):** resistir a explicar SOLID, monolith vs microservices, CQRS conceitual, ADR, composition vs inheritance — esses estão em `/architecture`. Aqui é **stack-specific**: convention Fastify plugin vs NestJS module, Turborepo vs pnpm workspaces, DI sem container heavy.
- **G6 do plano:** frontmatter `sources:` lista compass-id (`3f1af213`) + skill paths (`nodejs-best-practices/SKILL.md`, `nodejs-backend-patterns/SKILL.md`). Sem caminho absoluto. Caminho absoluto vai em "Referências externas" no corpo.
- **Local — seleção das 112 regras:** muitas das 112 regras serão variações de mesma ideia ou regras processuais ("escreva ADR antes de X"). Selecionar as ~8-12 mais **decisivas** (mudam o design, não só processo). Regras processuais já estão em `/architecture` ou em `/decision-registry`.
- **Local — 3 sources juntos é o ponto de risco de drift:** este átomo é o único com 3 sources. Frontmatter `sources:` mantém uma entrada por linha; ordenar research primeiro, depois skills.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Como o piloto, este átomo é markdown. Checklist de validação de conteúdo (sem RED→GREEN):

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md`
- [ ] Frontmatter contém **todos** os 8 campos na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] `topic: architecture-conventions` (literal, kebab-case)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: backend`
- [ ] `tier: 2` (context-dependent, conforme `_topic-plan.md:143`)
- [ ] `sources:` inclui `research: 3f1af213` + as 2 skills (`nodejs-best-practices/SKILL.md`, `nodejs-backend-patterns/SKILL.md`)
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 2 anti-padrões com correção
- [ ] `wc -l` retorna entre 110 e 150 (alvo ~130)
- [ ] `grep -c '\[A DEFINIR\]' atoms/architecture-conventions.md` retorna 0
- [ ] Triggers contém pelo menos: `layered`, `modular`, `dependency injection`, `DI`, `ports`, `adapters`, `monorepo`, `conventions`
- [ ] Citação de `/architecture` em "Referências externas" para deixar claro o limite cross-stack
- [ ] `bun run harness:validate` verde
- [ ] Patterns cobrem trade-offs concretos (Fastify plugin vs NestJS module, Turborepo vs pnpm workspaces) — não princípios genéricos (SOLID)

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md` retorna número entre 110 e 150
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md` retorna 0
- `grep -E '^(topic|stack|layer|sources|tier|triggers|related_skills|updated):' docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md | wc -l` retorna 8
- `bun run harness:validate` exit 0

**Por humano:**
- Leitor sênior em Node+TS reconhece os patterns como decisões de produção (Fastify plugin layout, DI constructor + token, ports & adapters quando 2+ impls existem)
- Nenhum pattern duplica `/architecture` (SOLID, monolith vs microservices, CQRS, ADR) — diferencial Node+TS-específico é claro
- 112 regras condensadas em 8-12 patterns transversais (não lista de 112 bullets soltos)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
