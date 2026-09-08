# Plano 04: Os outros tres adaptadores + multi-stack

**Feature:** Matriz Rota x Middleware de Auth no Auditor ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~8.5h (PLAN.md diz ~7.5h — ver MEMORY DEV-plan-1)
**Depende de:** Plano 01 (contrato congelado + `RULE_MATCHERS`), Plano 02 (allowlist, PR #75); Plano 03 SO para as fases 04/05 (`AuditOptions.adapter?` e os metodos opcionais de G2 — planejado, nao executado)
**Desbloqueia:** fechamento da feature (CA-08 e CA-11 sao os ultimos CAs abertos); RF-07 (full-surface) num plano futuro

---

## O que este plano entrega

Ao final, as quatro stacks do PRD tem adaptador nativo atras do MESMO contrato: Rails le
`config/routes.rb` + `before_action` (com heranca de `ApplicationController`), Express le
`app.<verb>`/`router.<verb>` + `use` na cadeia por linha, Python le decorators FastAPI/Flask e
`urls.py` do Django + `Depends`/`login_required`/middleware. `detectStack()` escolhe os adaptadores;
monorepo roda varios e cada finding diz `[<stack>]` (CA-11). O que o adaptador nao consegue
resolver vira `Route.unresolved` → `indeterminada` medium — nunca `coberta` (CA-05, RF-09). Um gate
e2e com uma fixture por stack prova que o shape serve as quatro (CA-08) e mede a taxa de
`indeterminada` que a Premissa 3 do PRD exige antes de manter cada adaptador.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Contrato congelado: `Route { method, path, file, line, stack, handler? }`, `CoverageRule = path-pattern \| opaque`, `CoverageMap`, `RouteAdapter { stack; enumerate; readCoverage }`, type guards `isRoute`/`isHttpMethod` | Plano 01 fase-02 | pronto — `skills/security/lib/route-auth-matrix.types.ts` |
| `RULE_MATCHERS` hash map por `kind` com fallback `unsure` → `indeterminada`; `evaluateRoute`, `severityFor`, `auditRouteCoverage` SINCRONA com `nextjsAdapter` hardcoded; `buildContractIssues`; CLI | Plano 01 fase-05 | pronto — `route-auth-matrix.ts` |
| Padrao de adaptador (enumeracao por filesystem + `parseMatcherConfig` PURA + `matcherToRegExp` subset path-to-regexp v6 + `probesFor`) e padrao de teste (34→40 testes) | Plano 01 fases 03/04 | pronto — `route-auth-nextjs.ts` / `.test.ts` |
| `parsePublicRoutes` → `{ entries, rejected, wide, notes }`; `isWideEntry` com `WIDE_PATTERNS = [/\*/, /(^|\/):[A-Za-z_]/, /\(/]`; `matchAllowlist` por igualdade exata; `readAtBaseFromGit`; `diffAllowlist` | Plano 02 (PR #75) | pronto na branch — `public-routes-allowlist.ts`, `route-auth-matrix.ts` |
| `indeterminada` emite finding `medium` (`SEVERITY_BY_VERDICT`) — toda regra `opaque` e todo `unresolved` deste plano viram issue visivel | Plano 02 fase-03 | pronto |
| `detectStack(targetDir): Promise<DetectedStack>` ASSINCRONA, `StackId`, `primary` + `secondary`; `parseRailsAnchor` | `skills/init/lib/detect-stack.ts`, `rails-anchor.ts` | pronto — le SO manifests da raiz (DP-13) |
| Secao 11 de `agents/security-auditor.md`: comando Bash unico, saida `{ issues, summary }`, bullets aditivos dos Planos 02/03 | Planos 01/02 (03 planejado) | pronto no checkout; ausente no cache do plugin (G1) |
| **SO fases 04/05:** `AuditOptions.adapter?: RouteAdapter` (seam G14) e `RouteAdapter.isCoverageFile?`/`readCoverageAtBase?` opcionais + `verdictFor` + `summary.g2` | Plano 03 fases 01/03 (DP-2, DP-3) | **planejado, nao executado** — ver "Ponto de coordenacao com o Plano 03" abaixo |
| Knowledge: `knowledge/rails/atoms/action-controller-and-routing.md`, `knowledge/python/atoms/architecture-and-di-fastapi.md`, `knowledge/python/atoms/security-fastapi-owasp.md` | repo | pronto — fontes que os adaptadores Rails e Python citam (nao ha atom de roteamento Express: o adaptador e source-driven pela doc oficial do Express 4.x/5.x) |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| `CoverageRule` variante `handler-chain` (DP-1) e `Route.unresolved?` (DP-2) — o contrato que RF-07 (full-surface) e qualquer adaptador futuro (Laravel, Go) reusam | plano futuro RF-07; stacks sem knowledge (Out of Scope do PRD) |
| `route-auth-heuristics.ts` (`isAuthName`, `splitByAuthName`, utilitarios de texto `lineOf`/`readBalanced`/`splitTopLevel`) | os tres adaptadores novos; `route-auth-nextjs.ts` passa a importar os utilitarios daqui |
| `route-auth-adapters.ts` (`ADAPTERS`, `selectAdapters`) e `auditProject()` assincrona + `ProjectAuditResult`/`ProjectSummary` (DP-8) | CLI da secao 11 do agente; `verify-work` (le `issues` no topo, inalterado); RF-07 (troca `changedFiles` por full-surface no mesmo loop) |
| Fixtures `rails-minimal`, `express-minimal`, `python-fastapi-minimal`, `monorepo-next-rails` + gate `tests/e2e/route-auth-four-stacks.test.ts` (DP-10/DP-11) | G2 por stack (follow-up): cada adaptador que implementar `readCoverageAtBase` reusa a fixture |
| Taxa de `indeterminada` por stack registrada no MEMORY (Premissa 3) | decisao de manter/cortar adaptador nesta versao (fase-05) |

### Ponto de coordenacao com o Plano 03

As fases 01–03 deste plano NAO dependem do Plano 03 (implementam `RouteAdapter` contra o contrato
congelado). A fase-04 precisa do seam `AuditOptions.adapter?` (Plano 03 fase-03, G14). Se o Plano 04
for executado ANTES do Plano 03 mergear, a fase-04 introduz `AuditOptions.adapter?: RouteAdapter`
com o MESMO shape (default `nextjsAdapter`) e o Plano 03 o herda ao rebasear — registrar como DI.
Se o Plano 03 ja estiver mergeado: (a) o curto-circuito de `unresolved` (DP-2) entra em
`verdictFor`, nao so em `evaluateRoute`; (b) a promocao de candidatas amplas (DP-7) e aplicada tambem
em `readAllowlistAtBase` (ponta antes), senao `/posts/:id` declarada e promovida hoje apareceria como
"perdida" no G2. Os dois sao uma linha cada; a fase-01 e a fase-04 dizem onde.

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-adaptador-rails.md | Passo 0 (pre-requisito dos tres adaptadores): `Route.unresolved?` + curto-circuito, `handler-chain` no contrato e no `RULE_MATCHERS`, `opaque.handler?` (escopo), G13 resolvido por promocao de candidatas amplas (DP-7), `route-auth-heuristics.ts`; depois `route-auth-rails.ts` (routes.rb subset + `before_action` com heranca/only/except/skip) e fixture `rails-minimal` | 2h | — |
| 02 | fase-02-adaptador-express.md | `route-auth-express.ts` (regex/linha sobre `.ts/.js/.mjs/.cjs`; `app.<verb>`/`router.<verb>`/`app.use`/mount de router importado 1 nivel/`app.route()`), `hasExpress()`, fixture `express-minimal` em `.mjs`; CA-05; Premissa 3 medida | 2h | fase-01 |
| 03 | fase-03-adaptador-python.md | `route-auth-python.ts` com tres dialetos (FastAPI primeira classe; Flask; Django so enumeracao), fixture `python-fastapi-minimal`; Flask/Django por testes inline | 2h | fase-01 |
| 04 | fase-04-multi-stack-detect-stack.md | `route-auth-adapters.ts` (`ADAPTERS` por `StackId`, `applies`, `skipped` com razao), `auditProject()` assincrona sobre `detectStack()`, prefixo `[<stack>]`, CLI, summary por stack, secao 11 aditiva, fixture `monorepo-next-rails`; CA-11 | 1.5h | fases 01–03; Plano 03 fase-03 (ou DI de coordenacao) |
| 05 | fase-05-gate-e2e-quatro-fixtures.md | `tests/e2e/route-auth-four-stacks.test.ts`: golden inline por stack + monorepo; corte da Premissa 3 (taxa > 0.25 → adaptador sai do registro); fechamento do MEMORY (a feature fecha aqui) | 1h | fase-04 |

---

## Grafo de Fases

```
fase-01 (Passo 0: contrato aditivo + heuristics + G13 → adaptador Rails)
    |
    +------------------------------+
    |                              |
    v                              v
fase-02 (Express)            fase-03 (Python)
    |                              |
    +--------------+---------------+
                   |
                   v
           fase-04 (registro por StackId + auditProject + CA-11)
                   |
                   v
           fase-05 (gate e2e CA-08 + corte Premissa 3 + fechamento)
```

**Paralelismo possivel:** fase-02 e fase-03 sao paralelizaveis em principio — arquivos de codigo
disjuntos (`route-auth-express.*` vs `route-auth-python.*`, fixtures distintas) e nenhuma edita o
motor (o Passo 0 da fase-01 ja deixou tudo que elas precisam). **Recomendado sequencial** (02 → 03):
as duas editam o MESMO `plano04/MEMORY.md` (taxa de indeterminada, DI/GT) e o mesmo `plugin-manifest.json`,
e a sessao tem um executor so — corrida no MEMORY custa mais que os ~2h que se ganharia. fase-04 e
fase-05 aguardam as tres. Entre planos: este plano corre em paralelo com o Plano 03 ate a fase-03;
a fase-04 e o ponto de encontro (ver acima).

---

### Política de fases (perfil-aware)

**Granularidade:** Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)
**Critério de fase atômica:** Testável, atomicamente revertível, sizing 30min-2h
**Exemplo de nome de fase:** `fase-02-implementar-X`

**Evitar:**
- Fase de mais de 2h
- Fase que toca mais de 5 arquivos

> Excecoes declaradas (mesmo criterio dos Planos 01/02/03: fixture e dado, manifest e gerado):
> - **fase-01** toca 9 arquivos de codigo/teste + 8 de fixture + manifest. O Passo 0 (contrato
>   aditivo, heuristics, G13) e pre-requisito dos TRES adaptadores e fica aqui porque Rails e o
>   primeiro que produz `/users/:id` (o caso que o G13 quebra). Sao **dois commits numa fase**:
>   `refactor(security): contrato aditivo handler-chain/unresolved + heuristica de nome + G13` e
>   `feat(security): adaptador Rails`. Se o executor estourar as 2h, o corte natural e entre os dois
>   commits — nao dentro do adaptador.
> - **fase-02** e **fase-03** tocam 2 arquivos de codigo + fixture (5–7 arquivos de dados) + manifest.
> - **fase-04** toca 5 arquivos de codigo/teste + agente + fixture (6 arquivos) + manifest. Registro,
>   `auditProject`, CLI e agente sao a mesma fatia: um registro sem consumidor ou uma CLI que imprime
>   um shape que o agente nao conhece e estado intermediario sem sentido.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error — ver G6 para a excecao)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test ; bun run typecheck   (comandos SEPARADOS — ver G15)
```

Filtro de teste neste repo: `bun test <arquivo> -t '<regex do nome>'` (flag `-t`, nao `--grep`).
Suite completa: `bun run test` (roda em lotes — o total e a soma; hoje 2033 pass / 0 fail; ~2058
apos o Plano 03). Typecheck: `bun run typecheck` (tsc strict, `exactOptionalPropertyTypes` e
`noUncheckedIndexedAccess` ligados). **`bun run lint` nao existe** (G15). Contrato dos agentes:
`bun run agents:contract`. Docs: `bun run harness:validate` (a fase-05 mexe em docs).

**Teste primeiro, por desenho e por gate:** `hooks/tdd-gate.cjs` bloqueia `Write/Edit` de `.ts` de
producao sem teste colocalizado. Todo arquivo novo deste plano nasce pelo teste:
`route-auth-rails.test.ts` ANTES de `route-auth-rails.ts` (idem heuristics, express, python,
adapters). O RED do arquivo de teste NOVO e de compilacao (a lib nao existe) — aceito, mesmo padrao
do Plano 02 fase-01; a defesa e provada no RED-check pos-GREEN.

**Parsers PUROS sobre texto, fixture so para o caminho de disco** (DI-fase04-fixtures-inline do Plano
01): `parseRailsRoutes(source, file)`, `parseRailsController(source, file)`, `parseExpressFile(source,
file)`, `parseFastapiFile(...)`, `parseFlaskFile(...)`, `parseDjangoUrls(...)` recebem string e devolvem
estrutura. A maioria dos testes usa texto inline (subset que casa / que NAO casa / que vira
`unresolved`); a fixture em disco cobre `enumerate`/`readCoverage` uma vez por stack e alimenta o
gate e2e. Flask e Django NAO tem fixture (DP-6).

**Testes que so leem campos novos primeiro, imports novos em passo separado (G6 / GT-fase02-1):** na
fase-01, os testes do motor que leem `route.unresolved` ou emitem `handler-chain` inline (tipo, nao
import de valor) dao RED por assertion; `promoteWideCandidates` e `isAuthName` sao imports novos —
segundo passo. Na fase-04, `auditProject` entra como stub primeiro para que CA-11 seja RED por
assertion (`Expected ['nextjs','rails'], Received []`).

**RED-check do orquestrador (obrigatorio em toda fase):** depois do GREEN, mutar o alvo nomeado no
checklist e ver o teste FALHAR com a mensagem prevista; restaurar; ver passar. Um teste que continua
verde com a defesa removida nao testa a defesa (BUG-fase01-1 do Plano 01).

**Teste de abuso antes da defesa (PRD "Casos de abuso"):** cada fase nomeia o seu na secao
"Seguranca": Rails — `skip_before_action` no filho tira a cobertura herdada; Express — `app.use(auth)`
DEPOIS da rota nao a cobre; Python — `Depends` numa rota irma nao cobre a rota sem `Depends`;
multi-stack — `skipped` nunca vira aprovacao; gate — corte da Premissa 3 nao afrouxa veredito.

**Tracer Bullet deste plano:** N/A (o tracer bullet do PRD foi a fase-01 do Plano 01). O equivalente
aqui e o Passo 0 da fase-01: se `handler-chain` e `unresolved` atravessam o motor com o Next intacto
(52 + 40 testes verdes), os tres adaptadores tem onde encaixar.

---

## Decisoes de planejamento (DP)

Fixadas em 2026-09-06 pelo orquestrador do `/plan-feature` (sessao autonoma — o dev NAO esta presente
para gates intermediarios; ele veta na revisao do PR). As fases **implementam** estas decisoes; nao as
reabrem, nao param para confirmar.

- **DP-1 Contrato: UMA variante nova e aditiva de `CoverageRule`, generica.**
  `{ kind: 'handler-chain'; handler: string; file: string; line: number; via: string }` = "o adaptador
  DEMONSTROU que auth esta presa a ESTE handler" (before_action efetivo apos heranca/only/except/skip;
  `Depends(...)` de rota, de `APIRouter` ou de `include_router`; middleware de rota ou `use` anterior
  no Express; `@login_required` no Flask). Matcher no `RULE_MATCHERS`: `covers` sse
  `rule.handler === route.handler` (ambos definidos) OU (`rule.file === route.file && rule.line === route.line`);
  senao `no`. **O motor NAO aprende Rails/Express/Python** — o adaptador resolve heranca, `only/except`,
  prefixo de router, ordem de `use` e emite uma `handler-chain` por rota coberta. Cobertura condicional
  (`before_action ... if:`, `dependencies=` nao literal, middleware inline) → `opaque` → `indeterminada`.
  Middleware/filtro GLOBAL sem ordem (`app.add_middleware(AuthX)`, `@app.middleware("http")`,
  `@app.before_request`, `MIDDLEWARE` do Django com nome de auth) → `path-pattern` `/:path*` com nota
  "cobertura por proxy: middleware roda, nao prova que autentica" (G13 do Plano 01 estendido).
  `Route.handler` obrigatorio nos tres adaptadores novos: Rails `'Admin::UsersController#index'`,
  Express `'<file>:<line>'` da chamada de rota (handler anonimo), Python `'app.routers.admin.list_users'`.
  **Refinamento (DP-1a, orquestrador 2026-09-06):** `opaque` ganha campo OPCIONAL aditivo
  `handler?: string` — escopo do opaco. Sem ele, um `opaque` por "controller nao encontrado" ou por
  `before_action ... if:` infectaria TODAS as rotas do projeto (o matcher `opaque` devolve `unsure`
  para qualquer rota). Com `handler` definido e diferente de `route.handler` → `no`; igual ou ausente →
  `unsure`. Next continua emitindo `opaque` sem `handler` (global, como hoje). Ver MEMORY DEV-plan-2.
  **Refinamento (DP-1b):** a evidence de DESCOBERTA e a description do finding deixam de citar
  `config.matcher`/`middleware` para stack que nao e Next — hash map `MISSING_BY_STACK` por
  `route.stack` (Next mantem o texto atual: 52 testes intactos). RF-05 exige dizer "o que faltou"
  (matcher, `before_action`, entrada) — e por stack.
- **DP-2 `Route.unresolved?: string` (aditivo ao contrato congelado — campo OPCIONAL).** Declaracao
  de rota que o adaptador enxerga mas NAO consegue resolver (path nao literal — `prefix + '/x'`,
  template com `${}`, variavel; `match` sem `via:`; `mount`; `constraints`; `draw`; `re_path`; `scope`
  com chave desconhecida; `app.route()` fora do subset; montagem aninhada de router) vira `Route` com
  `unresolved: '<motivo>'`, `path` = texto-fonte da expressao prefixado com `/` se nao comecar com `/`
  (ex.: `'/${base}/reports'`), `method` = `'GET'` quando desconhecido + nota. O motor curto-circuita:
  `unresolved` → `indeterminada` com evidence = motivo, ANTES de allowlist e matcher (RF-09/CA-05:
  nunca inventar, nunca `coberta`). `isRoute` aceita `unresolved` string nao-vazia. Entra na fase-01
  (Passo 0) em `route-auth-matrix.types.ts` e `route-auth-matrix.ts`; quando o Plano 03 existir, a
  mesma primeira linha vai em `verdictFor`.
- **DP-3 Heuristica de nome de auth COMPARTILHADA e declarada como proxy.**
  `skills/security/lib/route-auth-heuristics.ts` (+ test) com
  `AUTH_NAME_RE = /authenticat|require_?(login|user|auth|admin)|login_required|signed_in|authoriz|current_user|verify_?(token|jwt)|jwt|session_required|protect/i`
  e `isAuthName(name)`. Filtro/middleware/dependencia cujo nome NAO casa nao conta como cobertura e e
  listado em `CoverageMap.notes` (`filtros ignorados por nome: set_locale, ...`); os que casam tambem
  (`filtros contados como auth: authenticate_user!, ...`). E heuristica, nao prova: `summary.notes`
  diz isso. Falso negativo (auth com nome exotico) vira DESCOBERTA → o dev declara na allowlist ou
  renomeia; falso positivo (nome de auth sem auth) e o mesmo proxy que o Plano 01 aceitou para o
  matcher. **Refinamento (DP-3a):** a lib tambem abriga os utilitarios de texto `lineOf`,
  `readBalanced` e `splitTopLevel`, MOVIDOS de `route-auth-nextjs.ts` (que passa a importa-los) — os
  tres adaptadores precisam deles e o repo tem uma fonte de verdade por funcao. Comportamento
  identico; os 40 testes do Next sao a rede.
- **DP-4 Rails (fase-01)** — regex/linha sobre `config/routes.rb` + `app/controllers/**/*.rb`.
  Enumeracao (subset): `resources :x` (7 rotas REST: `GET /x` index, `GET /x/new` new, `POST /x`
  create, `GET /x/:id` show, `GET /x/:id/edit` edit, `PATCH /x/:id` + `PUT /x/:id` update,
  `DELETE /x/:id` destroy) com `only:`/`except:`; `resource :x` (singular, sem index e sem `:id`);
  `namespace :admin do ... end` (prefixo `/admin` + modulo `Admin::`); `scope path:`/`scope module:`
  (so essas chaves); `get/post/put/patch/delete 'path', to: 'ctrl#action'` e `'path' => 'ctrl#action'`;
  `root to:`; nested `resources` 1 nivel (`/posts/:post_id/comments`); `member do get :x end` /
  `collection do get :x end`; `match ... via: [...]` (uma rota por verbo; `via: :all` = 7). Fora do
  subset → `Route.unresolved` (DP-2). `handler` = `Ctrl#action` com modulo. Cobertura:
  `class Admin::UsersController < ApplicationController` (e `module Admin; class UsersController < ...`),
  `before_action :name, only:/except:`, `skip_before_action :name, only:/except:`, heranca ate
  `ActionController::Base`/`ActionController::API`; redeclaracao do mesmo filtro no filho SUBSTITUI a
  herdada (semantica do `CallbackChain`); nome de filtro decidido por DP-3; `if:`/`unless:`/bloco →
  `opaque` com `handler` (DP-1a) para as rotas daquele controller; controller nao encontrado em
  `app/controllers/` → `opaque` escopado ("controller X nao encontrado") → `indeterminada`. Emitir
  `handler-chain` por handler coberto (DP-1). Fixture `tests/fixtures/route-auth-matrix/rails-minimal/`:
  `Gemfile`, `config/routes.rb` (root sem controller; `get health`; `resources :posts, only:`;
  `namespace :admin do resources :users end`; um `match` sem `via:`), `app/controllers/application_controller.rb`
  (`before_action :authenticate_user!` + `before_action :set_locale`), `admin/users_controller.rb`
  (herda), `health_controller.rb` (`skip_before_action`), `posts_controller.rb`
  (`before_action :authenticate_user!, only: [:index]`), `anti-vibe.public-routes.json` (`/health` e
  `/posts/:id` — a segunda prova DP-7). Sizing real 2h.
