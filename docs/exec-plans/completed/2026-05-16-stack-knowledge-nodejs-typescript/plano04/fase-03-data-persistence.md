<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 03: Átomo `data-persistence.md`

**Plano:** 04 — Atom Batch A
**Sizing:** 1.5-2h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 2 backend `docs/knowledge/nodejs-typescript/atoms/data-persistence.md` (~140 linhas), condensando trade-offs de ORMs Node-specific (Prisma 7 vs Drizzle v1 vs Kysely), prevenção de N+1 idiomática, transações, migrations expand-contract zero-downtime, RLS multi-tenant Postgres e connection pooling com pgBouncer. Cobre o ângulo Node-specific que `/api-design` (N+1 conceitual) e `/system-design` (sharding/replicação) não cobrem.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/data-persistence.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~140 linhas) |

---

## Implementacao

### Passo 1: Frontmatter (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: data-persistence
stack: nodejs-typescript
layer: backend
sources:
  - research: deadf855
tier: 2
triggers: [Prisma, Drizzle, Kysely, N+1, migration, RLS, multi-tenant, pgBouncer, transaction]
related_skills: [/system-design, /api-design]
updated: 2026-05-16
---
```

Origem (de `_catalog.md`):
- `deadf855` — Senior Data Persistence (1370 linhas, Prisma 7, Drizzle v1, Kysely, multi-tenant, migrations zero-downtime)

### Passo 2: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem:

1. `# Data Persistence — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 5-7 patterns (sub-seções com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 3-5 armadilhas com correção
5. `## Critérios de decisão` — tabela ORM choice + multi-tenant + migration strategy
6. `## Referências externas` — skills `/system-design`, `/api-design` + path da fonte

### Passo 3: Patterns recomendados (guia editorial — executor expande)

Mínimo 5, máximo 7 — extrair de `deadf855`:

- **Pattern: Escolha de ORM por trade-off (Prisma vs Drizzle vs Kysely)** — Prisma 7 = DSL própria + migrations geradas (DX alta, perda de SQL); Drizzle v1 = TS-first, schema em TS, mais próximo de SQL; Kysely = query builder type-safe sem schema migrations (você traz sua tool). Escolha por nível de equipe e necessidade de raw SQL.
- **Pattern: N+1 prevention via `include`/`with` (eager loading explícito)** — Prisma `include: { posts: true }`, Drizzle `with: { posts: true }`. Nunca confiar em lazy loading + loop.
- **Pattern: Transações interativas (`$transaction(async (tx) => ...)`) vs batch (`$transaction([...])`)** — interativa para lógica condicional; batch para writes paralelos sem dependência.
- **Pattern: Migrations expand-contract para zero-downtime** — expand (add nullable column / new table) → deploy app → backfill → contract (drop old column) em release separado. Nunca alterar tipo + renomear no mesmo migration.
- **Pattern: RLS multi-tenant via Postgres policies** — `tenant_id` em toda tabela + `USING (tenant_id = current_setting('app.tenant_id')::uuid)`; middleware do app seta `SET LOCAL app.tenant_id` por transação. Cliente do ORM não precisa filtrar manualmente.
- **Pattern: Connection pool sizing + pgBouncer transaction mode** — pool size = `(num_cores * 2) + effective_spindle_count` para o ORM; pgBouncer transaction-mode entre app e Postgres para reaproveitar conexões; cuidado com prepared statements (não compatível com transaction-mode sem `pgbouncer=true` no DSN).
- **Pattern: Soft delete + índice parcial** — `deleted_at TIMESTAMPTZ NULL` + `CREATE INDEX ... WHERE deleted_at IS NULL`; queries default filtram `deleted_at IS NULL` (via middleware ORM).

### Passo 4: Anti-padrões (3-5 armadilhas)

