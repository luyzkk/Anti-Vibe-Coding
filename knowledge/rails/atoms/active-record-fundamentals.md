---
topic: active-record-fundamentals
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/rails-expert/SKILL.md
  - claude-code/knowledge/Rails/rails-code-review/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/compass_artifact_wf-cb73df7d-c2b5-45b7-826c-358b9bafed4d_text_markdown.md
tier: 1
triggers: [active record, querying, includes, preload, eager_load, N+1, callbacks, validations, associations, STI, scopes, find_each, inverse_of]
related_skills: [/api-design, /architecture, /design-patterns]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Active Record — Fundamentals

## Quando consultar

- Ao escrever queries que envolvem associações em loops (risco N+1)
- Ao decidir entre `scope` e class method para queries reutilizáveis
- Ao definir callbacks no model — antes de decidir se pertencem ali
- Ao modelar associações `has_many :through` ou STI
- Ao revisar validações e garantir que constraints do DB complementam as do Rails

## Padrões sênior

### Pattern: `includes` vs `eager_load` vs `preload` para N+1

- **Problema:** iterar sobre associações sem preload dispara uma query por registro (N+1)
- **Padrão:** `includes(:assoc)` — Rails decide entre `preload` (2 queries separadas) e `eager_load` (LEFT OUTER JOIN); use `eager_load` explicitamente quando filtrar pela coluna da associação no `WHERE`; use `preload` quando não há filtro e o JOIN causaria rows cartesianas
- **Quando usar `eager_load`:** `Post.eager_load(:author).where(authors: { verified: true })`
- **Quando NÃO usar `includes` simples:** ao filtrar por coluna da associação sem `.references` — Rails pode gerar 2 queries em vez de JOIN

### Pattern: Scopes vs class methods

- **Problema:** queries reutilizáveis duplicadas por toda a codebase
- **Padrão:** `scope :published, -> { where(published: true) }` para chains compostáveis; class method (`def self.trending(days = 7)`) quando a lógica é condicional complexa ou precisa de early return
- **Quando usar scope:** composição simples, chains com outros scopes ou `where`
- **Quando NÃO usar scope:** lógica com `if`/`return` interno — class method é mais legível

### Pattern: Callbacks — normalização do próprio model, não orquestração

- **Problema:** callbacks executam side effects invisíveis ao chamador (envio de email, criação de outros records)
- **Padrão:** callbacks só para normalização do dado do próprio model (ex: `before_save :normalize_email`); extrair orquestração para service objects
- **Quando usar:** `before_validation :normalize_email`, `before_save :update_slug` — transformações internas
- **Quando NÃO usar:** `after_create :send_welcome_email`, `after_save :notify_admin` — exteriorize em service object ou job

### Pattern: Validations + DB constraints como dupla camada

- **Problema:** `validates :email, uniqueness: true` sem UNIQUE INDEX no DB — race condition cria duplicatas em signup paralelo
- **Padrão:** validação Rails para UX e mensagens i18n; constraint no DB (`NOT NULL`, `UNIQUE INDEX`, FK com `foreign_key: true`) como defesa final
- **Quando usar só validation:** regras de negócio que mudam (ex: campo obrigatório por condição)
- **Quando usar só constraint:** integridade referencial — FK garante no DB mesmo fora do Rails

### Pattern: `has_many :through` para join table com atributos

- **Problema:** relacionamento muitos-para-muitos com atributos na tabela de junção
- **Padrão:** `has_many :through` com model intermediário (`has_many :commented_posts, through: :comments, source: :post`); `inverse_of` em todas as associações bidirecionais
- **Quando usar:** join table com atributos próprios (ex: `Membership` entre `User` e `Group` com `role`)
- **Quando NÃO usar:** join simples sem atributos — `has_and_belongs_to_many` é mais direto

### Pattern: STI — apenas quando subclasses compartilham schema

- **Problema:** hierarquia de models com comportamento diferente mas dados similares
- **Padrão:** uma tabela com coluna `type` + subclasses Ruby (`class Admin < User`); structure order canônico do model: `extends, includes, constants, attributes, enums, associations, delegations, validations, scopes, callbacks, class methods, instance methods`
- **Quando usar:** subclasses com comportamento diferente mas ≥80% dos campos compartilhados (`STI only when justified — shared behavior + same table makes sense`)
- **Quando NÃO usar:** subclasses com schemas muito divergentes — vira tabela com colunas esparsas

### Pattern: `find_each` e `exists?` para performance em batches

- **Problema:** `User.all.each` carrega todos os records em memória; `collection.present?` executa query desnecessária
- **Padrão:** `find_each(batch_size: 1000)` para iterar datasets grandes; `exists?` em vez de `present?` para checar existência; `pluck` para arrays de atributos simples; `insert_all`/`upsert_all` para inserção em bulk
- **Quando usar `load_async` (Rails 7+):** queries paralelizáveis que não dependem uma da outra
- **Quando NÃO usar `find_each`:** quando precisa de ordenação customizada — `find_each` ignora `order`

## Anti-padrões

### `dependent:` ausente em `has_many`/`has_one`

- **Sintoma:** model deletado deixa records órfãos (ou crash de FK) — `has_many :posts` sem `dependent:`
- **Correção:** definir `dependent:` em toda associação `has_many`/`has_one`; para tabelas grandes, preferir `dependent: :destroy_all` com cuidado ou job de cleanup em batch

### Callbacks com lógica cross-model

- **Sintoma:** `after_create :send_welcome_email` em `User` cria `Notification`, enfileira job, escreve log — cascata invisível
- **Correção:** extrair para service object (`Users::Register.call(user)`) ou disparar via `ActiveJob` explicitamente no controller/service

### `validates :email, uniqueness: true` sem UNIQUE INDEX no DB

- **Sintoma:** race condition em criações paralelas gera duplicatas que a validation não pegou
- **Correção:** validation Rails + `add_index :users, :email, unique: true` na migration

### Business logic inline no controller action

- **Sintoma:** action com cálculo de preço, desconto, fluxo multi-step — marcado como `Critical` em code review
- **Correção:** extrair para service object PORO com `.call`; controller coordena, não calcula

### `permit!` em strong params

- **Sintoma:** `params.require(:user).permit!` — permite mass-assignment irrestrito
- **Correção:** listar campos explicitamente: `params.require(:user).permit(:name, :email)`

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Query usa associação no `WHERE` | `eager_load` (single LEFT OUTER JOIN) |
| Query carrega associação para loop sem filtro | `preload` ou `includes` (separate query) |
| Checar existência de registro | `exists?` — não `present?` |
| Iterar dataset grande | `find_each(batch_size: N)` |
| Side effect cross-model após save | Service object ou `ActiveJob` — não callback |
| Subclasses com campos comuns (≥80%) | STI com coluna `type` |
| Subclasses com schemas divergentes | Tabelas separadas com module compartilhado |
| Unicidade garantida em alta concorrência | Validation Rails + UNIQUE INDEX no DB |
| Join table com atributos | `has_many :through` com model intermediário |
| Queries paralelizáveis (Rails 7+) | `load_async` |

## Referências externas

- Skill: `/api-design` — query optimization e paginação cross-stack
- Skill: `/architecture` — Single Responsibility entre AR e service objects
- Skill: `/design-patterns` — callbacks como observer, alternativas com events/services
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/rails-expert/SKILL.md
  - claude-code/knowledge/Rails/rails-code-review/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/compass_artifact_wf-cb73df7d-c2b5-45b7-826c-358b9bafed4d_text_markdown.md
