---
topic: active-record-migrations-safety
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-migration-safety/SKILL.md
  - claude-code/knowledge/Rails/rails-migration-safety/PATTERNS.md
tier: 1
triggers: [migration, schema, strong_migrations, zero downtime, add_column, add_index concurrently, backfill, ignored_columns, postgres, rename column, remove_column, foreign_key]
related_skills: [/architecture, /infrastructure]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Active Record — Migrations Safety

## Quando consultar

- Ao adicionar coluna, index, constraint ou FK em tabela de producao
- Ao fazer backfill de dados em tabela grande ou ocupada
- Ao renomear ou remover coluna com app em rolling deploy
- Ao mudar tipo de coluna em tabela ativa
- Ao avaliar se `strong_migrations` esta configurada no projeto

## Padroes senior

### Pattern: Add coluna — nullable primeiro, NOT NULL depois

- **Problema:** `add_column :orders, :status, :string, default: 'pending', null: false` causa rewrite de tabela e lock em tabelas grandes
- **Padrao:** 3 deploys — deploy 1: `add_column :orders, :status, :string`; deploy 2: backfill em batches fora da migration; deploy 3: `change_column_null :orders, :status, false` + `change_column_default :orders, :status, from: nil, to: 'pending'`
- **Quando usar:** qualquer coluna NOT NULL em tabela com volume significativo
- **Quando NAO usar:** tabela recentemente criada (vazia) — add direto com NOT NULL e default e aceitavel

### Pattern: `add_index` concorrente em tabela grande (PostgreSQL)

- **Problema:** `add_index :orders, :processed_at` sem opcoes adquire exclusive lock que bloqueia writes em tabela PostgreSQL grande
- **Padrao:** `disable_ddl_transaction!` + `add_index :orders, :processed_at, algorithm: :concurrent`; para MySQL: `algorithm: :inplace`
- **Quando usar:** tabela em producao com volume relevante no PostgreSQL
- **Quando NAO usar:** tabela pequena ou recentemente criada — overhead do concurrent desnecessario

### Pattern: Backfill em job, nunca dentro da migration

- **Problema:** `Order.in_batches { |b| b.update_all(...) }` dentro de migration mantem transacao aberta; lock prolongado em producao
- **Padrao (SKILL.md HARD-GATE):** nao combinar schema change e data backfill em uma migration; backfill via batch job separado; deploy separado por etapa
- **Quando usar:** qualquer migration que precise preencher coluna existente com dados
- **Quando NAO usar:** tabela recentemente criada sem dados — update inline aceitavel

### Pattern: Remover coluna — `ignored_columns` antes do DROP

- **Problema:** Rails cacheia metadados de colunas; remover coluna com app em rolling deploy causa `ActiveModel::MissingAttributeError` nas instancias antigas ainda rodando
- **Padrao (PATTERNS.md):** deploy 1: `self.ignored_columns += %w[legacy_field]` no model; deploy 2: `remove_column :orders, :legacy_field`
- **Quando usar:** toda remocao de coluna com app em producao com multiplas instancias
- **Quando NAO usar:** app single-instance com maintenance window — pode aceitar remocao direta

### Pattern: FK constraint em tabela grande — validar separado

- **Problema:** `add_foreign_key :orders, :users` valida todas as linhas existentes por default, podendo bloquear a tabela
- **Padrao (PATTERNS.md):** `add_foreign_key :orders, :users, validate: false` (deploy 1); apos limpar orphans: `validate_foreign_key :orders, :users` (deploy 2)
- **Quando usar:** tabela grande ou quando existirem potenciais orphaned records
- **Quando NAO usar:** tabela nova sem dados existentes — validation imediata e segura

### Pattern: Type change — add-copy-drop em 3 etapas

- **Problema:** `change_column :orders, :amount, :bigint` reescreve a tabela inteira; pode falhar se cast e impossivel
- **Padrao (PATTERNS.md):** step 1: `add_column :orders, :amount_cents, :bigint`; step 2: backfill em batches separados; step 3: migrar referencias de codigo para nova coluna, depois `remove_column :orders, :amount`
- **Quando usar:** toda mudanca de tipo em coluna populada em producao
- **Quando NAO usar:** sem excecao para tabelas com dados — sempre usar add-copy-drop

### Pattern: `strong_migrations` como CI gate

- **Problema:** dev experiente esquece pattern de seguranca em PR de migration; revisao manual falha
- **Padrao (SKILL.md):** `strong_migrations` gem falha o CI em DSL inseguro; se o projeto nao usa a gem, aplicar as mesmas regras manualmente
- **Quando usar:** apps com deploy zero-downtime e tabelas em producao
- **Quando NAO usar:** prototipos sem requisito de zero-downtime

## Anti-padroes

### Anti-pattern: Schema change + backfill combinados em uma migration

- **Sintoma:** `add_column :users, :status, :string` seguido de `User.update_all(...)` na mesma migration
- **Por que e ruim (SKILL.md HARD-GATE):** transacao longa + lock prolongado; em tabelas grandes, deploy trava em producao
- **Correcao:** separar em dois deploys — migration DDL primeiro; backfill em job ou rake task separado depois

### Anti-pattern: Remove column sem remover referencias de codigo antes

- **Sintoma:** `remove_column :orders, :legacy_field` sem `ignored_columns` no deploy anterior
- **Por que e ruim (SKILL.md Common Mistakes):** instancias antigas do app ainda em execucao durante rolling deploy acessam a coluna e crasham
- **Correcao:** dois deploys — deploy 1 `ignored_columns`; deploy 2 `remove_column`

### Anti-pattern: `add_index` sem `algorithm: :concurrent` em PostgreSQL

- **Sintoma:** `add_index :orders, :processed_at` sem opcoes em tabela grande de producao
- **Por que e ruim (SKILL.md Common Mistakes):** exclusive lock bloqueia writes na tabela PostgreSQL durante a construcao do index
- **Correcao:** `disable_ddl_transaction!` + `add_index ..., algorithm: :concurrent`

### Anti-pattern: NOT NULL antes de backfill completo

- **Sintoma:** `change_column_null :orders, :status, false` antes de confirmar que todos os rows tem valor
- **Por que e ruim (SKILL.md HARD-GATE):** migration falha ou bloqueia tabela aguardando backfill; rollback necessario
- **Correcao:** confirmar backfill completo (zero NULLs na coluna) antes do deploy que enforcar NOT NULL

## Criterios de decisao

| Cenario | Escolha |
|---|---|
| Add coluna nullable em tabela grande | `add_column` direto (sem default NOT NULL) |
| Add coluna NOT NULL em tabela grande | 3 deploys: add nullable → backfill → enforce NOT NULL |
| Add index em tabela PostgreSQL com volume | `disable_ddl_transaction!` + `algorithm: :concurrent` |
| Rename coluna em producao | Add-copy-migrate-drop em 3+ deploys |
| Drop coluna em producao | Deploy 1: `ignored_columns`; Deploy 2: `remove_column` |
| FK constraint em tabela grande | `add_foreign_key validate: false` → `validate_foreign_key` |
| Mudanca de tipo de coluna | Add nova coluna + backfill + remove antiga (add-copy-drop) |
| Backfill > volume trivial | Job separado em batches; nunca dentro de migration |
| CI gate para migrations | Gem `strong_migrations` ou revisao manual com as mesmas regras |

## Referencias externas

- Skills relacionadas: /architecture, /infrastructure
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-migration-safety/SKILL.md
  - claude-code/knowledge/Rails/rails-migration-safety/PATTERNS.md