- **DP-5 Express (fase-02)** — regex/linha (parser proprio, coerente com DI-fase04-parser; GT-fase04-1
  mostra que o AST nao resolve do cache) sobre `.ts/.tsx/.js/.jsx/.mjs/.cjs` em `src/`, `app/`,
  `routes/`, `lib/` (recursivo) e raiz (so o primeiro nivel), excluindo `node_modules`, `dist`,
  `build`, `.next`, `tests/`, `test/`, `*.test.*`, `*.spec.*`. Aplica-se so quando `express` esta em
  `dependencies`/`devDependencies` do `package.json` (DP-12). Subset: `const app = express()`,
  `const r = express.Router()`/`Router()`; `app.<get|post|put|patch|delete|all>('/lit', ...mws, handler)`
  e `router.<verb>(...)` (`all` = 7 verbos); `app.use([path,] ...mws)`; `app.use('/prefix', routerVar)`
  com router do MESMO arquivo ou importado por `import x from './rel'` / `const x = require('./rel')`
  (resolucao de UM nivel, extensoes `.ts/.js/.mjs/.cjs`, `index.*`); `app.route('/x').get(h).post(h)`
  encadeado simples. Path nao literal → `Route.unresolved` (CA-05); `*`, grupo regex ou RegExp literal
  → `unresolved` (Express 4 vs 5 divergem — G12). **Refinamento (DP-5a, orquestrador 2026-09-06):
  NENHUM `path-pattern` no Express.** `app.use(auth)` global so cobre rotas declaradas DEPOIS dele
  (e routers montados depois) — um `path-pattern '/:path*'` cobriria tambem a rota declarada antes,
  que e exatamente o abuso que a fase testa. O adaptador resolve a ordem por linha e emite
  `handler-chain` por rota coberta, com `via` dizendo qual `use` (`app.use(requireAuth) em src/app.mjs:9,
  antes da rota` / `antes da montagem do router` / `router.use(...)` / `middleware de rota requireAdmin`).
  `app.use('/prefix', auth)` cobre rota posterior cujo path comeca com `/prefix`. A nota de proxy
  ("middleware com nome de auth roda, nao prova que autentica") continua em `notes`. **Premissa 3 e
  medida nesta fase:** `summary.indeterminada / summary.enumerated` sobre a fixture (esperado 1/6 =
  0.17) vai ao MEMORY; a fase-05 aplica o corte. Fixture `tests/fixtures/route-auth-matrix/express-minimal/`
  em `.mjs`: `package.json` (`typescript` em devDependencies, `express` em dependencies),
  `src/app.mjs` (`app.get('/health')` ANTES de `app.use(requireAuth)`, que vem ANTES de
  `app.get/post('/api/preferences')`; uma rota `${base}/reports` nao literal — CA-05;
  `app.use('/admin', adminRouter)` DEPOIS do `use(requireAuth)`), `src/routes/admin.mjs`
  (`router.get('/users', h)`, `router.delete('/users/:id', requireAdmin, h)`), `src/auth.mjs`
  (middlewares sem segredo literal). Sizing real 2h.
