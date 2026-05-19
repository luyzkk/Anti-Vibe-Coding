<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline em runtime.
-->

# Fase 02: Átomo `active-record-migrations-safety.md` (T1)

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup decidida), fase-02 (schema `rails_versions`), fase-04 (piloto)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 1 `docs/knowledge/rails/atoms/active-record-migrations-safety.md` (~140 linhas), condensando strong_migrations idioms, zero-downtime patterns (add_column with default, add_index concurrently postgres, backfill via background job), ignored_columns para renames, remove_column gotchas. Cobre o ângulo Rails-specific de migrations (DSL Active Record, reversibilidade, schema vs structure) que `/architecture` cobre apenas como princípio cross-stack de schema evolution.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/active-record-migrations-safety.md` | Create | Átomo completo (~140 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão de dedup para `rails-migration-safety` vs `rails-migration-safety copy` |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` o STATE.md global. Confirmar decisão de dedup para o par `rails-migration-safety` vs `rails-migration-safety copy`. Sem decisão aprovada, **BLOQUEAR** e escalar.

### Passo 2: Frontmatter exato

```yaml
---
topic: active-record-migrations-safety
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-migration-safety/PATTERNS.md
  - claude-code/knowledge/Rails/rails-migration-safety/PITFALLS.md
  - claude-code/knowledge/Rails/rails-stack-conventions/BACKENDS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-9d10f3ac-b273-401e-9d58-2882274ecb4d_text_markdown.md
tier: 1
triggers: [migration, schema, strong_migrations, zero downtime, add_column, add_index concurrently, backfill, ignored_columns, postgres, rename column]
related_skills: [/architecture, /infrastructure]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

Substituir `rails-migration-safety` por `rails-migration-safety copy` se decisão foi pelo lado `copy`. Compass `9d10f3ac` foca em zero-downtime patterns Postgres + Rails.

### Passo 3: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias (5):

1. `# Active Record — Migrations Safety` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 5-7 patterns
4. `## Anti-padrões` — 3-5 armadilhas
5. `## Critérios de decisão` — tabela
6. `## Referências externas`

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 7:

- **Pattern: `add_column` com default seguro (Rails 5+)** — Problema: rewrite de tabela em DEFAULT em postgres < 11; Padrão: `add_column :users, :status, :string, default: 'active', null: false` é seguro em Rails 5+ + Postgres 11+; Quando NÃO usar: postgres ≤ 10 — usar 2 migrations (add_column null:true, backfill, change_column_null).
- **Pattern: `add_index` concurrently (Postgres)** — Problema: index sync bloqueia writes em tabela grande; Padrão: `disable_ddl_transaction!` + `add_index :users, :email, algorithm: :concurrently`; Quando NÃO usar: tabela < 10k rows (overhead concorrente desnecessário).
- **Pattern: Backfill via background job, não na migration** — Problema: `User.find_each { |u| u.update(...) }` em migration trava deploy; Padrão: migration adiciona coluna nullable; job (`BackfillUserStatusJob`) processa em batches com sleep; depois second migration força NOT NULL; Quando NÃO usar: tabela < 1k rows — backfill inline aceitável.
- **Pattern: `ignored_columns` para rename ou remove em 2 deploys** — Problema: `rename_column` rompe o app rodando (model espera nome antigo); Padrão: deploy 1 adiciona `self.ignored_columns = [:old_name]` no model + migration adiciona coluna nova + copy; deploy 2 deleta coluna antiga; Quando NÃO usar: app single-instance sem rolling deploy — pode aceitar curta indisponibilidade.
- **Pattern: `strong_migrations` gem como CI gate** — Problema: dev sênior esquece pattern em PR; Padrão: gem `strong_migrations` falha CI em DSL inseguro (ex: `add_column` com default em postgres < 11); Quando NÃO usar: app sem deploy zero-downtime crítico.
- **Pattern: Reversibilidade explícita (`up`/`down` vs `change`)** — Problema: `change_column :col, :string` não é auto-reversível; Padrão: usar `reversible do |dir| dir.up { ... }; dir.down { ... } end` ou separar `up`/`down`; Quando NÃO usar: data-only migrations (`raise ActiveRecord::IrreversibleMigration` no `down`).
- **Pattern: Schema vs structure (postgres-specific)** — Problema: `schema.rb` perde triggers, partial indexes, materialized views; Padrão: `config.active_record.schema_format = :sql` gera `structure.sql`; Quando NÃO usar: app sem features postgres-specific.

### Passo 5: Anti-padrões (3-5 armadilhas)