- **Rollback de migration em produção** — quase sempre piora; correção: roll-forward (nova migration corrigindo) é a norma; rollback só em janela de manutenção.
- **ORM auto-magic com N+1 escondidos** — chamar `.posts` em loop sobre `users`. Correção: include explícito + log de query slow + revisar SQL gerado em PR.
- **Transação longa segurando conexão do pool** — `await externalApiCall()` dentro de transação. Correção: nunca chamar I/O externo dentro de transação; pré-fetch dados, abre transação curta.
- **FK sem índice no lado "many"** — busca por FK fica full scan. Correção: sempre `CREATE INDEX ON child_table(parent_id)`.
- **ORM resetando schema entre testes** — Prisma `migrate reset` em CI demora; correção: snapshot do schema + `BEGIN; ROLLBACK;` por teste, ou `pg_dump` template + clone.

### Passo 5: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Time júnior, schema estável, DX > performance fina | Prisma 7 |
| Time intermediário, schema evoluindo, TS-first | Drizzle v1 |
| Time sênior, controle total de SQL, migrations próprias | Kysely |
| Multi-tenant com isolamento estrito (compliance) | Postgres RLS via `tenant_id` |
| Multi-tenant com escala alta, isolamento físico | Schema-per-tenant ou DB-per-tenant |
| Alteração de coluna em produção | Expand-contract (3 deploys) |
| Pool size com pgBouncer transaction-mode | `pgbouncer=true` no DSN + sem prepared statements |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` + índice parcial |

### Passo 6: Referências externas

- Skill: `/api-design` para N+1 conceitual e DataLoader cross-stack
- Skill: `/system-design` para sharding, replicação, CAP, caching layer acima do DB
- Source: `claude-code/knowledge/Nodejs/wf-deadf855.md`

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/data-persistence.md
```

Resultado esperado: entre 100 e 200 linhas. Alvo: ~140.

---

## Gotchas

- **G1 do plano:** frontmatter verbatim. `layer: backend` (não `both`) — persistence é backend-only.
- **G2 do plano:** cap de 200 linhas. `deadf855` tem 1370 linhas; cuidar para não copiar comparações longas Prisma vs Drizzle vs Kysely — manter como tabela de decisão.
- **G5 do plano:** overlap com `/api-design` (N+1 conceitual) e `/system-design` (escalabilidade DB). Não explicar "o que é N+1" — explicar **como Prisma esconde e como Drizzle expõe**.
- **G6 do plano:** `sources: [{research: deadf855}]`.
- **Local — versões pinned (Prisma 7, Drizzle v1):** estado da arte em 2026-05; quando atualizar o átomo, revalidar versões nas fontes (frontmatter `updated:` registra a data).
- **Local — pgBouncer transaction mode é gotcha conhecido:** prepared statements quebram silenciosamente. Mencionar explicitamente.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Checklist de validação de conteúdo:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/data-persistence.md`
- [ ] Frontmatter contém os 8 campos na ordem
- [ ] `topic: data-persistence` (literal)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: backend`
- [ ] `tier: 2`
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem
- [ ] Pelo menos 5 patterns em "Padrões sênior"
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] Tabela de decisão de ORM (Prisma vs Drizzle vs Kysely) presente
- [ ] Multi-tenant via RLS Postgres descrito
- [ ] `wc -l` retorna entre 100 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]' atoms/data-persistence.md` retorna 0
- [ ] Triggers contém pelo menos: `Prisma`, `Drizzle`, `Kysely`, `N+1`, `migration`, `RLS`, `multi-tenant`, `pgBouncer`, `transaction`
- [ ] Citações de `/api-design` e `/system-design` em "Referências externas"

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/data-persistence.md` exit 0
- `wc -l` retorna entre 100 e 200
- `grep -c '\[A DEFINIR\]'` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos idêntica ao piloto

**Por humano:**
- Sênior backend reconhece os trade-offs de ORM como reais (não bullets de marketing)
- Padrão expand-contract está descrito de forma operacionalizável (3 deploys, não conceito vago)
- Pgbouncer transaction-mode gotcha aparece explicitamente
- Nenhum pattern duplica conceitualmente `/api-design` ou `/system-design`

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
