---
topic: action-controller-and-routing
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-code-review/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/rails-expert/references/api-development.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
tier: 1
triggers: [controller, routing, strong params, before_action, around_action, session, route constraints, nested resources, RESTful, API-only, ActionController]
related_skills: [/api-design, /security, /architecture]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Action Controller and Routing

## Quando consultar

- Ao escrever ou revisar uma action de controller (params, filtros, session)
- Ao definir rotas (aninhamento, constraints, verbos HTTP)
- Ao escolher session store ou estrategia de auth em apps API-only
- Ao extrair logica de cross-cutting concern para filtros de controller

## Padroes senior

### Pattern: Strong params com whitelist explicita

- **Problema:** mass-assignment de campos sensiveis (ex: `admin: true`) via `permit!`
- **Padrao:** `params.require(:user).permit(:name, :email)` — whitelist explicita por action
- **Quando NAO usar:** `permit!` nunca; em APIs internas com schema validado, strong params ainda util como segunda camada
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.3 — "Strong params with explicit `permit` — no `permit!`"

### Pattern: `before_action` com escopo `only:`/`except:`

- **Problema:** filtros cross-cutting duplicados em cada action, ou herdados sem controle em subclasses
- **Padrao:** `before_action :authenticate, only: [:create, :update, :destroy]`; `before_action` com `only:`/`except:` explícito
- **Quando NAO usar:** logica condicional complexa — extrair para middleware Rack ou concern separado
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.3 — "`before_action` scoped with `only:`/`except:`"

### Pattern: Skinny controller — delegar para servico ou modelo

- **Problema:** fat controller com 800+ linhas de logica de negocio
- **Padrao:** controller fica thin; delega para service object ou model; `respond_to` para multi-format; controller action com mais de 15 linhas de logica e red flag
- **Quando NAO usar:** CRUDs simples nao precisam de service — Rails Way idiomatico assume Active Record rico
- **Fonte:** rails-stack-conventions/SKILL.md Red Flags; wf-3e82e3be Regra 1

### Pattern: Session — cookie store vs ActiveRecord/Redis

- **Problema:** sessoes com dados sensiveis sem criptografia ou que precisam ser revogadas server-side
- **Padrao:** cookie store (default, signed/encrypted); `flash` apenas para mensagens temporarias ao usuario; nao armazenar objetos complexos em session — usar ActiveRecord ou Redis store quando precisar de revogacao
- **Quando NAO usar cookie:** revogacao server-side ou payload > 4KB
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.11 — "No complex objects stored in session; Signed/encrypted cookies for sensitive values"

### Pattern: Route constraints para routing condicional

- **Problema:** routing condicional implementado em logica de controller em vez de na camada de rota
- **Padrao:** `constraints subdomain: 'api' do ... end` ou `constraints(->(req) { ... })` para validacao de formato/IP
- **Quando NAO usar:** logica de autorizacao — extrair para `before_action`
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.2 — "Route constraints where input must be validated"

### Pattern: Nested resources — max um nivel de aninhamento

- **Problema:** `/a/1/b/2/c/3` — URLs longas, controllers acoplados a multiplos recursos pai
- **Padrao:** maximo 1 nivel de aninhamento; `shallow: true` ou top-level com query param para sub-resources
- **Quando NAO usar:** relacionamento essencialmente hierarquico onde o contexto pai e obrigatorio na URL
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.2 — "RESTful `resources`/`resource` — max one level nesting (prefer shallow)"

### Pattern: Acoes RESTful — extrair sub-resources em vez de acoes custom

- **Problema:** acoes custom (`/users/1/promote`) que deveriam ser sub-resources
- **Padrao:** extrair como sub-resource (`/users/1/promotions` POST) ou novo controller; acao genuinamente sem mapeamento REST (ex: `/health`) e excecao aceitavel
- **Quando NAO usar:** quando o recurso nao tem identidade propria — `before_action` pode ser suficiente
- **Fonte:** wf-3e82e3be Regra 1 — "controllers RESTful finos"

## Anti-padroes

### Anti-pattern: `params.permit!` — permite tudo

- **Sintoma:** mass-assignment vulnerability; campos sensiveis gravados sem controle
- **Correcao:** `params.require(:user).permit(:campo1, :campo2)` explicito
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.3

### Anti-pattern: `match` ao inves de verbo HTTP especifico

- **Sintoma:** `match '/foo', to: 'foos#index'` aceita GET+POST+PUT — vetor CSRF
- **Correcao:** `get '/foo'` ou `post '/foo'` com verbo explicito
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.2

### Anti-pattern: Controller com logica de negocio inline

- **Sintoma:** action com 15+ linhas de logica; fat controller dificil de testar
- **Correcao:** extrair service object ou delegar ao model; controller action > 15 linhas de logica = red flag
- **Fonte:** rails-stack-conventions/SKILL.md Red Flags; wf-3e82e3be Regra 1

### Anti-pattern: `before_action` herdado sem skip no descendente

- **Sintoma:** subclasse herda `before_action` indesejado — comportamento implicito
- **Correcao:** `skip_before_action :foo, only: [...]` no controller filho quando necessario
- **Fonte:** rails-code-review REVIEW_CHECKLIST.md sec.3

## Criterios de decisao

| Cenario | Escolha |
|---|---|
| Whitelist de params | `params.require(:recurso).permit(:campo1, :campo2)` |
| Cross-cutting auth/i18n | `before_action` com `only:`/`except:` explicito |
| Revogacao de sessao ou payload > 4KB | ActiveRecord ou Redis store |
| Sessao sem revogacao, payload pequeno | Cookie store (default, signed/encrypted) |
| Resource aninhado > 1 nivel | Shallow nesting ou top-level com query param |
| Routing condicional por subdominio/formato | Route constraint na camada de rotas |
| Acao nao-REST com identidade propria | Sub-resource ou novo controller |

## API-only mode

Para apps Rails API-only (gerados com `rails new --api`):

- **Base class:** `ApplicationController < ActionController::API` em vez de `ActionController::Base` (sem ActionView, cookies, flash)
- **Token auth:** incluir `ActionController::HttpAuthentication::Token::ControllerMethods`; autenticar via `authenticate_with_http_token` lendo o header `Authorization: Bearer ...`; alternativa: JWT com `request.headers['Authorization']`
- **Render JSON:** `render json: @resource` como padrao; sem `render layout:` ou helpers de view
- **CSRF:** desabilitado por padrao em `ActionController::API` — nao chamar `protect_from_forgery`
- **Pular se:** app full-stack com Hotwire/views (usar `ActionController::Base`)

## Referencias externas

- Skill: `/api-design` para REST conventions, status codes, versioning
- Skill: `/security` para CSRF e mass-assignment
- Skill: `/architecture` para fat controller / service object boundary
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-code-review/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/rails-expert/references/api-development.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
