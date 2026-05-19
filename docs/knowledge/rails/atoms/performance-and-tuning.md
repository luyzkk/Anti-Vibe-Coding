---
topic: performance-and-tuning
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-expert/SKILL.md
  - claude-code/knowledge/Rails/rails-expert/references/active-record.md
  - claude-code/knowledge/Rails/rails-code-review/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
tier: 2
triggers: [performance, N+1, includes, preload, eager_load, find_each, load_async, pluck, counter_cache, bulk insert, EXPLAIN, slow query, query optimization, memory]
related_skills: [/api-design, /system-design, /infrastructure]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Performance & Tuning

## Quando consultar

- Ao encontrar N+1 queries em revisão de código ou ao iterar coleções com associações
- Ao otimizar queries que aparecem no APM como gargalos (top-10 lentas)
- Ao iterar sobre datasets grandes que não cabem na memória de um worker
- Ao paralelizar queries independentes em uma mesma action de controller
- Ao revisar PRs com operações bulk (insert/update em lote) ou contagens de associações

## Padrões sênior

### Pattern: `includes` vs `preload` vs `eager_load` para N+1

- **Problema:** iterar uma coleção e acessar uma associação dispara uma query por registro (N+1)
- **Padrão:**
  - `includes(:author)` — Rails decide entre subquery ou JOIN dependendo do contexto
  - `preload(:author)` — força subquery separada; evita blow-up de cardinalidade em JOINs com `has_many`
  - `eager_load(:author)` — força LEFT OUTER JOIN; necessário quando filtra por coluna da associação no `where`
  ```ruby
  # BAD — triggers N+1
  posts = Post.all
  posts.each { |post| puts post.author.name }

  # GOOD — eager load association
  posts = Post.includes(:author).all

  # GOOD — eager_load forces a JOIN (useful when filtering on association)
  posts = Post.eager_load(:author).where(authors: { verified: true })
  ```
- **Quando usar `eager_load`:** quando o `where` filtra por coluna do modelo associado
- **Quando NÃO usar `eager_load`:** associação `has_many` sem filtro — `preload` evita JOIN que multiplica rows

### Pattern: `find_each` para iteração de datasets grandes

- **Problema:** `User.where(active: true).each { |u| ... }` carrega todos os registros em memória de uma vez
- **Padrão:** `Model.find_each(batch_size: 1000) { |record| ... }` ou `find_in_batches { |batch| ... }` para controlar footprint de RAM
  ```ruby
  User.find_each(batch_size: 1000) do |user|
    user.process_something
  end
  ```
- **Quando usar:** qualquer iteração sobre coleção grande (relatórios, backfills, jobs noturnos)
- **Quando NÃO usar:** coleções pequenas garantidamente limitadas — overhead de batching desnecessário

### Pattern: `load_async` para queries paralelas em controllers

- **Problema:** action de controller com múltiplas queries independentes roda sequencialmente
- **Padrão (Rails 7+):** `@posts = Post.published.load_async` e `@users = User.active.load_async` — Rails inicia as queries em threads de background e materializa ao primeiro acesso na view
- **Quando usar:** controller com 2+ queries independentes onde a soma dos tempos é maior que o máximo individual
- **Quando NÃO usar:** queries dependentes (resultado de uma alimenta outra) — `load_async` não resolve dependência de dados

### Pattern: `pluck` e `pick` para projeção de atributos

- **Problema:** `User.where(active: true).map(&:email)` instancia um objeto AR por registro apenas para extrair um atributo
- **Padrão:** `User.where(active: true).pluck(:email)` retorna array direto do DB sem instanciar AR; `pick(:email)` para um único valor
- **Quando usar:** quando o código só precisa de um ou alguns atributos escalares — `pluck > map(&:column)`
- **Quando NÃO usar:** quando o código precisa do objeto AR completo para métodos de instância ou callbacks

### Pattern: `counter_cache` para contagens de associação

- **Problema:** `Post.all.each { |p| p.comments.count }` dispara uma query COUNT por post
- **Padrão:** `belongs_to :post, counter_cache: true` + coluna `comments_count` no migration — Rails mantém o contador automaticamente; acesso via `post.comments_count` sem query adicional
- **Quando usar:** contagem de `has_many` exibida em listas ou índices com frequência
- **Quando NÃO usar:** associação acessada raramente ou com condições (WHERE sobre itens da associação) — `counter_cache` conta todos, não sub-conjuntos

