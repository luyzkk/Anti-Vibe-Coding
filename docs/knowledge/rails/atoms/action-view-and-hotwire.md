---
topic: action-view-and-hotwire
stack: rails
layer: both
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/rails-guides/references/working_with_javascript_in_rails.md
  - claude-code/knowledge/Rails/rails-guides/references/form_helpers.md
  - claude-code/knowledge/Rails/rails-guides/references/layouts_and_rendering.md
  - claude-code/knowledge/Rails/rails-guides/references/action_view_overview.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
tier: 2
triggers: [action view, hotwire, turbo, turbo frames, turbo streams, stimulus, layouts, partials, form_with, render collection, view caching, ERB, content_for, broadcasts]
related_skills: [/design-patterns, /architecture, /api-design]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Action View and Hotwire

## Quando consultar

- Ao escolher entre Turbo Frame (substituição local) e Turbo Stream (append/replace broadcast)
- Ao configurar formulários com ou sem model (`form_with`)
- Ao renderizar listas de partials e avaliar cache
- Ao adicionar comportamento JS client-side via Stimulus controller
- Ao construir layouts com seções variáveis por controller (`content_for`)

## Padrões sênior

### Pattern: Turbo Frames para atualizações de fragment isolado

- **Problema:** reload de página inteira para atualizar um fragmento de UI (card, modal, aba)
- **Padrão:** envolver o fragment em `<turbo-frame id="...">` — links e forms dentro do frame atualizam só o conteúdo dele sem full reload; `turbo_frame_tag` helper gera o wrapper com `dom_id`
- **Exemplo:** `<%= turbo_frame_tag dom_id(post) do %><%= link_to post.title, post_path(post) %><% end %>`
- **Quando usar:** substituição de fragment isolado — in-place editing, lazy load, tabs server-rendered
- **Quando NÃO usar:** múltiplos fragments coordenados numa operação — use Turbo Streams

### Pattern: Turbo Streams para mutations broadcast e multi-fragment

- **Problema:** atualizar listas em tempo real ou múltiplos fragments após uma ação sem JS customizado
- **Padrão:** controller responde com `format.turbo_stream { render turbo_stream: turbo_stream.prepend("posts", partial: "post") }`; ou broadcast do model via `after_create_commit { broadcast_append_to("posts") }` + `<%= turbo_stream_from "posts" %>` no template
- **Quando usar:** append/replace em listas, real-time (chat, notificações), multi-fragment coordenado
- **Quando NÃO usar:** estado local não-persistente (draft de form) — Stimulus controller é mais simples

### Pattern: Turbo Stream broadcasts só via `after_commit`

- **Problema:** broadcast dentro de transação dispara antes do commit — receptor recebe WebSocket antes do dado estar no DB
- **Padrão:** usar `after_create_commit` / `after_update_commit` (não `after_create` ou `after_save`) para garantir que o DB commitou antes de notificar clientes
- **Fonte:** wf-a0aa55c4 RAILS-HOTWIRE-001
- **Quando usar:** sempre que `broadcasts_to` ou `broadcast_*` forem usados no model

### Pattern: Forms com `form_with` — unified helper Rails 5.1+

- **Problema:** `form_for` (model-backed) e `form_tag` (sem model) — dois helpers; duplicação e inconsistência
- **Padrão:** `form_with(model: @post)` para forms com model (Rails infere URL e method via Record Identification); `form_with(url: "/search", method: :get)` para forms sem model; ambos geram CSRF token automaticamente em submissões não-GET
- **Quando usar:** sempre — `form_with` é o helper unificado desde Rails 5.1
- **Quando NÃO usar:** `form_for`/`form_tag` em código novo — são legacy

### Pattern: `render @collection` para listas de partials

