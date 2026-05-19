<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only. Átomo flagged para audit humano CA-08 (D14, D19).
-->

# Fase 06: Átomo `action-view-and-hotwire.md` (T2) — FLAGGED CA-08 audit humano

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup), fase-02 (schema), fase-04 (piloto)
**Visual:** false (markdown, sem UI direta)

---

## O que esta fase entrega

Átomo Tier 2 `docs/knowledge/rails/atoms/action-view-and-hotwire.md` (~150 linhas), condensando layouts/partials, Turbo Frames vs Turbo Streams, Stimulus controllers naming + lifecycle, form helpers (`form_with`), partial rendering com `render collection:`, view caching. Cobre o ângulo Rails-specific (Hotwire — Turbo + Stimulus + Strada — é Rails 7+ default) que `/design-patterns` cobre como princípio cross-stack de UI state management. **Átomo flagged CA-08 (D14, D19): após verifier refined da fase-09, Luiz revisa pessoalmente e assina em STATE.md global da feature.**

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/action-view-and-hotwire.md` | Create | Átomo completo (~150 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar dedup para `rails-stack-conventions` (fonte para form helpers + partials) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` STATE.md global. Confirmar decisão para `rails-stack-conventions` vs `v2` (fonte primária — view conventions). Sem decisão aprovada, **BLOQUEAR**.

Fontes específicas para Hotwire: compass artifacts cobrem Turbo Frames/Streams + Stimulus (Rails 7+ default). Não há par duplicado em `rails-guides` (sem `copy`).

### Passo 2: Frontmatter exato

```yaml
---
topic: action-view-and-hotwire
stack: rails
layer: both
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-guides/PATTERNS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-8afc0f40-76b2-414c-bc2c-d344997397e4_text_markdown.md
tier: 2
triggers: [action view, hotwire, turbo, turbo frames, turbo streams, stimulus, layouts, partials, form_with, render collection, view caching, ERB]
related_skills: [/design-patterns, /architecture, /api-design]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

`layer: both` — Hotwire toca backend (Turbo Streams broadcasting via ActionCable) e frontend (Stimulus controllers no browser).

### Passo 3: Corpo seguindo skeleton fixo do piloto

**Seções (5 — sem API-only):**

1. `# Action View and Hotwire` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 5-7 patterns
4. `## Anti-padrões` — 3-5 armadilhas
5. `## Critérios de decisão` — tabela
6. `## Referências externas`

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 7:

- **Pattern: Turbo Frames para updates locais** — Problema: page reload para mudar UI fragment; Padrão: `<turbo-frame id="user_card">` no template; navigation/form submit dentro do frame atualiza só o conteúdo dele; Quando usar: substituição de fragment isolado (card, modal, navigation tabs); Quando NÃO usar: updates multi-frame coordenados — use Turbo Streams.

- **Pattern: Turbo Streams para mutations broadcast** — Problema: SPA-like real-time updates sem JS custom; Padrão: controller responde com `format.turbo_stream { render turbo_stream: turbo_stream.append('list', partial: 'item', locals: { item: @item }) }`; ou broadcast via `Item.broadcasts_to('items')`; Quando usar: append/replace/remove em listas + real-time (chat, notifications); Quando NÃO usar: state local não-persistente (form draft) — Stimulus controller é mais simples.

- **Pattern: Stimulus controllers — naming convention** — Problema: JS sprinkles desorganizados; Padrão: `app/javascript/controllers/{name}_controller.js`; data attribute `data-controller="name"`; actions `data-action="click->name#method"`; targets `data-name-target="output"`; Quando usar: comportamento client-side reutilizável; Quando NÃO usar: lógica que pertence ao backend — pull para controller Rails + Turbo.

- **Pattern: `render collection:` para listas com partial** — Problema: `<% items.each do |item| %><%= render 'item', item: item %><% end %>` aloca buffer por iteração; Padrão: `<%= render @items %>` ou `<%= render partial: 'item', collection: @items %>` (Rails compila template uma vez); Quando NÃO usar: lógica condicional complexa entre items — extrair para component (ViewComponent gem).

- **Pattern: `form_with` (Rails 5.1+, unified)** — Problema: legacy `form_for` (model-backed) vs `form_tag` (model-less); Padrão: `form_with(model: @user)` (model) ou `form_with(url: ..., scope: :search)` (no model); Quando NÃO usar: forms multi-step que precisam de `accepts_nested_attributes_for` — usar mas com cuidado (nested attrs frágeis).

- **Pattern: View caching com `cache @model`** — Problema: rendering caro repetido; Padrão: `<% cache @post do %>...<% end %>` (auto-expire por updated_at); Russian doll caching com nested caches; Quando usar: partials caras em listas grandes; Quando NÃO usar: views com dados volatile (countdown, real-time stats) — cache de TTL curto via `expires_in`.

- **Pattern: Layouts hierárquicos + `content_for`** — Problema: layout único para toda app; Padrão: `application.html.erb` como base; `content_for :page_title do ... end` no view; `<%= yield :page_title %>` no layout; Quando usar: sidebar/header variável por seção; Quando NÃO usar: divergência radical — criar layout dedicado (`layout 'admin'` no controller).