- **Anti-pattern: `remove_column` sem `ignored_columns` no deploy anterior** — Sintoma: instance antiga ainda escreve na coluna; queries quebram após deploy; Correção: 2 deploys — deploy 1 `ignored_columns`, deploy 2 `remove_column`.
- **Anti-pattern: `add_reference :foo, :bar, foreign_key: true` em tabela grande** — Sintoma: FK constraint scaneia toda a tabela; Correção: `add_reference :foo, :bar, foreign_key: false` + `add_foreign_key :foo, :bars, validate: false` + `validate_foreign_key :foo, :bars` em deploy posterior.
- **Anti-pattern: Migration roda `Model.update_all` com lógica complexa** — Sintoma: lock em produção; Correção: migration apenas DDL; data migration via job ou rake task explícita.
- **Anti-pattern: `change_column :users, :age, :string`** — Sintoma: rewrite da tabela + cast pode falhar; Correção: 3 deploys (add_column new + dual write + cast em background + drop old).

### Passo 6: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Add coluna nullable em tabela grande | `add_column` direto (seguro Rails 5+ Postgres 11+) |
| Add coluna NOT NULL em tabela grande | 3 deploys (add null, backfill, change_column_null) |
| Add index em tabela > 100k rows | `add_index ..., algorithm: :concurrently` + `disable_ddl_transaction!` |
| Rename de coluna | 2 deploys com `ignored_columns` |
| Drop de coluna | 2 deploys: `ignored_columns` → `remove_column` |
| FK constraint em tabela grande | `add_foreign_key validate: false` + `validate_foreign_key` depois |
| Backfill > 1k rows | Background job em batches |

### Passo 7: Referências externas

- Skill: `/architecture` para princípios cross-stack de schema evolution e expand-contract pattern
- Skill: `/infrastructure` para zero-downtime deploy + rolling restart
- Source: paths absolutos listados em `sources:` (audit trail RF14)

### Passo 8: Comando para invocar extrator

Spawn extrator com prompt anti-drift literal (idem fase-01 Passo 8, ajustar `topic`/`sources`):

````
Você é um subagente extrator isolado, sem contexto prévio do projeto.
Sua tarefa: escrever `docs/knowledge/rails/atoms/active-record-migrations-safety.md`
seguindo o template piloto + Passo 2 da fase-02-active-record-migrations-safety.md.

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

OUTPUT: arquivo markdown gravado em `docs/knowledge/rails/atoms/active-record-migrations-safety.md`.
Cap ≤ 200 linhas; alvo ~140.
````

---

## Gotchas

- **G1 do plano (cap 200):** este átomo é mais focado que `active-record-fundamentals` — alvo 140 ln é confortável. Sem risco de estouro se patterns ficarem em 18-22 ln cada.
- **G2 do plano (anti-drift):** versões específicas (Postgres 11+ é boundary para add_column safe default; Rails 6.1+ para `destroy_async`) DEVEM estar na fonte. Se source não cita versão, o pattern descreve qualitativamente.
- **G6 do plano (fonte canônica):** par `rails-migration-safety` vs `rails-migration-safety copy` — confirme no STATE.md qual ficou.
- **G8 do plano (paths absolutos):** sources listam paths a partir de `claude-code/knowledge/Rails/`.
- **Local — strong_migrations gem como pattern, não como dependência obrigatória:** o pattern recomenda a gem como CI gate, mas o átomo NÃO assume que o app a instala. Anti-padrões são válidos mesmo sem a gem.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/active-record-migrations-safety.md`
- [ ] Frontmatter 8 campos base + `rails_versions: ['>=7.1']`
- [ ] `topic: active-record-migrations-safety` (kebab-case)
- [ ] `stack: rails`, `layer: backend`, `tier: 1`, `updated: 2026-05-18`
- [ ] `sources:` aponta para arquivos existentes em `claude-code/knowledge/Rails/{pasta-canonica}/`
- [ ] 5 seções na ordem (sem API-only mode)
- [ ] ≥5 patterns em "Padrões sênior" com Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] ≥3 anti-padrões com correção
- [ ] Triggers contém: `migration`, `strong_migrations`, `zero downtime`, `add_column`, `add_index concurrently`, `backfill`
- [ ] `wc -l` entre 120 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]'` retorna 0
- [ ] `bun run harness:validate` passa

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/active-record-migrations-safety.md` exit 0
- `wc -l` retorna entre 120 e 200
- `grep -c '\[A DEFINIR\]'` retorna 0
- Frontmatter parseável como YAML
- `bun run harness:validate` passa

**Por humano:**

- Não flagged para audit humano CA-08. Validação cai no subagente verifier refined da fase-09 — ≥80% das claims das 3 seções técnicas rastreáveis ao source.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
