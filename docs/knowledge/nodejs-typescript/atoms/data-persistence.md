---
topic: data-persistence
stack: nodejs-typescript
layer: backend
sources:
  - research: deadf855 (claude-code/knowledge/Nodejs/compass_artifact_wf-deadf855-7823-4d55-8ccc-599c9fa6f8e7_text_markdown.md)
tier: 2
triggers: [Prisma, Drizzle, Kysely, N+1, migration, RLS, multi-tenant, pgBouncer, transaction]
related_skills: [/system-design, /api-design]
updated: 2026-05-16
---

# Data Persistence — Node.js + TypeScript

## Quando consultar

- Escolher entre Prisma 7, Drizzle v1 e Kysely para novo projeto SaaS.
- Suspeitar de N+1 escondido pelo ORM em endpoint lento.
- Implementar isolamento de tenant via Postgres RLS sem filtro manual no app.
- Executar migration zero-downtime em produção (renomear coluna, alterar tipo).
- Configurar pgBouncer transaction-mode e deparar com erros de prepared statements.

## Padrões sênior

### Pattern: Escolha de ORM por perfil de equipe

- **Problema:** Prisma, Drizzle e Kysely têm trade-offs reais — escolher pelo hype ou pela sintaxe gera fricção futura na equipe.
- **Padrão:**
  - **Prisma 7:** DSL própria (`schema.prisma`) + `prisma generate`; Migrate declarativo; Studio visual. Melhor para times mistos e quando DX > controle de SQL. Pós-7, bundle ~1.6 MB (sem Rust). Exige adapter explícito: `@prisma/adapter-pg`.
  - **Drizzle v1:** Schema em TypeScript puro, zero codegen, bundle ~50–200 KB, API SQL-shaped. Melhor para edge runtimes (Cloudflare Workers, Vercel Edge) e times que pensam em SQL.
  - **Kysely:** query builder type-safe, ~2 MB, sem schema language — você traz suas próprias migrations. Melhor quando ambos os ORMs parecem mágica demais e o time domina SQL.
- **Quando usar:** ver tabela de critérios abaixo.
- **Quando NÃO usar:** TypeORM/MikroORM em projeto novo — legacy sem vantagem para SaaS moderno.

---

### Pattern: N+1 via eager loading explícito

- **Problema:** ORMs expõem relações de forma lazy-friendly. Iterar `users` e acessar `.posts` dentro do loop dispara 1 query por user sem nenhum warning.
- **Padrão:**
  ```ts
  // Prisma
  const users = await prisma.user.findMany({ include: { posts: true } });

  // Drizzle
  const users = await db.query.users.findMany({ with: { posts: true } });
  ```
  Habilitar query logging em desenvolvimento (`log: ["query"]` no Prisma; `logger: true` no Drizzle Kit) para detectar N+1 em PR antes de chegar a produção. Nunca confiar em lazy loading + loop.
- **Quando usar:** toda relação acessada fora da query inicial.
- **Quando NÃO usar:** quando apenas subset de relações é necessário — use `select` para evitar over-fetching.

---

### Pattern: Transação interativa vs batch

- **Problema:** transações interativas usam uma conexão do pool durante toda a duração; batch espera queries independentes e paralelas.
- **Padrão:**
  ```ts
  // Interativa — lógica condicional entre queries
  await prisma.$transaction(async (tx) => {
    const balance = await tx.account.findUniqueOrThrow({ where: { id } });
    if (balance.cents < amount) throw new InsufficientFundsError();
    await tx.account.update({ where: { id }, data: { cents: { decrement: amount } } });
  });

  // Batch — writes sem dependência entre si (paralelo interno)
  await prisma.$transaction([
    prisma.log.create({ data: eventA }),
    prisma.metric.upsert({ where: { key }, create: metricA, update: metricA }),
  ]);
  ```
- **Quando usar:** interativa para fluxos com lógica condicional; batch para writes paralelos sem dependência.
- **Quando NÃO usar:** nunca chamar I/O externo (HTTP, fila, cache remoto) dentro de transação interativa — segura conexão do pool enquanto espera.

---

### Pattern: Expand-contract migrations para zero-downtime

- **Problema:** `ALTER TABLE RENAME COLUMN` em produção quebra o app atual que lê o nome antigo; `ALTER TABLE ALTER COLUMN TYPE` bloqueia a tabela.
- **Padrão (3 deploys):**
  1. **Expand:** adicionar nova coluna nullable (`new_email CITEXT NULL`); app lê antiga, escreve em ambas.
  2. **Backfill:** `UPDATE users SET new_email = email WHERE new_email IS NULL`; app ainda lê antiga.
  3. **Contract:** drop da coluna antiga em release separado; app já lê nova.
  Nunca renomear + alterar tipo na mesma migration de deploy.
- **Quando usar:** qualquer alteração em coluna com dados existentes em produção.
- **Quando NÃO usar:** em banco de desenvolvimento/CI sem dados reais — `migrate reset` é OK.

---

### Pattern: RLS multi-tenant via Postgres policies