### Passo 5: Anti-padrões (3-5 armadilhas)

- **Anti-pattern: Logic complexa em ERB (`<% if user.admin? && order.shipped? && ... %>`)** — Sintoma: template ilegível, sem teste; Correção: extrair para helper, decorator (Draper) ou ViewComponent.
- **Anti-pattern: N+1 em partial dentro de loop** — Sintoma: `<%= render @posts %>` onde cada partial chama `post.author.name`; Correção: `@posts = Post.includes(:author).all` no controller.
- **Anti-pattern: Stimulus controller manipulando DOM com `innerHTML`** — Sintoma: XSS via input do usuário; Correção: usar `textContent` ou Turbo Frame para fragment HTML do server.
- **Anti-pattern: Turbo Frame sem fallback non-Turbo** — Sintoma: usuário com JS off vê página em branco; Correção: garantir que link/form funciona com page reload normal (Turbo Frame é progressive enhancement).
- **Anti-pattern: `form_for` (legacy) em código novo** — Sintoma: warnings + perda de features unificadas; Correção: migrar para `form_with`.

### Passo 6: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Substituir fragment isolado | Turbo Frame |
| Append/replace em lista, broadcast | Turbo Stream |
| Comportamento JS reutilizável | Stimulus controller |
| Render lista de items com partial | `render collection:` ou `render @items` |
| Form com model | `form_with(model: ...)` |
| Form sem model | `form_with(url: ..., scope: ...)` |
| Partial caro em listas | `cache @model` (Russian doll) |
| Layout variável por seção | `content_for` + `yield` no layout |

### Passo 7: Referências externas

- Skill: `/design-patterns` para component-based UI (ViewComponent como alternativa a partials complexos)
- Skill: `/architecture` para boundary view ↔ controller ↔ model
- Skill: `/api-design` para Turbo Stream broadcasting via ActionCable
- Source: paths absolutos listados em `sources:`

### Passo 8: Comando para invocar extrator (anti-drift literal)

````
Você é um subagente extrator isolado.
Tarefa: escrever `docs/knowledge/rails/atoms/action-view-and-hotwire.md` seguindo template piloto +
Passo 2 da fase-06.

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

OUTPUT: arquivo gravado em `docs/knowledge/rails/atoms/action-view-and-hotwire.md`. Cap ≤ 200 ln; alvo ~150.
````

---

## Gotchas

- **G1 (cap 200):** Hotwire tem muitos sub-componentes (Turbo Drive, Frames, Streams, Stimulus). Manter foco em 6 patterns + 4 anti-padrões. Turbo Drive (link interception) é meta-feature — citar em "Quando consultar", não dedicar pattern.
- **G2 (anti-drift):** APIs específicas (`broadcasts_to`, `turbo_stream.append`) DEVEM estar na fonte. Se source não cita, descrever qualitativamente.
- **G6 (fonte canônica):** `rails-stack-conventions` vs `v2`. Confirme.
- **G8 (paths absolutos):** sources a partir de `claude-code/knowledge/Rails/`.
- **Local — átomo flagged CA-08:** após verifier refined na fase-09, Luiz revisa pessoalmente. Hotwire mistura fontes (`rails-guides` + `rails-stack-conventions` + compass) — alto risco de drift. Audit humano valida 3 claims aleatórias.
- **Local — Stimulus controller naming:** convenção é importante (filename `users_controller.js` → `data-controller="users"`). Se source não detalha mapping, refletir qualitativamente.

---

## Verificacao

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/action-view-and-hotwire.md`
- [ ] Frontmatter 8 campos + `rails_versions: ['>=7.1']`
- [ ] `topic: action-view-and-hotwire`, `stack: rails`, `layer: both`, `tier: 2`
- [ ] `sources:` apontam para arquivos existentes
- [ ] 5 seções na ordem (sem API-only)
- [ ] ≥5 patterns em "Padrões sênior" com Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] ≥3 anti-padrões
- [ ] Triggers contém: `hotwire`, `turbo`, `turbo frames`, `turbo streams`, `stimulus`, `form_with`
- [ ] `wc -l` entre 130 e 200 (alvo ~150)
- [ ] `grep -c '\[A DEFINIR\]'` retorna 0
- [ ] `bun run harness:validate` passa

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/action-view-and-hotwire.md` exit 0
- `wc -l` retorna entre 130 e 200
- `grep -c '\[A DEFINIR\]'` retorna 0
- Frontmatter parseável; `bun run harness:validate` passa

**Por humano (CA-08 obrigatório):**

- Subagente verifier refined (fase-09) reporta ≥80% das claims auditadas das 3 seções técnicas como rastreáveis para passagem específica das fontes em `sources:`.
- **Luiz** (audit humano flagged CA-08) lê o átomo + cross-check de 3 claims aleatórias contra paths citados em `sources:`. Assinatura em STATE.md global da feature: bloco `## Audit Humano CA-08 (Plano 02)` com linha `action-view-and-hotwire | T2 | Aprovado por Luiz em YYYY-MM-DD | Notas: ...`.
- Leitor sênior Rails 7+ reconhece os patterns Hotwire como decisões idiomáticas, não tutorial de "como funciona Turbo Frame".

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
