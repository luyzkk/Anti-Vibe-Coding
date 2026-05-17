<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 01: Átomo thin `api-design-stack-specific.md`

**Plano:** 05 — Atom Batch B
**Sizing:** 1-1.5h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo **thin** tier 2 `docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md` (~80 linhas), complementando a skill `/api-design` com o ângulo Node+TS-específico de API design: trade-offs entre Fastify e Express, validação com Zod/TypeBox/Valibot, geração de OpenAPI a partir dos tipos, e quando tRPC vence REST (e quando perde). Não duplica princípios cross-stack que `/api-design` já cobre (idempotência, pagination cursor, status codes, REST vs GraphQL conceitual).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md` | Create | Átomo thin (frontmatter + 5 seções minimal viable, ~80 linhas) |

---

## Implementacao

### Passo 1: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: api-design-stack-specific
stack: nodejs-typescript
layer: backend
sources:
  - research: 26cc8f92
  - skill: nodejs-backend-patterns/SKILL.md
tier: 2
triggers: [fastify, express, zod, typebox, trpc, openapi, validation]
related_skills: [/api-design]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `26cc8f92` — API Design & Versioning (936 linhas, REST/GraphQL/gRPC/tRPC, versionamento, webhooks, pagination)
- `nodejs-backend-patterns/SKILL.md` — Express/Fastify, middleware, auth, DB, cache, API (versão Feb 2026)

### Passo 2: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (mesmo no thin — bullets minimal viable, não pular seção):

1. `# API Design — Node.js + TypeScript stack-specific` (título)
2. `## Quando consultar` — 2-3 bullets de cenários (thin)
3. `## Padrões sênior` — 2-3 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 1-2 armadilhas com correção
5. `## Critérios de decisão` — 1 tabela curta "se X, então Y"
6. `## Referências externas` — skill `/api-design` + paths das fontes

### Passo 3: Conteúdo nuclear esperado (guia editorial — executor expande)

Patterns recomendados (escolher 2-3 destes):

- **Pattern: Fastify vs Express trade-off** — Fastify (schema-first, validação built-in, faster) vs Express (ecossistema maior, mais legado). Quando usar Fastify: novo serviço com schema validation crítico, performance importa. Quando usar Express: integração com middleware legado, equipe já fluente.
- **Pattern: Validação no boundary com Zod ou TypeBox** — Zod gera tipos TS a partir do schema (`z.infer<typeof Schema>`), TypeBox gera JSON Schema (útil para OpenAPI). Quando usar Zod: DX, runtime válida + types. Quando usar TypeBox: precisa de JSON Schema para Fastify ou OpenAPI gen.
- **Pattern: OpenAPI a partir de tipos** — Fastify+TypeBox gera OpenAPI direto do schema. Alternativas: `zod-to-openapi`, `@asteasolutions/zod-to-openapi`. Quando usar: API externa, contratos com frontend separado. Quando NÃO usar: API interna efêmera.
- **Pattern: tRPC para mesma-stack** — type-safety end-to-end sem schema gen quando client e server são TS no mesmo monorepo. Quando usar: monorepo TS, client interno controlado. Quando NÃO usar: client externo, polyglot, contratos versionados.

Anti-padrões esperados (1-2):

- **Validação de body em ad-hoc `if (!body.field)`** — correção: schema de boundary (Zod/TypeBox) parseando uma vez no handler; types fluem para baixo via inferência.
- **Express middleware `body-parser` legado em Express 5** — correção: `express.json()` built-in (Express ≥4.16) ou Fastify schema validation.

Critérios de decisão (tabela mínima):

| Cenário | Escolha |
|---|---|
| API externa, contrato versionado, polyglot client | REST + OpenAPI gerado de Zod/TypeBox |
| Monorepo TS, client interno | tRPC (type-safety sem schema gen) |
| Schema validation crítico, performance importa | Fastify + TypeBox |
| Equipe fluente em Express, middleware legado | Express + Zod parsing no boundary |