- **Problema:** filtrar `WHERE tenant_id = $tenantId` manualmente em cada query é esquecível e cria vetores de vazamento de dados entre tenants.
- **Padrão:**
  ```sql
  -- Migration
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
  ```
  ```ts
  // Middleware — seta por transação (Prisma $extends ou middleware)
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return tx.order.findMany();
  });
  ```
  Com Drizzle v1, usar `pgPolicy` no schema TS (suporte first-class).
- **Quando usar:** isolamento strict por tenant em B2B SaaS, especialmente em contextos de compliance (SOC 2, ISO 27001).
- **Quando NÃO usar:** quando isolation física (schema-per-tenant, DB-per-tenant) é mandatória por contrato — RLS é lógico, não físico.

---

### Pattern: Connection pooling com pgBouncer transaction-mode

- **Problema:** cada instância de app abre N conexões no Postgres; sob carga, pool de conexões do banco esgota (Postgres suporta ~100–500 conexões por padrão).
- **Padrão:**
  ```
  App (Prisma/Drizzle) → pgBouncer (transaction mode) → Postgres
  ```
  Pool size recomendado no ORM: `num_cores * 2 + effective_spindle_count` (geralmente 10–20).
  **Gotcha critico — pgBouncer transaction-mode:** prepared statements padrão (PostgreSQL protocol) são incompatíveis com transaction-mode porque a sessão não é mantida entre requests. Adicionar `pgbouncer=true` no DSN do Prisma; no Drizzle, usar driver com `prepare: false`.
  ```
  DATABASE_URL="postgres://user:pass@pgbouncer:5432/db?pgbouncer=true"
  ```
- **Quando usar:** produção com >1 instância de app; Supabase e Neon já provisionam Supavisor/PgBouncer — mesmo padrão.
- **Quando NÃO usar:** desenvolvimento local com conexão direta — overhead desnecessário.

---

### Pattern: Soft delete com índice parcial

- **Problema:** `DELETE` físico perde histórico; sem índice parcial, queries que filtram registros ativos pagam custo de scan em toda tabela.
- **Padrão:**
  ```sql
  ALTER TABLE items ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  CREATE INDEX idx_items_active ON items (id) WHERE deleted_at IS NULL;
  ```
  ```ts
  // Middleware Prisma — injeta filtro automaticamente
  prisma.$use(async (params, next) => {
    if (params.action === "findMany") params.args.where = { ...params.args.where, deleted_at: null };
    return next(params);
  });
  ```
- **Quando usar:** entidades com necessidade de auditoria, undelete ou análise histórica.
- **Quando NÃO usar:** logs de evento de alta escrita — soft delete infla tabela; use tabela de archive separada.

---

## Anti-padrões

- **Rollback de migration em produção:** `prisma migrate resolve --rolled-back` desfaz o registro mas não o schema — dado já escrito na nova estrutura quebra no schema antigo. Correção: roll-forward (nova migration corrigindo) é a norma; rollback só em janela de manutenção com backup validado.

- **N+1 escondido pelo ORM:** `users.forEach(u => u.posts)` após `findMany()` sem `include` dispara 1 query por usuário silenciosamente. Correção: include explícito + log de queries em PR review (`log: ["query"]`). O Prisma não emite warning por padrão — a detecção é responsabilidade do dev.

- **I/O externo dentro de transação interativa:** `await httpClient.post(...)` ou `await redis.set(...)` dentro de `$transaction(async tx => ...)` segura uma conexão do pool durante latência de rede. Correção: pré-fetch todos os dados externos antes de abrir a transação; transação deve conter apenas queries ao banco.

- **FK sem índice no lado "many":** `SELECT * FROM orders WHERE user_id = $1` sem índice faz full scan em tabela de ordens. Postgres cria índice automático apenas em PKs e UNIQUE — FKs não. Correção: `CREATE INDEX ON orders(user_id)` em toda coluna de FK.

- **Schema reset entre testes:** `prisma migrate reset` em CI serializa e demora minutos com schema complexo. Correção: `BEGIN` + `ROLLBACK` por teste (isolamento sem I/O), ou `pg_dump` do schema inicial como template e clone por worker de CI.

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Time misto (júnior/sênior), DX prioritária, ferramental visual | Prisma 7 |
| Edge runtime (Cloudflare Workers, Vercel Edge), bundle crítico | Drizzle v1 |
| Time sênior, SQL-first, migrations próprias | Kysely |
| Multi-tenant com isolamento lógico (compliance) | Postgres RLS + `app.tenant_id` via `set_config` |
| Multi-tenant com isolamento físico mandatório | Schema-per-tenant ou DB-per-tenant |
| Alterar coluna com dados em produção | Expand-contract (3 deploys separados) |
| pgBouncer transaction-mode ativo | `pgbouncer=true` no DSN + `prepare: false` no driver |
| Entidade com histórico / undelete | Soft delete + `deleted_at TIMESTAMPTZ NULL` + índice parcial |

---

## Referências externas

- Skill: `/api-design` — N+1 conceitual e DataLoader para batch de queries cross-stack
- Skill: `/system-design` — sharding, replicação, CAP theorem, caching layer acima do banco
- Research: `deadf855` — `claude-code/knowledge/Nodejs/compass_artifact_wf-deadf855-7823-4d55-8ccc-599c9fa6f8e7_text_markdown.md`