- **Problema:** `@items.each { |i| render 'item', item: i }` aloca buffer por iteração
- **Padrão:** `<%= render @products %>` (shorthand) — Rails infere partial `_product.html.erb` pelo nome do model; equivalente verbose: `render partial: "product", collection: @products`
- **Quando usar:** listas homogêneas ou heterogêneas (Rails escolhe partial por model name em coleções mistas)
- **Quando NÃO usar:** lógica condicional complexa entre items — extrair para ViewComponent; partials de 200+ linhas com `if/else` são sinal de ViewComponent

### Pattern: `content_for` + `yield` para layouts com seções variáveis

- **Problema:** layout único precisa de sidebar, title ou scripts que variam por controller/action
- **Padrão:** no layout: `<%= yield :page_title %>` e `<%= yield %>` (body principal); na view: `<% content_for :page_title do %>Título<% end %>`; `content_for?(:sidebar)` para seções opcionais
- **Quando usar:** sidebar/header/scripts variáveis por seção; nested layouts via sub-templates
- **Quando NÃO usar:** divergência radical de layout — criar layout dedicado e apontar com `layout 'admin'` no controller

## Anti-padrões

### Anti-pattern: Turbo Stream broadcast dentro de transação (antes de `commit`)

- **Sintoma:** WebSocket chega ao cliente antes do record estar visível no DB; race condition em leituras imediatas
- **Correção:** `after_create_commit` / `after_update_commit` em vez de `after_create` / `after_save`
- **Fonte:** wf-a0aa55c4 RAILS-HOTWIRE-001

### Anti-pattern: Form com status 200 em validação inválida (Turbo quebra)

- **Sintoma:** Turbo espera `422 Unprocessable Entity` para re-renderizar o form com erros; status 200 faz Turbo interpretar como sucesso e não exibir os erros
- **Correção:** `render :new, status: :unprocessable_entity` em falha de validação; `redirect_to` (303) em sucesso
- **Fonte:** wf-a0aa55c4 RAILS-HOTWIRE-003

### Anti-pattern: Stimulus controller com estado global ou DOM manipulation irrestrita

- **Sintoma:** controller acessa elementos fora do seu scope; estado compartilhado entre instâncias; `innerHTML` com input do usuário
- **Correção:** Stimulus controllers pequenos, escopados, sem estado global; lógica que pertence ao backend — extrair para controller Rails + Turbo
- **Fonte:** wf-a0aa55c4 RAILS-HOTWIRE-004; SKILL.md "Business logic in views → Use helpers or Stimulus controllers"

### Anti-pattern: N+1 em partial dentro de loop

- **Sintoma:** `<%= render @posts %>` onde cada partial chama `post.author.name` sem preload
- **Correção:** `@posts = Post.includes(:author).all` no controller antes de passar para a view
- **Fonte:** SKILL.md "N+1 queries in loops → Eager load with `includes`"

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Substituir fragment isolado (card, modal, aba) | Turbo Frame |
| Append/replace em lista após ação | Turbo Stream (controller) |
| Real-time para todos os clientes | Turbo Stream broadcast (`after_commit`) |
| Comportamento JS reutilizável e escopado | Stimulus controller |
| Render lista de items com partial | `render @collection` |
| Form com model ActiveRecord | `form_with(model: @record)` |
| Form sem model (busca, filtro) | `form_with(url: ..., method: :get)` |
| Layout com seções variáveis | `content_for` + `yield :nome` no layout |
| Partial com lógica de apresentação em 3+ lugares | ViewComponent |

## Referências externas

- Skill: `/design-patterns` — ViewComponent como alternativa a partials complexos
- Skill: `/architecture` — boundary view ↔ controller ↔ model
- Skill: `/api-design` — Turbo Stream broadcasting; API-only exclui ActionView/Hotwire (wf-a0aa55c4 RAILS-API-001)
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/rails-guides/references/working_with_javascript_in_rails.md
  - claude-code/knowledge/Rails/rails-guides/references/form_helpers.md
  - claude-code/knowledge/Rails/rails-guides/references/layouts_and_rendering.md
  - claude-code/knowledge/Rails/rails-guides/references/action_view_overview.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