### Passo 4: Referências externas

- Skill: `/api-design` para princípios cross-stack (idempotência, REST URL design, pagination, status codes, GraphQL vs REST conceitual, webhooks, status codes)
- Source: `claude-code/knowledge/Nodejs/wf-26cc8f92.md`
- Source: `claude-code/knowledge/Nodejs/nodejs-backend-patterns/SKILL.md`

### Passo 5: Validar cap thin de 80 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md
```

Resultado esperado: entre 60 e 90 linhas. Alvo: ~80 (per `_topic-plan.md:58`). Se passar de 90, sinal de excesso de princípio cross-stack — cortar e linkar `/api-design`.

---

## Gotchas

- **G1 do plano:** frontmatter verbatim com piloto (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`). Qualquer drift invalida CA-01.
- **G2 do plano (cap thin de 80 ln):** se exceder 90 linhas, drift de escopo — provavelmente está explicando "o que é REST" ou "o que é idempotência" (cross-stack). Cortar e linkar `/api-design`. Faixa saudável: 70-90 linhas.
- **G5 do plano (overlap com `/api-design`):** este átomo é THIN justamente porque `/api-design` é forte e cobre princípios gerais. Resistir a explicar pagination, status codes, REST URL design — esses estão em `/api-design`. Aqui é só **stack-specific**: Fastify, Express, Zod, TypeBox, tRPC, OpenAPI gen, Valibot.
- **G6 do plano:** frontmatter `sources:` lista compass-id (`26cc8f92`) + skill path (`nodejs-backend-patterns/SKILL.md`), sem caminho absoluto. Caminho absoluto vai em "Referências externas" no corpo.
- **Local — patterns concretos > generalizações:** thin não justifica vagueza. Cada pattern precisa de exemplo concreto (lib específica, snippet de 2-3 linhas se necessário). Vagueza ("considere validação") falha auditoria.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Como o piloto, este átomo é markdown. Checklist de validação de conteúdo (sem RED→GREEN):

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md`
- [ ] Frontmatter contém **todos** os 8 campos na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] `topic: api-design-stack-specific` (literal, kebab-case, igual ao filename sem `.md`)
- [ ] `stack: nodejs-typescript` (alinha com pasta — sem `node-ts`)
- [ ] `layer: backend` (API design é backend-heavy)
- [ ] `tier: 2` (context-dependent, conforme `_topic-plan.md:143`)
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 2 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 1 anti-padrão com correção
- [ ] `wc -l` retorna entre 60 e 90 (alvo ~80)
- [ ] `grep -c '\[A DEFINIR\]' atoms/api-design-stack-specific.md` retorna 0
- [ ] Triggers contém pelo menos: `fastify`, `express`, `zod`, `typebox`, `trpc`, `openapi`, `validation`
- [ ] Citação de `/api-design` em "Referências externas" para deixar claro o limite cross-stack
- [ ] `bun run harness:validate` verde (sem erros de schema na pasta `docs/knowledge/`)
- [ ] Nenhuma claim citável que duplica `/api-design` (idempotência, pagination, REST URL design, status codes, GraphQL conceitual)

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md` retorna número entre 60 e 90
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md` retorna 0
- `grep -E '^(topic|stack|layer|sources|tier|triggers|related_skills|updated):' docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md | wc -l` retorna 8 (8 campos do frontmatter)
- `bun run harness:validate` exit 0

**Por humano:**
- Leitor sênior em Node+TS reconhece os patterns como decisões de produção (Fastify schema-first, Zod boundary parsing, tRPC monorepo)
- Nenhum pattern duplica conteúdo coberto cross-stack por `/api-design` (diferencial Node+TS-específico — Fastify, Zod, TypeBox, tRPC — é claro)
- Anti-padrões refletem armadilhas reais já vistas em PRs Node+TS

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
