<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only. Inclui seção API-only mode (D7) embutida no átomo.
-->

# Fase 03: Átomo `action-controller-and-routing.md` (T1) — inclui seção API-only mode (D7)

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup), fase-02 (schema), fase-04 (piloto)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 1 `docs/knowledge/rails/atoms/action-controller-and-routing.md` (~150 linhas), condensando strong parameters, sessions (cookie vs DB), before_actions/around_actions, route constraints (subdomain/format), nested resources cap, RESTful conventions. **Inclui seção `## API-only mode` (D7)** com deltas para apps Rails sem ActionView/cookies (JSON renderers, token auth). Cobre o ângulo Rails-specific (params hash, ActionController::API base class, routes DSL) que `/api-design` cobre como princípio cross-stack de REST.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/action-controller-and-routing.md` | Create | Átomo completo (~150 linhas) com seção API-only mode embutida |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar dedup para `rails-stack-conventions` (fonte primária) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` STATE.md global. Confirmar decisão para `rails-stack-conventions` vs `v2`. Sem decisão aprovada, **BLOQUEAR**.

### Passo 2: Frontmatter exato

```yaml
---
topic: action-controller-and-routing
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-stack-conventions/BACKENDS.md
  - claude-code/knowledge/Rails/rails-expert/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
tier: 1
triggers: [controller, routing, strong params, before_action, around_action, session, route constraints, nested resources, RESTful, API-only, ActionController]
related_skills: [/api-design, /security, /architecture]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

### Passo 3: Corpo seguindo skeleton fixo do piloto

**Seções (6 — inclui API-only mode):**

1. `# Action Controller and Routing` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 5-7 patterns
4. `## Anti-padrões` — 3-5 armadilhas
5. `## Critérios de decisão` — tabela
6. `## API-only mode` — 2-3 deltas para apps API-only (D7) — **scaffolding editorial, verifier NÃO audita**
7. `## Referências externas`

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 7:

- **Pattern: Strong parameters (`params.require(:user).permit(:name, :email)`)** — Problema: mass-assignment de campos sensíveis (admin: true); Padrão: whitelist explícita por controller; Quando NÃO usar: APIs internas com schema validado por dry-validation — strong params ainda útil como segunda camada.
- **Pattern: `before_action :authenticate, only: [...]`** — Problema: cross-cutting concerns duplicados; Padrão: `before_action` para auth/i18n/setup; `only:`/`except:` para escopo; Quando NÃO usar: lógica condicional complexa — extrair para `prepend_around_action` ou rack middleware.
- **Pattern: `around_action` para timing + recursos** — Problema: setup/teardown emparelhados; Padrão: `around_action :with_timing { |_, block| t = Time.now; block.call; logger.info(...) }`; Quando NÃO usar: side effect simples — `before_action` + `after_action` é mais legível.
- **Pattern: Session store — cookie vs DB vs Redis** — Problema: scaling + revogação; Padrão: cookie store (default, signed/encrypted, ≤4KB); ActiveRecord/Redis store para sessions invalidáveis (logout server-side); Quando NÃO usar cookie: precisa revogar sessions ativas ou armazenar > 4KB.
- **Pattern: Route constraints (subdomain/format/regex)** — Problema: routing condicional; Padrão: `constraints subdomain: 'api' do ... end` ou `constraints(->(req) { ... })`; Quando NÃO usar: lógica de autorização — extrair para before_action.
- **Pattern: Nested resources cap (1 nível)** — Problema: `resources :a do resources :b do resources :c end end` gera URLs como `/a/1/b/2/c/3`; Padrão: máximo 1 nível de aninhamento; subnested → shallow nesting ou top-level com query param; Quando NÃO usar: relacionamento essencialmente hierárquico (raríssimo).
- **Pattern: RESTful actions only (`index/show/new/create/edit/update/destroy`)** — Problema: ações custom (`/users/1/promote`) viram tentação; Padrão: extrair sub-resource (`/users/1/promotions` POST) ou state machine como sub-controller; Quando NÃO usar: action genuinamente sem mapeamento REST (ex: `/health`).

### Passo 5: Anti-padrões (3-5 armadilhas)

- **Anti-pattern: `params.permit!` (permite tudo)** — Sintoma: mass-assignment vulnerability; Correção: `params.require(...).permit(:campo1, :campo2)` explícita.
- **Anti-pattern: `before_action` com mutate de instance var sem skip em descendant** — Sintoma: subclass herda comportamento indesejado; Correção: `skip_before_action :foo, only: [...]` no controller filho.
- **Anti-pattern: Routes com `match` ao invés de verb específico** — Sintoma: `match '/foo', to: 'foos#index'` aceita GET+POST+PUT — vector CSRF/leak; Correção: `get '/foo'` ou `post '/foo'`.
- **Anti-pattern: Controller com 800+ ln + lógica de negócio** — Sintoma: fat controller; Correção: extrair service object ou form object (`UserSignupForm.new(params).save`).