### Pattern: `insert_all` / `upsert_all` para operações bulk

- **Problema:** `records.each { |r| Model.create!(r) }` dispara N INSERTs individuais
- **Padrão:** `Model.insert_all(array_of_hashes)` ou `upsert_all` para upsert — uma única query SQL com múltiplas rows
- **Quando usar:** backfills, imports de dados, seed scripts com centenas ou milhares de rows
- **Quando NÃO usar:** records que precisam de callbacks AR (`before_save`, `after_create`) — `insert_all` bypassa callbacks e validações

### Pattern: `EXPLAIN` para diagnóstico de queries lentas

- **Problema:** query lenta sem saber se falta índice ou se o planejador escolheu Seq Scan
- **Padrão:** `Post.where(...).explain` no console Rails retorna o plano de execução; `EXPLAIN` para slow queries antes de merges (checklist item)
- **Quando usar:** toda query nos top-10 do APM ou com tempo > threshold de revisão
- **Quando NÃO usar:** queries triviais (acesso por PK, pequenas tabelas) — foco em queries com Seq Scan em tabelas grandes

## Anti-padrões

### Anti-pattern: `.includes` sem `references` quando filtra por coluna da associação

- **Sintoma:** `Post.includes(:author).where("authors.name = ?", q)` pode gerar 2 queries separadas em vez de JOIN, perdendo o filtro silenciosamente
- **Correção:** `.includes(:author).references(:authors)` força o JOIN; ou trocar diretamente por `.eager_load(:author)` que já força LEFT OUTER JOIN

### Anti-pattern: `present?` no lugar de `exists?` para checar existência

- **Sintoma:** `Post.where(published: true).present?` carrega registros em memória apenas para checar se há algum
- **Correção:** `Post.where(published: true).exists?` emite um `SELECT 1 LIMIT 1` — sem instanciar objetos AR

### Anti-pattern: Iterar coleção grande sem batching

- **Sintoma:** `User.where(active: true).each { |u| send_report(u) }` em job noturno; worker esgota RAM em produção
- **Correção:** `User.where(active: true).find_each { |u| send_report(u) }` — batch 1000 por padrão

### Anti-pattern: `map` para extrair atributos simples

- **Sintoma:** `User.all.map(&:email)` instancia N objetos AR, usa muito mais memória e é mais lento que uma projeção SQL
- **Correção:** `User.pluck(:email)` — retorna array diretamente do banco, sem objetos AR

### Anti-pattern: N+1 em associations sem `includes`

- **Sintoma:** `posts.each { |p| p.author.name }` gera N queries de SELECT adicional — visível no log de desenvolvimento como linhas repetidas de `SELECT * FROM users WHERE id = ?`
- **Correção:** `Post.includes(:author)` antes do loop; adicionar índice nos FKs usados no JOIN

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| N+1 sem filtro por coluna do associado | `preload(:assoc)` |
| N+1 com `where` filtrando coluna do associado | `eager_load(:assoc)` |
| N+1 com `includes` e filtro por string de coluna | `includes(:assoc).references(:assocs)` |
| Checar existência de registro | `exists?` (não `present?`) |
| Extrair atributo escalar de coleção | `pluck(:col)` (não `map(&:col)`) |
| Contagem de `has_many` em lista/índice | `counter_cache: true` |
| Iteração sobre dataset grande | `find_each(batch_size: 1000)` |
| Múltiplas queries independentes em uma action | `load_async` (Rails 7+) |
| INSERT de centenas de rows | `insert_all` / `upsert_all` |
| Query lenta no APM | `EXPLAIN` + verificar Seq Scan + adicionar índice |
| Coluna usada em `WHERE`, `JOIN` ou `ORDER BY` | Adicionar índice no migration |

## Referências externas

- Skills relacionadas: /api-design (N+1 e pagination cross-stack), /system-design (cache layer, latência P99), /infrastructure (indexing strategy, DB tuning)
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-expert/SKILL.md
  - claude-code/knowledge/Rails/rails-expert/references/active-record.md
  - claude-code/knowledge/Rails/rails-code-review/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