- **DP-6 Python (fase-03)** — um adaptador `route-auth-python.ts` com tres dialetos detectados por
  import (`from fastapi`/`import fastapi`; `from flask`/`import flask`; `from django`/`django` em
  `settings.py`/`urls.py`), regex/linha sobre `**/*.py` (excluindo `.venv`, `venv`, `site-packages`,
  `__pycache__`, `migrations/`, `tests/`, `test_*.py`). **FastAPI (primeira classe — a matriz do repo
  e FastAPI-native):** `app = FastAPI()`, `router = APIRouter(prefix='/x', dependencies=[Depends(f)])`,
  `@app.<get|post|put|patch|delete>('/p')`, `@router.<verb>('/p', dependencies=[Depends(f)])`,
  `@x.api_route('/p', methods=[...])`, parametro `x: T = Depends(f)` ou `Annotated[T, Depends(f)]` na
  assinatura da funcao decorada (`Security(f)` conta como `Depends`), `app.include_router(router,
  prefix='/api', dependencies=[...])` (prefixos concatenados: include + router; router importado por
  `from app.routers import admin` / `from .routers.admin import router` — resolucao de UM nivel por
  modulo dotted → arquivo), `app.add_middleware(X)` e `@app.middleware("http")` com nome de auth →
  `path-pattern '/:path*'` proxy. `handler` = modulo dotted (a partir de `targetDir`, sem `.py`) +
  `.` + funcao. `dependencies=` que nao e lista literal → `opaque` escopado por handler. **Flask
  (segunda classe, mesmo modelo de decorator):** `app = Flask(__name__)`, `@app.route('/p',
  methods=[...])` (default GET), `@app.<get|post|...>('/p')`, `bp = Blueprint('n', __name__,
  url_prefix='/x')`, `@bp.route`, `app.register_blueprint(bp, url_prefix=...)` (o `url_prefix` do
  register vence), `@login_required` (flask-login) entre o decorator de rota e o `def` →
  `handler-chain`, `@app.before_request` + `def` com nome de auth → proxy. **Django (so enumeracao
  nesta versao):** `urls.py` com `path('x/', view)` → `GET /x/` (nota "Django: todos os verbos chegam
  na view; enumerado como GET"), `include('app.urls')` com prefixo (um nivel), `re_path`/`url(`/
  `include(router.urls)` → `unresolved`; cobertura = um `opaque` ESCOPADO por handler ("Django:
  cobertura (login_required/LoginRequiredMixin/MIDDLEWARE) nao verificada nesta versao") → todas as
  rotas Django `indeterminada` medium — visivel, nunca `coberta` (RF-04). Fixture
  `tests/fixtures/route-auth-matrix/python-fastapi-minimal/`: `pyproject.toml`, `app/__init__.py`,
  `app/main.py` (`/health` publico + allowlist; `/me` com `Depends` na assinatura; `POST /feedback`
  sem nada; `include_router(admin.router, prefix='/api', dependencies=[Depends(get_current_user)])`),
  `app/routers/__init__.py`, `app/routers/admin.py` (`APIRouter(prefix='/admin')` com
  `@router.get('/users')` e `@router.delete('/users/{user_id}')`), `app/deps.py` (`get_current_user`),
  `anti-vibe.public-routes.json`. Flask e Django cobertos por testes com texto inline (funcoes puras
  `parse*`), sem fixture. Sizing real 2h.
- **DP-7 G13 RESOLVIDO — amplitude decidida contra a ENUMERACAO, nao pela sintaxe (fase-01, Passo 0,
  porque Rails ja produz `/posts/:id`).** `parsePublicRoutes` continua marcando entradas com `*`,
  `:nome` ou `(...)` como CANDIDATAS amplas (`wide`) — e passa a guardar o `reason` da candidata
  (`AllowlistFinding.reason?`, aditivo). A decisao final e do motor apos enumerar,
  `promoteWideCandidates(parsed, routes)` em `public-routes-allowlist.ts`: candidata cujo
  `normalizePath(path)` e IGUAL ao `Route.path` de alguma rota enumerada (nao-`unresolved`) e uma
  declaracao LITERAL daquela rota — com `reason`, entra em `entries` e casa por igualdade como qualquer
  outra (`/posts/:id` no Rails, `/users/:id` no Express); sem `reason`, vai para `rejected` (CA-04b
  vale para ela); candidata que nao casa rota nenhuma continua `AllowlistFinding high` com description
  emendada ("entrada ampla `<path>` nao corresponde a nenhuma rota enumerada — declare cada rota
  publica individualmente"). Em projeto so-Next o comportamento e identico ao atual (nenhum
  `Route.path` do Next contem `:` ou `*`). `auditRouteCoverage` faz a promocao ANTES de `matchAllowlist`;
  `summary.allowlist.accepted` conta as promovidas e `wide` conta so as que ficaram; nota
  `entrada ampla /posts/:id promovida: declaracao literal de rota enumerada`. Os testes do Plano 02 que
  afirmam `result.wide` no PARSER continuam validos; o teste CA-04 do motor (`nextjs-allowlist-wide`,
  `/api/*` sem rota igual) continua valido. **SUBSTITUI a DP-3 do Plano 02 no que diz "recusada"; a
  severidade `high` permanece.** Multi-stack (fase-04): uma candidata so vira `ALLOW-*` se NENHUMA
  stack a promoveu.
- **DP-8 Registro por `StackId` e camada ASSINCRONA (fase-04).** `skills/security/lib/route-auth-adapters.ts`
  (+ test): `ADAPTERS: Readonly<Partial<Record<Exclude<StackId,'unknown'>, { adapter: RouteAdapter; applies: (targetDir: string) => boolean }>>>`
  — `nextjs` → `nextjsAdapter` (sempre), `rails` → `railsAdapter` (sempre), `node-ts` →
  `expressAdapter` com `applies = hasExpress` (DP-12), `python` → `pythonAdapter` (sempre; dialeto
  decidido por import). `react` e `laravel` NAO tem entrada → `skipped` com nota (hash map
  `SKIP_REASONS`: `react: SPA sem rotas de servidor nesta versao`; `laravel: sem adaptador nesta versao`).
  `selectAdapters(detected, targetDir)` monta `[primary, ...secondary]` (dedupe; `primary: null` →
  `skipped` "nenhuma stack detectada"). `auditProject(targetDir, opts): Promise<ProjectAuditResult>`
  em `route-auth-matrix.ts` faz `await detectStack(targetDir)`, e para cada stack aplicavel chama a
  `auditRouteCoverage(targetDir, { ...opts, adapter })` SINCRONA existente (seam `adapter?` do Plano
  03 fase-03 — ou introduzido aqui, ver coordenacao). `ProjectAuditResult = { detected: DetectedStack;
  stacks: Array<{ stack; result: AuditResult }>; skipped: Array<{ stack; reason }>; issues: ContractIssue[] }`
  com `issues` = `ALLOW-*` (uma vez, so candidatas que ficaram amplas em TODAS as stacks) + `ROUTE-*`
  concatenadas por stack na ordem detectada, ids sequenciais na lista combinada, description
  prefixada `[<stack>] ` (CA-11; convive com `[cobertura perdida]` do Plano 03:
  `[rails] [cobertura perdida] DESCOBERTA: ...`). A allowlist e lida uma vez POR STACK (dentro de
  `auditRouteCoverage`, que nao muda de assinatura) — aceito: arquivo pequeno, e a promocao (DP-7)
  depende das rotas de cada stack. A CLI passa a `await auditProject(...)` e imprime `{ issues, summary }`
  onde `summary: ProjectSummary = { detected: { primary, secondary }, stacks: Record<string, AuditSummary & { g2Support: boolean }>, skipped, totals: { enumerated, evaluated, descoberta, indeterminada, publicaDeclarada, coberta } }`
  — `issues` no topo permanece (contrato com a secao 11). `auditRouteCoverage` NAO muda de assinatura.
- **DP-9 Adaptadores novos NAO implementam G2 nesta versao.** `railsAdapter`/`expressAdapter`/
  `pythonAdapter` nao definem `isCoverageFile?`/`readCoverageAtBase?` (DP-2 do Plano 03) → G2 sai
  `not-applicable` com nota para essas stacks. `summary.stacks[stack].g2Support: false` e a nota
  `adaptador <stack> sem suporte a G2: alteracao em <controller/deps/middleware> que REMOVE cobertura
  nao e detectada nesta versao` aparecem por stack (fase-04 garante, independente do Plano 03).
  Divida explicita: G2 por stack = follow-up. Atencao especial ao Rails: um diff que so acrescenta
  `skip_before_action` num controller nao toca `config/routes.rb` (arquivo de rota) — e G2 puro.
- **DP-10 Fixtures** (todas SEM `middleware.ts` e sem `.ts` fora de `route.ts`): `rails-minimal/`
  (DP-4), `express-minimal/` em `.mjs` (DP-5), `python-fastapi-minimal/` (DP-6),
  `monorepo-next-rails/` (CA-11: `package.json` com `next` + `typescript`, `Gemfile` com rails,
  `app/api/admin/route.ts` Next, `config/routes.rb` + `app/controllers/application_controller.rb` +
  `invoices_controller.rb` Rails; SEM middleware — a rota Next sai DESCOBERTA; a Rails coberta por
  `ApplicationController`). No monorepo o enumerador Next percorre `app/` e ignora
  `app/controllers/*.rb` (nao sao `route.ts`/`page.tsx`) — testado explicitamente. Fixtures sao dados:
  `.rb`, `.py`, `.mjs`, `.json`, `Gemfile`, `pyproject.toml` passam pelo gate. `route.ts` de fixture
  NAO importa `next/*`. Nenhum token/segredo literal em fixture (o validator do contrato rejeita
  `API_KEY=`/`SECRET=` seguido de 8+ chars).
- **DP-11 Gate CA-08 + Premissa 3 (fase-05).** `tests/e2e/route-auth-four-stacks.test.ts`: para cada
  fixture (`nextjs-minimal`, `rails-minimal`, `express-minimal`, `python-fastapi-minimal`),
  `auditProject(fixture, { changedFiles: <todos os arquivos de rota da fixture> })` e assercao da
  LISTA de rotas enumeradas (golden inline: `method path handler?`) e dos vereditos esperados; mais o
  monorepo (CA-11: duas stacks, findings com `[nextjs]`/`[rails]`). **Corte da Premissa 3:**
  `indeterminada / enumerated` sobre a propria fixture > 0.25 → o adaptador NAO entra no registro
  (`ADAPTERS`) nesta versao — fica no repo com nota `experimental` no cabecalho e a stack sai
  `skipped` com razao "taxa de indeterminada acima do corte na fixture" — decisao registrada no
  MEMORY como DI, nao afrouxar o veredito. O teste do gate afirma a taxa por stack (`<= 0.25`).
  Esperado pelo planejamento: rails 2/13, express 1/6, python 0/5, nextjs 0/6 — todos entram.
- **DP-12 `applies` para `node-ts`:** Express so roda se `express` estiver em
  `dependencies`/`devDependencies` do `package.json` da raiz (`hasExpress(targetDir)`, exportada pelo
  adaptador na fase-02; registrada na fase-04); `node-ts` sem express → `skipped` com nota
  "node-ts sem express: Fastify/Koa/Hono/NestJS fora do escopo desta versao" (nunca silencio). Next +
  node-ts no mesmo projeto (sempre, porque Next tem typescript) → Express so roda se `express` existir.
- **DP-13 Monorepo por subdiretorio esta FORA:** `detectStack` le manifests da RAIZ; Rails em
  `backend/` ou Next em `frontend/` nao e detectado nem enumerado nesta versao. Cada adaptador enumera
  a partir de `targetDir` (raiz). Quando o adaptador nao encontra sua arvore (`config/routes.rb`
  ausente; nenhum `express()`; nenhum `.py` com import de framework) → `enumerated: 0` com nota, nao
  erro. Limite conhecido, registrado no README e no summary.
- **DP-14 Agente (ADITIVO, fase-04):** secao 11 ganha bullets: `summary.detected`/`summary.stacks`/
  `summary.skipped`; prefixo `[<stack>]` nas issues; `skipped` com razao NAO e "tudo coberto";
  heuristica de nome de auth e proxy (citar `notes` de filtros contados/ignorados); adaptadores novos
  sem G2 (`g2Support: false`); entrada ampla promovida (DP-7) — o bullet do Plano 02 sobre
  `ALLOW-*` ganha a frase "salvo quando a entrada e a declaracao literal de uma rota enumerada
  (`/posts/:id` no Rails) — a lib promove e `summary.allowlist.notes` diz". Comando Bash inalterado.
- **DP-15 Sizing real:** fase-01 2h, fase-02 2h, fase-03 2h, fase-04 1.5h, fase-05 1h = **8.5h**
  (PLAN.md diz ~7.5h). Registrado em MEMORY "Desvios do Plano" (DEV-plan-1); o orquestrador atualiza
  o PLAN.md; o executor nao toca nele.

---

## Gotchas Conhecidos

Numeracao propria deste plano. Onde o gotcha e herdado, a origem esta citada.

- **G1 — Cache do plugin defasado → gate bloqueia `.ts` em fixture** (herda GT-fase01-1 do Plano 01,
  G1 dos Planos 02/03). O TDD gate em execucao vem do cache `7.7.0`, cujo `SKIP_PATTERN` NAO tem
  `tests/fixtures/`. `needsTest` so olha `.ts/.tsx/.js/.jsx`: `.rb`, `.py`, `.json`, `Gemfile`,
  `pyproject.toml` passam; `.mjs`/`.cjs` estao no `SKIP_PATTERN`; `route.ts`/`page.tsx` passam
  (`NEXTJS_ROUTE_FILE`); `middleware.ts` e QUALQUER outro `.ts` de fixture (um `app.ts` Express) SAO
  BLOQUEADOS. Regra desta execucao: NAO contornar trocando de ferramenta. Por isso DP-10: nenhum `.ts`
  novo em fixture alem de `route.ts`. O cache tambem nao tem as libs nem a secao 11 atual — criterios
  "por humano" ficam pendentes de `scripts/sync-to-global.sh`; registrar como divida.
- **G2 — `tsconfig.json` inclui `**/*.ts` e `express` nao esta instalado.** `tests/fixtures/**` passa
  pelo `typecheck`; um `app.ts` de fixture com `import express from 'express'` quebraria o `tsc`
  (G7 do Plano 01). Consequencia (DP-10): fixture Express em `.mjs` — ESM Node legitimo, nao
  typechecado, nao bloqueado pelo gate. O adaptador escaneia `.ts/.tsx/.js/.jsx/.mjs/.cjs`; a sintaxe
  TS (`const app: Express = express()`, `import type`) e provada por teste unitario com texto inline.
- **G3 — Manifest no MESMO commit** (herda G2 dos Planos 02/03). Toda lib nova em
  `skills/security/lib/*.ts` (heuristics, rails, express, python, adapters), `route-auth-matrix.ts`,
  `route-auth-matrix.types.ts`, `route-auth-nextjs.ts`, `public-routes-allowlist.ts` e
  `agents/security-auditor.md` sao rastreados por `plugin-manifest.json`; `.test.ts`, `tests/` e
  `docs/` nao. `bun run generate:manifest` no mesmo commit; revisar pelo checksum, nao pela data
  (GT-fase01-2 do Plano 01).
- **G4 — `exactOptionalPropertyTypes` ligado.** Vale para `handler?` e `unresolved?` em `Route`,
  `handler?` em `opaque`, `reason?` em `AllowlistFinding`. Nunca `unresolved: undefined`; spread
  condicional `...(reason !== undefined ? { unresolved: reason } : {})`. Ao construir `Route` nos
  adaptadores, montar o objeto completo e so entao espalhar o opcional.
- **G5 — `noUncheckedIndexedAccess` ligado.** `match[1]` e `string | undefined`; `lines[i]` idem;
  `ADAPTERS[stack]` e `AdapterEntry | undefined`; `stacks[0]?.stack`. Nunca `xs[0]!`. Em regex com
  grupos obrigatorios, checar `=== undefined` e `continue` — nunca `as string`.
- **G6 — Import novo num arquivo de teste existente = RED de compilacao TOTAL** (GT-fase02-1 do Plano
  02). O Bun recusa o modulo de teste inteiro se um export importado nao existe. Arquivo de teste NOVO
  (`route-auth-rails.test.ts`) tem RED de compilacao ate a lib existir — aceito. Em arquivo existente
  (`route-auth-matrix.test.ts`, `public-routes-allowlist.test.ts`), separar: testes que so leem campos
  novos (`route.unresolved`, `handler-chain` inline como literal de `CoverageRule`) → RED por assertion;
  testes que importam simbolo novo (`promoteWideCandidates`, `auditProject`, `isAuthName`) → passo
  separado, RED de compilacao aceito ou stub primeiro (fase-04).
- **G7 — `detectStack` e ASSINCRONA; `auditRouteCoverage` e SINCRONA e assim fica.** 33 testes hoje
  (52 apos o Plano 03) chamam `auditRouteCoverage` sem `await`. A camada assincrona e SO
  `auditProject` (DP-8) e a CLI (`await` em `import.meta.main` — top-level await funciona em ESM no
  Bun). Nao converter `auditRouteCoverage` nem os adaptadores para async.
- **G8 — Next SEMPRE traz `node-ts` como secundaria** (`probeNodeTs` casa `typescript` em devDeps).
  Sem DP-12, todo projeto Next rodaria o adaptador Express e produziria `enumerated: 0` com nota —
  ruido. Com DP-12, `node-ts` sem `express` sai `skipped` com razao. O teste da fase-04 afirma isso
  na fixture `nextjs-minimal` (nao tem `express`).
- **G9 — `app/` colide entre Next e Rails no monorepo.** O enumerador Next percorre `app/` inteiro
  (`walk`) e ve `app/controllers/*.rb`, `app/models/*.rb`; ele so emite para `route.ts(x)`/`page.ts(x)`,
  entao ignora — mas precisa de teste explicito (fase-04) para que ninguem "otimize" o `walk` depois.
  O adaptador Rails so le `config/routes.rb` e `app/controllers/**/*.rb` — nao ve `app/api/`.
- **G10 — `PATCH` + `PUT` no `update` do Rails.** `resources :users` gera DUAS rotas para `update`
  (Rails guide: "Rails Routing from the Outside In", §2.2, tabela de `resources`). Sao duas `Route`
  com o MESMO `handler` (`UsersController#update`) — a `handler-chain` casa as duas por `handler`.
  Contagem esperada de `resources` completo: 8 rotas, nao 7.
- **G11 — `:id` e literal em Rails/Express e `[id]` no Next — `matchAllowlist` nao traduz.**
  DP-2 do Plano 02: igualdade exata no dialeto da stack. `/users/:id` declarado na allowlist casa
  `/users/:id` do Rails/Express e NAO casa `/users/[id]` do Next; `{id}` no FastAPI e `<int:id>` no
  Flask idem. Num monorepo Next + Rails com a "mesma" rota nos dois, sao duas entradas. Documentar na
  secao 11 (DP-14).
- **G12 — Express 4 vs 5 (path-to-regexp v0.1 vs v8).** No Express 5, `*` vira `/*splat`, grupos
  regex `(...)` e `?`/`+` em segmento foram removidos, e `:name` continua. Como o adaptador nao sabe a
  major instalada (so que `express` existe), qualquer path com `*`, `(`, `?`, `+` ou RegExp literal
  → `unresolved` ("sintaxe de path fora do subset comum Express 4/5") — nunca traduzir para
  `path-pattern`. Fonte: Express 5 migration guide, "Path syntax changes".
- **G13 — Ordem de `app.use` e por LINHA, e a resolucao de import e de UM nivel.** `app.use(auth)`
  cobre so o que vem depois no mesmo arquivo (por `line`), e routers montados depois. Router
  importado que importa outro router (2 niveis) → as rotas do segundo saem `unresolved`. `app.use`
  dentro de `if`/funcao nao e detectado como condicional (fora do subset — nota). Express NAO emite
  `path-pattern` (DP-5a).
- **G14 — `include_router` concatena prefixos** (`prefix` do `include_router` + `prefix` do
  `APIRouter`): `include_router(admin.router, prefix='/api')` com `APIRouter(prefix='/admin')` e
  `@router.get('/users')` → `/api/admin/users`. Dependencias somam nas tres camadas (include + router
  + rota/assinatura). Fonte: FastAPI docs "Bigger Applications - Multiple Files", §`include_router`.
  Router incluido duas vezes com prefixos diferentes → duas rotas com o mesmo `handler` (legitimo no
  FastAPI; a `handler-chain` casa as duas).
- **G15 — `bun run lint` NAO existe; verificacoes SEPARADAS** (herda G12 do Plano 03). O equivalente e
  `bun run typecheck`. `a && b | tail` mente sobre exit code — um comando por linha, lido ate o fim.
- **G16 — Django enumerado SEM cobertura, por desenho (DP-6).** Toda rota Django e `indeterminada`
  medium nesta versao. Num projeto Django com 80 `path()` sao 80 issues `medium` — e a Decisao 8 do
  PRD ("ruido visivel ganha de silencio"), e `summary.notes` diz por que. Nao filtrar, nao rebaixar.
  Django NAO tem fixture e NAO entra no gate da Premissa 3 (a taxa seria 100% por construcao — o corte
  e sobre adaptadores que PROMETEM cobertura). Registrar como divida: "Django coverage" e follow-up.
- **G17 — Heuristica de nome = PROXY, nas duas direcoes.** `isAuthName('set_locale')` = false →
  ignorado (nota); `isAuthName('authenticate_user!')` = true → contado sem ler o corpo. Um
  `before_action :protect_from_bots` (casa `protect`) conta como auth sem ser; um
  `before_action :ensure_member` nao conta e a rota sai DESCOBERTA. As notas
  `filtros contados como auth: ...` / `filtros ignorados por nome: ...` sao a unica defesa — o agente
  cita (DP-14). Nao "melhorar" a regex por caso isolado sem teste que o nomeie.
- **G18 — `handler-chain` casa por `handler` OU por `file:line`.** Rails e Python sempre tem
  `handler`; Express usa `'<file>:<line>'` como `handler` E os campos `file`/`line` da rota — os dois
  caminhos coincidem. `route.handler === undefined` (Next) com regra `handler-chain` → so o caminho
  `file:line` pode casar; como o Next nunca emite `handler-chain`, e `no`. Teste dedicado na fase-01
  (`handler-chain` nunca cobre rota de outro handler nem de outra linha).
- **G19 — Validator do contrato rejeita `SECRET=`/`API_KEY=` seguido de 8+ chars** (`SECRET_PATTERNS`
  em `skills/lib/subagent-contract.ts:236-238`). O `payload` do auditor serializa `description`
  dos findings; se um `via`/`reason`/`path` de fixture carregasse `SECRET=abcdefgh`, o contrato
  inteiro seria recusado. Fixtures NAO contem essas strings nem tokens; middlewares de fixture checam
  so presenca de header. Teste do gate (fase-05) roda `buildContractIssues` e verifica que nenhuma
  description casa `SECRET_PATTERNS`.
- **G20 — `harness:validate` para docs.** A fase-05 fecha o MEMORY e este README; `bun run
  harness:validate` valida a estrutura de `docs/`. `tests/e2e/` nao entra no manifest, mas `bun run
  test` inclui `tests/**/*.test.ts` (`scripts/run-tests.ts` PATTERNS) — o gate e2e roda na suite.
- **G21 — `Route.file` do Rails e `config/routes.rb` para TODAS as rotas.** G1 ("arquivo de rota
  tocado pelo diff") reavalia todas as rotas Rails quando `routes.rb` muda — e o comportamento correto
  (o arquivo de rota E esse) e ruidoso em PR que so acrescenta uma `resources`. RF-05 continua
  atendido: `line` e a linha da declaracao (`resources`/`get`/`namespace`... a linha do verbo, nao do
  `end`). Mudanca so em controller e G2 (DP-9, nao coberto).
- **G22 — Redeclaracao de `before_action` no filho SUBSTITUI a herdada** (semantica do
  `ActiveSupport::Callbacks::CallbackChain`: o mesmo filtro e removido e re-adicionado com as novas
  opcoes). `ApplicationController: before_action :authenticate_user!` + `PostsController:
  before_action :authenticate_user!, only: [:index]` → `show` fica SEM auth. E o que a fixture
  `rails-minimal` prova. Fonte: Rails guide "Action Controller Overview", §Filters; API
  `ActiveSupport::Callbacks::ClassMethods#set_callback`.
- **G23 — `scope` com chave fora de `path:`/`module:` (`as:`, `constraints:`, `defaults:`,
  `shallow_path:`) → o BLOCO inteiro vira `unresolved`.** O adaptador nao sabe o efeito no path;
  inventar prefixo seria RF-09 violado. Idem `concern`/`concerns`, `direct`, `resolve`, `mount`,
  `draw`, `constraints do`.
- **G24 — `promoteWideCandidates` roda por stack e antes de `matchAllowlist`; na ponta antes (Plano
  03) tambem.** Se o Plano 03 ja existir, `readAllowlistAtBase` devolve `entries` SEM promocao e
  `/posts/:id` promovida hoje apareceria como "perdida"; a fase-01 diz onde acrescentar a mesma chamada
  (uma linha). Se o Plano 03 vier depois, e ele que precisa ler esta nota (registrada no MEMORY
  "Notas para Planos Seguintes").
- **G25 — `bun run typecheck` FALHA na janela RED por desenho** (herda G19 do Plano 03). Testes leem
  `route.unresolved`, `summary.stacks`, `opts.adapter` antes de existirem. `bun test` nao typechecka;
  o `tsc` so precisa ficar verde depois do GREEN.
- **G26 — Convencao de nome de arquivo de controller e derivada por SCAN, nao por inflexao.** O
  adaptador Rails lista `app/controllers/**/*.rb` e le `class X < Y` / `module A` de cada um para
  montar o mapa `nome completo → arquivo`; nao converte `Admin::UsersController` em
  `admin/users_controller.rb` (inflexao de `API`/`OAuth2` e armadilha). Controller definido fora de
  `app/controllers/` (engine, gem) → "nao encontrado" → `opaque` escopado → `indeterminada`.

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