### Passo 6: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Whitelist de params | Strong params `permit(:campo1, :campo2)` |
| Cross-cutting auth/i18n | `before_action` com `only:`/`except:` |
| Setup + teardown emparelhados | `around_action` |
| Session < 4KB sem revogação server | Cookie store |
| Session com revogação ou > 4KB | ActiveRecord ou Redis store |
| Resource aninhado > 1 nível | Shallow nesting ou top-level |
| Ação não-REST | Sub-resource ou novo controller |

### Passo 7: API-only mode (D7 — seção embutida)

```markdown
## API-only mode

Para apps Rails API-only (gerados com `rails new --api`):

- **Base class:** `ApplicationController < ActionController::API` (sem ActionView/cookies/flash)
- **Renderers:** `render json: ...` é default; remover ActionView helpers (`render layout:`)
- **Auth:** usar token via `Authorization: Bearer ...` header (Devise + JWT ou `authenticate_with_http_token`)
- **CSRF:** já desabilitado por padrão em `ActionController::API` — não chame `protect_from_forgery`
- **Sessions:** middleware de session opcional; geralmente removido (`config.session_store :disabled` ou middleware stack puro API)
- **Pular se:** app monolítico full-stack com Hotwire/views (use `ActionController::Base`)
```

Esta seção é **editorial/scaffolding** (equivalente a "Quando consultar") — verifier refined da fase-09 NÃO audita. Audit cobre apenas Padrões sênior + Anti-padrões + Critérios de decisão.

### Passo 8: Referências externas

- Skill: `/api-design` para REST conventions, status codes, versioning
- Skill: `/security` para CSRF (cross-link com `security-csrf-and-brakeman`)
- Skill: `/architecture` para fat controller / service object boundary
- Source: paths absolutos listados em `sources:`

### Passo 9: Comando para invocar extrator (anti-drift literal)

````
Você é um subagente extrator isolado.
Tarefa: escrever `docs/knowledge/rails/atoms/action-controller-and-routing.md` seguindo template
piloto + Passo 2 da fase-03-action-controller-and-routing.md. Incluir seção `## API-only mode` (D7)
entre `## Critérios de decisão` e `## Referências externas`.

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

OUTPUT: `docs/knowledge/rails/atoms/action-controller-and-routing.md`. Cap ≤ 200 ln; alvo ~150.
````

---

## Gotchas

- **G1 (cap 200):** seção API-only adiciona ~12-15 ln. Patterns precisam ficar em 18-20 ln cada. Margem apertada — extrator deve condensar exemplos longos.
- **G2 (anti-drift):** strong params API exemplos (`Authorization: Bearer`) — confirmar se está no source antes de escrever.
- **G6 (fonte canônica):** `rails-stack-conventions` vs `v2`. Confirme.
- **G7 (API-only é scaffolding):** seção `## API-only mode` é editorial. Verifier NÃO audita — equivalente a "Quando consultar". Não incluir claims técnicas profundas nessa seção; movê-las para Padrões sênior se forem rastreáveis.
- **G8 (paths absolutos):** `sources:` paths a partir de `claude-code/knowledge/Rails/`.
- **Local — RESTful actions:** o pattern "RESTful only" é controverso em fontes diferentes (compass pode citar exceções). Se source canônico aceita exceções pragmáticas (`/health`, `/sitemap`), refletir essa nuance em "Quando NÃO usar".

---

## Verificacao

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/action-controller-and-routing.md`
- [ ] Frontmatter 8 campos + `rails_versions: ['>=7.1']`
- [ ] `topic: action-controller-and-routing`, `stack: rails`, `layer: backend`, `tier: 1`
- [ ] `sources:` apontam para arquivos existentes
- [ ] 6 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / **API-only mode** / Referências externas
- [ ] ≥5 patterns em "Padrões sênior"
- [ ] ≥3 anti-padrões
- [ ] Seção API-only com 5-6 bullets (≤15 linhas)
- [ ] Triggers contém: `controller`, `routing`, `strong params`, `before_action`, `RESTful`, `API-only`
- [ ] `wc -l` entre 130 e 200 (alvo ~150)
- [ ] `grep -c '\[A DEFINIR\]'` retorna 0
- [ ] `bun run harness:validate` passa

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/action-controller-and-routing.md` exit 0
- `wc -l` retorna entre 130 e 200
- `grep '## API-only mode' docs/knowledge/rails/atoms/action-controller-and-routing.md` retorna 1 match
- `grep -c '\[A DEFINIR\]'` retorna 0
- Frontmatter parseável; `bun run harness:validate` passa

**Por humano:**

- Não flagged CA-08 humano. Verifier refined da fase-09 valida — audita apenas Padrões sênior + Anti-padrões + Critérios de decisão; seção API-only é scaffolding (G7).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
