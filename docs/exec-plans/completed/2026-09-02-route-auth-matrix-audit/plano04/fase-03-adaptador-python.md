<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Adaptador Python (FastAPI, Flask, Django)

**Plano:** 04 — Os outros tres adaptadores + multi-stack
**Sizing:** 2h
**Depende de:** fase-01 (Passo 0). Paralelizavel com a fase-02 em principio (arquivos disjuntos); recomendada sequencial (README, "Paralelismo possivel")
**Visual:** false

---

## O que esta fase entrega

`pythonAdapter` detecta o dialeto por import e enumera rotas por regex/linha: **FastAPI** (primeira
classe — `@app.<verb>`, `APIRouter(prefix, dependencies)`, `include_router` com prefixos concatenados
e import de um nivel, `Depends`/`Annotated`/`Security` na assinatura, `add_middleware`/`@app.middleware`),
**Flask** (`@app.route`/shortcuts, `Blueprint` + `register_blueprint`, `@login_required`,
`@app.before_request`) e **Django** (so enumeracao: `path`/`include` um nivel; cobertura e um `opaque`
escopado por handler → tudo `indeterminada`, visivel). Cobertura demonstrada vira `handler-chain`
com `via` dizendo ONDE o `Depends` esta (assinatura, decorator, `APIRouter`, `include_router`);
middleware global com nome de auth vira `path-pattern '/:path*'` proxy; `dependencies=` nao literal
vira `opaque` escopado; path nao literal e `re_path` viram `unresolved`.

**DP aplicadas:** DP-6, DP-1 (+1a), DP-2, DP-3, DP-10 (fixture `python-fastapi-minimal`), DP-13.

Source-driven — fontes por forma sintatica: `knowledge/python/atoms/architecture-and-di-fastapi.md`
(`APIRouter` com `prefix`/`dependencies=[...]` via `include_router`; `Annotated[X, Depends(y)]` e
`Depends()` como default legado; "guardas de auth por rota como dependencias, nao middleware
global"); `knowledge/python/atoms/security-fastapi-owasp.md` (`Depends(get_current_user)` confirma
quem e; `Security(dep, scopes=[...])`); FastAPI docs "Bigger Applications" (`include_router` concatena
`prefix`; `dependencies` do include aplicam a todas as rotas do router); Flask docs "Quickstart §Routing"
(`@app.route`, `methods=`, `<converter:name>`), "Modular Applications with Blueprints"
(`Blueprint(..., url_prefix=)`, `register_blueprint(bp, url_prefix=)` — o do register vence),
Flask-Login docs (`@login_required`); Django docs "URL dispatcher" (`path()`, `include()`, `re_path()`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-python.test.ts` | Create (PRIMEIRO) | 16 testes: FastAPI (8), Flask (4), Django (3), fixture (1) |
| `skills/security/lib/route-auth-python.ts` | Create | `detectPythonDialects`, `parsePythonFile` (FastAPI/Flask por `DIALECTS`), `parseDjangoUrls`, `analyzePython`, `enumeratePythonRoutes`, `readPythonCoverage`, `pythonAdapter` |
| `tests/fixtures/route-auth-matrix/python-fastapi-minimal/**` (7 arquivos: `pyproject.toml`, `app/__init__.py`, `app/main.py`, `app/deps.py`, `app/routers/__init__.py`, `app/routers/admin.py`, `anti-vibe.public-routes.json`) | Create | dados — `.py`/`.toml`/`.json` passam pelo gate (G1) |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) — lib nova |

> Dentro do limite (2 arquivos de codigo + fixture + manifest). Flask e Django NAO tem fixture (DP-6):
> funcoes puras testadas com texto inline.

---

## Implementacao

### Passo 1: Fixture `python-fastapi-minimal` (dados)

`pyproject.toml` (faz `detectStack` devolver `python`)
```toml
# 2026-09-06 (Luiz/dev): fixture CA-08 Python/FastAPI — pyproject faz detectStack devolver 'python'.
[project]
name = "python-fastapi-minimal"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["fastapi>=0.110"]
```

`app/__init__.py` e `app/routers/__init__.py`: vazios (um comentario `# pacote` e suficiente).

`app/main.py` (numeracao importa — golden da fase-05)
```python
# 2026-09-06 (Luiz/dev): fixture CA-08 FastAPI — Depends na assinatura, include_router com dependencies, rota sem nada.
from fastapi import Depends, FastAPI

from app.deps import get_current_user
from app.routers import admin

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/me")
async def me(user: dict = Depends(get_current_user)) -> dict:
    return user


@app.post("/feedback")
async def feedback(payload: dict) -> dict:
    return payload


app.include_router(admin.router, prefix="/api", dependencies=[Depends(get_current_user)])
```

`app/routers/admin.py`
```python
from fastapi import APIRouter

router = APIRouter(prefix="/admin")


@router.get("/users")
async def list_users() -> list[dict]:
    return []


@router.delete("/users/{user_id}")
async def delete_user(user_id: int) -> None:
    return None
```

`app/deps.py` — checa so a presenca do header; nenhum token literal (G19)
```python
from fastapi import Header, HTTPException


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if authorization is None:
        raise HTTPException(status_code=401)
    return {"id": 1}
```

`anti-vibe.public-routes.json`
```json
{
  "routes": [
    { "path": "/health", "reason": "probe do load balancer - sem sessao por definicao" }
  ]
}
```

**Enumeracao esperada (5 rotas; `line` = linha do decorator):**

| method | path | handler | file:line | cobertura | veredito (sem / com allowlist) |
|---|---|---|---|---|---|
| GET | `/api/admin/users` | `app.routers.admin.list_users` | admin.py:6 | via `Depends(get_current_user) em include_router(dependencies=) (app/main.py:25)` | coberta |
| DELETE | `/api/admin/users/{user_id}` | `app.routers.admin.delete_user` | admin.py:11 | idem | coberta |
| POST | `/feedback` | `app.main.feedback` | main.py:20 | — | DESCOBERTA critical |
| GET | `/health` | `app.main.health` | main.py:10 | — | DESCOBERTA high / publica-declarada |
| GET | `/me` | `app.main.me` | main.py:15 | via `Depends(get_current_user) na assinatura (app/main.py:16)` | coberta |

Taxa Premissa 3: `0 / 5 = 0.00`.

### Passo 2: Testes PRIMEIRO (`route-auth-python.test.ts`)

```ts
// route-auth-python.test.ts (arquivo NOVO — RED de compilacao ate a lib existir, aceito)
import { analyzePython, detectPythonDialects, parseDjangoUrls, parsePythonFile, pythonAdapter } from './route-auth-python'
import { evaluateRoute } from './route-auth-matrix'
import { isRoute } from './route-auth-matrix.types'

const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/python-fastapi-minimal')
const files = (entries: Record<string, string>): ReadonlyMap<string, string> => new Map(Object.entries(entries))
const key = (r: Route): string => `${r.method} ${r.path} ${r.handler ?? ''}${r.unresolved === undefined ? '' : ' [unresolved]'}`
const verdictOf = (routes: Route[], cov: CoverageMap, path: string, method = 'GET'): Verdict =>
  evaluateRoute(routes.find((r) => r.path === path && r.method === method)!, cov).verdict

describe('parsePythonFile — FastAPI (atom architecture-and-di-fastapi; FastAPI docs "Bigger Applications")', () => {
  it('reads FastAPI()/APIRouter(prefix, dependencies) declarations and decorated routes with path, method, function, line and decorator deps', () => {
    const src = 'from fastapi import APIRouter, Depends, FastAPI\napp = FastAPI()\nrouter = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])\n\n@router.get("/users", dependencies=[Depends(audit)])\nasync def list_users():\n    return []\n\n@app.post("/x")\ndef create(): ...'
    const p = parsePythonFile(src, 'app/main.py', 'fastapi')
    expect(p.apps).toEqual(['app'])
    expect(p.groups.get('router')).toMatchObject({ prefix: '/admin', dependencies: ['require_admin'], line: 3 })
    expect(p.routes.map((r) => ({ owner: r.owner, method: r.method, path: r.path, func: r.func, line: r.line, deps: r.deps }))).toEqual([
      { owner: 'router', method: 'GET', path: '/users', func: 'list_users', line: 5, deps: ['audit'] },
      { owner: 'app', method: 'POST', path: '/x', func: 'create', line: 9, deps: [] },
    ])
    expect(p.module).toBe('app.main')
  })
  it('reads Depends, Annotated[..., Depends] and Security from the function signature, keeping the last dotted segment', () => {
    const src = 'app = FastAPI()\n@app.get("/a")\nasync def a(user: User = Depends(get_current_user)): ...\n@app.get("/b")\nasync def b(user: Annotated[User, Depends(auth.current_user)], s = Security(scopes_ok, scopes=["x"])): ...'
    const p = parsePythonFile(src, 'app/main.py', 'fastapi')
    expect(p.routes[0]?.signatureDeps).toEqual(['get_current_user'])
    expect(p.routes[1]?.signatureDeps).toEqual(['current_user', 'scopes_ok'])
  })
  // 2026-09-06 (Luiz/dev): DP-2 / RF-09 — f-string ou variavel no path nunca vira path inventado.
  it('reads api_route(methods=[...]) and path= kwarg, and marks f-string or variable paths as unresolved', () => {
    const src = 'app = FastAPI()\n@app.api_route("/r", methods=["GET", "PUT"])\ndef r(): ...\n@app.get(path="/k")\ndef k(): ...\n@app.get(f"{PREFIX}/x")\ndef fx(): ...\n@app.get(ROUTE)\ndef v(): ...'
    const p = parsePythonFile(src, 'app/main.py', 'fastapi')
    expect(p.routes.map(key)).toEqual(['GET /r app.main.r', 'PUT /r app.main.r', 'GET /k app.main.k', 'GET /f"{PREFIX}/x" app.main.fx [unresolved]', 'GET /ROUTE app.main.v [unresolved]'])
    expect(p.routes[3]?.unresolved).toContain('f-string')
  })
  it('resolves absolute, relative and aliased imports to dotted modules', () => {
    const src = 'from app.routers import admin\nfrom .routers.users import router as users_router\nimport app.routers.billing as billing\nfrom ..shared import deps'
    const p = parsePythonFile(src, 'app/main.py', 'fastapi')
    expect([...p.imports.entries()]).toEqual([['admin', 'app.routers.admin'], ['users_router', 'app.routers.users.router'], ['billing', 'app.routers.billing'], ['deps', 'shared.deps']])
  })
})

describe('analyzePython — include_router, cadeia de Depends e middleware (FastAPI)', () => {
  const main = 'from fastapi import Depends, FastAPI\nfrom app.routers import admin\napp = FastAPI()\napp.include_router(admin.router, prefix="/api", dependencies=[Depends(get_current_user)])'
  const admin = 'from fastapi import APIRouter\nrouter = APIRouter(prefix="/admin")\n@router.get("/users")\ndef list_users(): ...'
  it('G14: concatenates include prefix + router prefix and covers router routes by include_router dependencies', () => {
    const { routes, coverage } = analyzePython(files({ 'app/main.py': main, 'app/routers/admin.py': admin, 'app/routers/__init__.py': '' }))
    expect(routes.map(key)).toEqual(['GET /api/admin/users app.routers.admin.list_users'])
    expect(verdictOf(routes, coverage, '/api/admin/users')).toBe('coberta')
    const rule = coverage.rules[0]
    expect(rule?.kind === 'handler-chain' ? rule.via : '').toContain('include_router(dependencies=) (app/main.py:4)')
  })
  // 2026-09-06 (Luiz/dev): teste de abuso — Depends numa rota irma NAO cobre a rota sem Depends.
  it('does not let a Depends on a sibling route cover the route without it; router-level dependencies cover every route of the router', () => {
    const src = 'from fastapi import APIRouter, Depends, FastAPI\napp = FastAPI()\n@app.get("/a")\ndef a(u = Depends(get_current_user)): ...\n@app.get("/b")\ndef b(): ...\nr = APIRouter(dependencies=[Depends(require_login)])\n@r.get("/c")\ndef c(): ...\napp.include_router(r)'
    const { routes, coverage } = analyzePython(files({ 'app/main.py': src }))
    expect(verdictOf(routes, coverage, '/a')).toBe('coberta')
    expect(verdictOf(routes, coverage, '/b')).toBe('DESCOBERTA')
    expect(verdictOf(routes, coverage, '/c')).toBe('coberta')
  })
  it('turns a non-literal dependencies= into a scoped opaque, and an auth-named add_middleware into a /:path* proxy with a note', () => {
    const src = 'app = FastAPI()\napp.add_middleware(CORSMiddleware, allow_origins=["*"])\napp.add_middleware(AuthMiddleware)\nr = APIRouter(dependencies=COMMON)\n@r.get("/x")\ndef x(): ...\napp.include_router(r)\n@app.get("/y")\ndef y(): ...'
    const { routes, coverage } = analyzePython(files({ 'app/main.py': src }))
    expect(coverage.rules.find((c) => c.kind === 'opaque')).toMatchObject({ handler: 'app.main.x', reason: expect.stringContaining('dependencies nao literal') })
    expect(coverage.rules.find((c) => c.kind === 'path-pattern')).toMatchObject({ pattern: '/:path*', line: 3 })
    expect(coverage.notes.some((n) => n.includes('AuthMiddleware') && n.includes('proxy'))).toBe(true)
    expect(coverage.notes).toContain('middlewares ignorados por nome: CORSMiddleware')
    expect(verdictOf(routes, coverage, '/x')).toBe('indeterminada')   // opaco escopado vence o proxy? NAO: path-pattern casa /x → coberta...
  })
  it('marks routes of a router never included, or included by another router, as unresolved; no FastAPI() yields zero routes with a note', () => {
    const orphan = 'from fastapi import APIRouter\nrouter = APIRouter()\n@router.get("/o")\ndef o(): ...'
    const nested = 'from fastapi import APIRouter\nfrom app.sub import router as sub\nrouter = APIRouter()\nrouter.include_router(sub)'
    const sub = 'from fastapi import APIRouter\nrouter = APIRouter()\n@router.get("/leaf")\ndef leaf(): ...'
    const { routes, notes } = analyzePython(files({ 'app/orphan.py': orphan, 'app/nested.py': nested, 'app/sub.py': sub, 'app/main.py': 'app = FastAPI()\nfrom app.nested import router\napp.include_router(router)' }))
    expect(routes.find((r) => r.handler === 'app.orphan.o')?.unresolved).toContain('nao incluido')
    expect(routes.find((r) => r.handler === 'app.sub.leaf')?.unresolved).toContain('aninhad')
    expect(analyzePython(files({ 'app/lib.py': 'x = 1' })).routes).toEqual([])
    expect(notes.length).toBeGreaterThan(0)
  })
})
```

> Correcao do terceiro teste acima, decidida no planejamento: com `AuthMiddleware` global (proxy
> `/:path*`) E `dependencies=COMMON` opaco em `/x`, o motor devolve `coberta` para `/x` (o
> `path-pattern` casa antes do `opaque` ser considerado — `evaluateRoute` retorna no primeiro
> `covers`). E o comportamento do Plano 01 (G13: proxy e cobertura) e nao muda aqui. O teste afirma
> `verdictOf('/x') === 'coberta'` COM a nota de proxy presente, e um segundo `analyzePython` SEM o
> `add_middleware(AuthMiddleware)` afirma `'indeterminada'` para `/x` e `'DESCOBERTA'` para `/y`.
> Escrever o teste assim, nao como o rascunho.

```ts
describe('parsePythonFile — Flask (Flask docs Quickstart §Routing, Blueprints; Flask-Login)', () => {
  it('reads @app.route with methods (default GET), the verb shortcuts and converter segments as literal', () => {
    const src = 'from flask import Flask\napp = Flask(__name__)\n@app.route("/a", methods=["GET", "POST"])\ndef a(): ...\n@app.route("/b")\ndef b(): ...\n@app.get("/u/<int:id>")\ndef u(id): ...'
    expect(parsePythonFile(src, 'app.py', 'flask').routes.map(key)).toEqual(['GET /a app.a', 'POST /a app.a', 'GET /b app.b', 'GET /u/<int:id> app.u'])
  })
  it('prefixes blueprint routes with url_prefix, letting register_blueprint(url_prefix=) win', () => {
    const bp = 'from flask import Blueprint\nbp = Blueprint("admin", __name__, url_prefix="/admin")\n@bp.route("/users")\ndef users(): ...'
    const main = 'from flask import Flask\nfrom app.admin import bp\napp = Flask(__name__)\napp.register_blueprint(bp, url_prefix="/staff")'
    const { routes } = analyzePython(files({ 'app/__init__.py': '', 'app/main.py': main, 'app/admin.py': bp }))
    expect(routes.map(key)).toEqual(['GET /staff/users app.admin.users'])
  })
  it('counts @login_required and @jwt_required() between the route decorator and def as handler-chain, ignores non-auth decorators', () => {
    const src = 'app = Flask(__name__)\n@app.route("/a")\n@login_required\ndef a(): ...\n@app.route("/b")\n@cache.cached(60)\ndef b(): ...\n@app.route("/c")\n@jwt_required()\ndef c(): ...'
    const { routes, coverage } = analyzePython(files({ 'app.py': src }))
    expect(verdictOf(routes, coverage, '/a')).toBe('coberta')
    expect(verdictOf(routes, coverage, '/b')).toBe('DESCOBERTA')
    expect(verdictOf(routes, coverage, '/c')).toBe('coberta')
    expect(coverage.notes).toContain('decorators ignorados por nome: cached')
  })
  it('turns @app.before_request with an auth-named function into a /:path* proxy, and ignores others', () => {
    const src = 'app = Flask(__name__)\n@app.before_request\ndef require_login(): ...\n@app.before_request\ndef start_timer(): ...\n@app.route("/x")\ndef x(): ...'
    const { coverage } = analyzePython(files({ 'app.py': src }))
    expect(coverage.rules.filter((c) => c.kind === 'path-pattern')).toHaveLength(1)
    expect(coverage.rules[0]).toMatchObject({ pattern: '/:path*', line: 2 })
  })
})

describe('parseDjangoUrls — enumeracao sem cobertura (Django docs "URL dispatcher"; DP-6)', () => {
  it('reads path() entries as GET with the view expression as handler and a note that every verb reaches the view', () => {
    const src = 'from django.urls import path\nfrom . import views\nurlpatterns = [\n    path("", views.index, name="index"),\n    path("posts/<int:pk>/", views.detail),\n]'
    const { routes, notes } = parseDjangoUrls(src, 'blog/urls.py', 'blog.urls')
    expect(routes.map(key)).toEqual(['GET / blog.urls.views.index', 'GET /posts/<int:pk>/ blog.urls.views.detail'])
    expect(routes[1]?.line).toBe(5)
    expect(notes.some((n) => n.includes('todos os verbos'))).toBe(true)
  })
  it('follows include("app.urls") one level with its prefix, and marks re_path, url() and include(router.urls) as unresolved', () => {
    const root = 'from django.urls import include, path, re_path\nurlpatterns = [\n    path("blog/", include("blog.urls")),\n    re_path(r"^legacy/$", views.legacy),\n    path("api/", include(router.urls)),\n]'
    const blog = 'from django.urls import path\nurlpatterns = [path("", views.index)]'
    const { routes } = analyzePython(files({ 'mysite/settings.py': 'ROOT_URLCONF = "mysite.urls"\nimport django', 'mysite/urls.py': root, 'blog/urls.py': blog }))
    expect(routes.filter((r) => r.unresolved === undefined).map(key)).toEqual(['GET /blog/ blog.urls.views.index'])
    expect(routes.filter((r) => r.unresolved !== undefined).map((r) => r.unresolved)).toEqual([expect.stringContaining('re_path'), expect.stringContaining('include(')])
  })
  // 2026-09-06 (Luiz/dev): RF-04 — Django sem cobertura nesta versao: TUDO indeterminada, nunca coberta.
  it('emits one scoped opaque per Django handler so every Django route is indeterminada, never coberta', () => {
    const { routes, coverage } = analyzePython(files({ 'mysite/urls.py': 'from django.urls import path\nurlpatterns = [path("a/", views.a), path("b/", views.b)]' }))
    expect(routes.map((r) => evaluateRoute(r, coverage).verdict)).toEqual(['indeterminada', 'indeterminada'])
    expect(coverage.rules.every((c) => c.kind === 'opaque' && c.handler !== undefined)).toBe(true)
    expect(coverage.notes.some((n) => n.includes('Django') && n.includes('nao verificada'))).toBe(true)
  })
})

describe('pythonAdapter (fixture python-fastapi-minimal)', () => {
  it('CA-08 (Python): enumerates the five FastAPI routes with dotted handlers, covers by signature and include_router, and stays under the cut', () => {
    expect(detectPythonDialects(new Map([['app/main.py', 'from fastapi import FastAPI']]))).toEqual(new Set(['fastapi']))
    const routes = pythonAdapter.enumerate(FIXTURE)
    const cov = pythonAdapter.readCoverage(FIXTURE)
    expect(routes.every(isRoute)).toBe(true)
    expect(routes.map(key).sort()).toEqual([
      'DELETE /api/admin/users/{user_id} app.routers.admin.delete_user', 'GET /api/admin/users app.routers.admin.list_users',
      'GET /health app.main.health', 'GET /me app.main.me', 'POST /feedback app.main.feedback',
    ])
    expect(routes.find((r) => r.path === '/me')).toMatchObject({ file: 'app/main.py', line: 15, stack: 'python' })
    expect(verdictOf(routes, cov, '/me')).toBe('coberta')
    expect(verdictOf(routes, cov, '/api/admin/users/{user_id}', 'DELETE')).toBe('coberta')
    expect(verdictOf(routes, cov, '/health')).toBe('DESCOBERTA')
    expect(verdictOf(routes, cov, '/feedback', 'POST')).toBe('DESCOBERTA')
    const all = routes.map((r) => evaluateRoute(r, cov).verdict)
    expect(all.filter((v) => v === 'indeterminada').length / all.length).toBeLessThanOrEqual(0.25)
    expect(cov.notes).toContain('dependencias contadas como auth: get_current_user')
  })
})
```

### Passo 3: `route-auth-python.ts` — dialetos e parser de decorators (puro)

```ts
// route-auth-python.ts
// 2026-09-06 (Luiz/dev): adaptador Python — PRD tabela "Rota vem de urls.py (Django) ou decorator
// (FastAPI, Flask); cobertura de middleware do settings, Depends, decorator" (RF-01, D1). FastAPI e
// primeira classe (a matriz do repo e FastAPI-native); Django so enumera nesta versao (DP-6, RF-04).
// Fontes: knowledge/python/atoms/architecture-and-di-fastapi.md, security-fastapi-owasp.md;
// FastAPI docs "Bigger Applications"; Flask docs Quickstart/Blueprints; Flask-Login; Django "URL dispatcher".
import { QUOTES, lineOf, readBalanced, splitTopLevel } from './route-auth-heuristics'
import { authNameNotes, isAuthName, splitByAuthName } from './route-auth-heuristics'

export type PyDialect = 'fastapi' | 'flask' | 'django'
const DIALECT_RE: Readonly<Record<PyDialect, RegExp>> = {
  fastapi: /^\s*(?:from\s+fastapi\b|import\s+fastapi\b)/m,
  flask: /^\s*(?:from\s+flask\b|import\s+flask\b)/m,
  django: /^\s*(?:from\s+django\b|import\s+django\b)|\bROOT_URLCONF\b/m,
}
export function detectPythonDialects(sources: ReadonlyMap<string, string>): Set<PyDialect>

/** `app/routers/admin.py` → `app.routers.admin`; `app/__init__.py` → `app`; `src/x.py` → `x` (nota: prefixo src/ removido). */
export function moduleOf(file: string): string

type DialectSpec = {
  appCtor: RegExp        // FastAPI: /=\s*FastAPI\(/  | Flask: /=\s*Flask\(/
  groupCtor: RegExp      // FastAPI: /=\s*APIRouter\(/ | Flask: /=\s*Blueprint\(/
  groupPrefixKw: string  // 'prefix' | 'url_prefix'
  verbs: ReadonlySet<string>          // get post put patch delete + api_route (FastAPI) | route + shortcuts (Flask)
  includeCall: RegExp    // /\.include_router\(/ | /\.register_blueprint\(/
  includePrefixKw: string
  authDecorators: boolean            // Flask: decorator entre a rota e o def com isAuthName conta
  globalMiddleware: RegExp[]         // FastAPI: [/\.add_middleware\(\s*([A-Za-z_]\w*)/, /^\s*@([A-Za-z_]\w*)\.middleware\(/m] | Flask: [/^\s*@([A-Za-z_]\w*)\.before_request\s*$/m]
}
// Hash map por dialeto (CLAUDE.md): a mesma maquina de "decorator + def" serve FastAPI e Flask.
const DIALECTS: Readonly<Record<Exclude<PyDialect, 'django'>, DialectSpec>> = { fastapi: {...}, flask: {...} }

// Exemplos que casam / nao casam:
const DECORATOR_RE = /^\s*@([A-Za-z_]\w*)\.([a-z_]+)\s*\(/gm
//   casa: `@router.get(`, `@app.api_route(`, `@bp.route(` | nao casa: `@login_required` (sem owner — e "decorator de auth", lido no bloco entre rota e def)
const DEF_RE = /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/m
const PLAIN_DECORATOR_RE = /^\s*@([A-Za-z_][\w.]*)\s*(?:\(|$)/          // `@login_required`, `@jwt_required()`, `@auth.login_required`
const DEP_RE = /\b(?:Depends|Security)\(\s*([A-Za-z_][\w.]*)\s*[,)]/g   // Depends(f), Security(f, scopes=[...]), Depends(auth.f) → ultimo segmento
const PATH_LITERAL_RE = /^(?:path\s*=\s*)?(['"])([^'"]*)\1$/
//   casa: `"/users"`, `path="/k"` | nao casa: `f"{P}/x"` (→ unresolved 'path nao literal: f-string'), `ROUTE` (→ 'path nao literal: variavel')
const METHODS_KW_RE = /\bmethods\s*=\s*\[([^\]]*)\]/
const IMPORT_FROM_RE = /^\s*from\s+([.\w]+)\s+import\s+(.+)$/gm      // `from app.routers import admin`, `from .routers.admin import router as r`
const IMPORT_AS_RE = /^\s*import\s+([\w.]+)(?:\s+as\s+([A-Za-z_]\w*))?\s*$/gm

export type PyRouteDecl = { owner: string; method: HttpMethod; path: string; func: string; deps: string[]; signatureDeps: string[]; authDecorators: string[]; ignoredDecorators: string[]; opaqueDeps?: string; line: number; unresolved?: string }
export type PyGroup = { prefix: string; dependencies: string[]; opaqueDeps?: string; line: number }
export type PyInclude = { target: string; prefix: string; dependencies: string[]; opaqueDeps?: string; line: number }
export type PyFile = { file: string; module: string; dialect: Exclude<PyDialect, 'django'>; apps: string[]; groups: Map<string, PyGroup>; routes: PyRouteDecl[]; includes: PyInclude[]; imports: Map<string, string>; middlewares: Array<{ name: string; line: number }>; notes: string[] }

/** Puro. Para cada DECORATOR_RE com verbo do dialeto: args via readBalanced(desde o '(') + splitTopLevel;
 *  depois pula decorators simples (PLAIN_DECORATOR_RE — Flask: coleta os com isAuthName em authDecorators, os
 *  outros em ignoredDecorators) ate DEF_RE; assinatura via readBalanced → DEP_RE → signatureDeps.
 *  `dependencies=` literal `[...]` → DEP_RE sobre o corpo; qualquer outra expressao → opaqueDeps. */
export function parsePythonFile(source: string, file: string, dialect: Exclude<PyDialect, 'django'>): PyFile

/** Django: `urlpatterns = [ ... ]` via readBalanced; cada elemento via splitTopLevel: path('x/', view) → GET /x/
 *  handler `${module}.${viewExpr}`; include("m") → { prefix, module }; include(expr) / re_path / url( → unresolved.
 *  Uma nota fixa: 'Django: todos os verbos chegam na view; enumerado como GET'. */
export function parseDjangoUrls(source: string, file: string, module: string): { routes: Route[]; includes: Array<{ prefix: string; module: string; line: number }>; notes: string[] }
```

### Passo 4: `analyzePython` — resolucao de modulos, prefixos, cadeia de deps, cobertura

```ts
export type PythonAnalysis = { routes: Route[]; coverage: CoverageMap; notes: string[] }

export function analyzePython(sources: ReadonlyMap<string, string>): PythonAnalysis {
  const dialects = detectPythonDialects(sources)
  // nenhum dialeto → { routes: [], coverage: { stack: 'python', rules: [], sources: [], notes: ['nenhum import de fastapi/flask/django encontrado'] } } (DP-13)
  // moduleIndex: modulo dotted → file (moduleOf), para resolver imports e include("m")
  // --- FastAPI / Flask (mesmo fluxo, spec por dialeto) ---
  // 1. parsed = parsePythonFile por arquivo cujo texto casa o DIALECT_RE do dialeto
  // 2. rotas de app (owner ∈ apps): Route { method, path, file, line: decl.line, stack: 'python', handler: `${module}.${func}` }
  // 3. includes: target `admin.router` → imports.get('admin') → modulo → arquivo → group 'router';
  //    target `router` local → group do mesmo arquivo; target `users_router` → imports → 'app.routers.users.router' → modulo + var.
  //    rotas do grupo: path = joinPaths(include.prefix, group.prefix, route.path). Grupo incluido por OUTRO grupo
  //    (`router.include_router(sub)` / `bp.register_blueprint`) → rotas do sub: unresolved 'inclusao aninhada (2 niveis) fora do subset'.
  //    Grupo nunca incluido → unresolved 'APIRouter/Blueprint `<var>` em <file> nao incluido por app.include_router()/register_blueprint() em arquivo escaneado — prefixo desconhecido'
  // 4. cobertura por rota (DP-1), na ordem de especificidade; UMA handler-chain por rota:
  //    (a) signatureDeps com isAuthName → via `Depends(<name>) na assinatura (<file>:<defLine>)`
  //    (b) decl.deps (decorator dependencies=) → via `Depends(<name>) no decorator (<file>:<line>)`
  //    (c) Flask authDecorators → via `@<name> entre a rota e a funcao (<file>:<line>)`
  //    (d) group.dependencies → via `Depends(<name>) em APIRouter(dependencies=) (<file>:<groupLine>)`
  //    (e) include.dependencies → via `Depends(<name>) em include_router(dependencies=) (<file>:<includeLine>)`
  //    opaqueDeps em qualquer camada da cadeia (rota, grupo, include) → { kind: 'opaque', handler, reason: 'dependencies nao literal: <expr> em <file>:<line>', file, line }
  //    e NAO emite handler-chain (mesmo que outra camada tenha auth: nao da para provar a ordem/efeito)
  // 5. middleware global: spec.globalMiddleware → nome com isAuthName → { kind: 'path-pattern', pattern: '/:path*', file, line }
  //    + nota `<file>:<line>: middleware <name> com nome de auth roda em toda rota — cobertura por proxy, nao prova que autentica`
  // 6. notes += authNameNotes('dependencias', ...) + authNameNotes('decorators', ...) + authNameNotes('middlewares', ...)
  // --- Django ---
  // 7. roots: `urls.py` cujo modulo e ROOT_URLCONF (settings.py) ou, sem settings, todo urls.py nao incluido por outro
  //    include("m") um nivel → prefixo; rotas resolvidas + unresolved conforme parseDjangoUrls
  // 8. cobertura Django: para cada handler resolvido, { kind: 'opaque', handler, reason: 'Django: cobertura (login_required/LoginRequiredMixin/MIDDLEWARE) nao verificada nesta versao', file, line }
  //    + nota unica 'Django: cobertura nao verificada nesta versao — toda rota Django sai indeterminada (RF-04)'
  // 9. routes ordenadas por path e metodo; sources = arquivos com app/grupo/urlpatterns (ordenados)
}

function joinPaths(...parts: string[]): string   // '' + '/api' + '/admin' + '/users' → '/api/admin/users'; sem '//'; Django mantem barra final
```

### Passo 5: Disco e adaptador

```ts
const EXCLUDE_DIRS = new Set(['.venv', 'venv', 'site-packages', '__pycache__', 'migrations', 'tests', 'node_modules', '.git'])
const SKIP_FILE_RE = /(^|\/)test_[^/]*\.py$|_test\.py$/

function collectSources(targetDir: string): Map<string, string>   // **/*.py, POSIX relativo, ordenado
export function enumeratePythonRoutes(targetDir: string): PythonAnalysis { return analyzePython(collectSources(targetDir)) }
export function readPythonCoverage(targetDir: string): CoverageMap { return enumeratePythonRoutes(targetDir).coverage }

export const pythonAdapter: RouteAdapter = {
  stack: 'python',
  enumerate: (targetDir) => enumeratePythonRoutes(targetDir).routes,
  readCoverage: readPythonCoverage,
  // DP-9: sem G2 nesta versao (deps.py / dependencies= que perdem auth nao sao detectados como perda).
}
```

### Passo 6: Manifest

`bun run generate:manifest` — `route-auth-python.ts` e lib nova rastreada (G3).

---

## Gotchas

- **G14 do plano:** `include_router(prefix) + APIRouter(prefix) + path` — TRES partes. Esquecer o
  `prefix` do `APIRouter` produz `/api/users` em vez de `/api/admin/users` e o golden da fixture cai.
  Dependencias somam nas tres camadas (o teste de abuso cobre `/b` sem nada ao lado de `/a` com).
- **G16 do plano:** Django = `opaque` escopado por handler → `indeterminada` medium por rota. Num
  projeto Django grande e MUITO ruido — Decisao 8 do PRD; a nota diz por que. Nao filtrar.
- **G17 do plano:** `Depends(get_db)` → `isAuthName('get_db')` false → ignorado (nota
  `dependencias ignoradas por nome: get_db`). `Depends(get_current_user)` conta sem ler o corpo.
  `add_middleware(SessionMiddleware)` → `session` NAO casa `session_required` → ignorado; e o
  comportamento esperado (session middleware nao autentica).
- **Local — proxy global vence opaco escopado no motor:** `evaluateRoute` devolve no primeiro
  `covers`; com `path-pattern '/:path*'` (AuthMiddleware) toda rota e `coberta`, inclusive as com
  `dependencies=` opaco. E o G13 do Plano 01 (proxy = cobertura, com nota). O teste do Passo 2 foi
  corrigido para afirmar isso e para provar o `opaque` num segundo cenario sem middleware.
- **Local — `Depends()` sem argumento (`user: User = Depends()`):** FastAPI usa a anotacao como
  dependencia. Fora do subset: `DEP_RE` nao casa (exige nome) → nao conta → nota
  `<file>:<line>: Depends() sem argumento — fora do subset, nao conta`.
- **Local — assinatura multi-linha:** `readBalanced` desde o `(` do `def` le ate o `)` correspondente
  mesmo com quebras de linha; `DEP_RE` roda sobre o corpo inteiro. A `line` da rota e a do DECORATOR
  (RF-05 aponta a declaracao), e o `via` da assinatura cita a linha do `def`.
- **Local — dois decorators de rota na mesma funcao** (`@app.get("/a")` + `@app.get("/a/")`): cada
  decorator vira uma rota com o mesmo `handler`; a `handler-chain` (por handler) casa as duas. Dedupe
  de regras por `handler`.
- **Local — `@router.get` com `router` importado de outro modulo** (rota declarada num arquivo, router
  definido noutro): o owner `router` nao esta em `groups` do arquivo → procurar em `imports` → grupo
  do modulo importado; rotas ganham o prefixo desse grupo. Fora disso → nota `owner <var> nao
  reconhecido como app/router` e a linha NAO vira rota (nao inventar).
- **Local — `moduleOf` e `src/`:** `src/app/main.py` → `app.main` (prefixo `src/` removido, nota
  unica). Projetos com `src/` como pacote real (`from src.app import x`) resolvem errado — nota e
  limite conhecido; o import nao resolvido vira `unresolved` no include, nunca rota inventada.
- **Local — Flask `methods=` sem `route`:** `@app.get` ja fixa o verbo; `methods=` em `@app.route`
  ausente = `['GET']` (Flask docs: default GET; `HEAD`/`OPTIONS` implicitos NAO sao enumerados —
  nota). Divergencia com Rails `match via: :all` (7): la e explicito.
- **Local — Django `path("", ...)`:** path vazio → `/` + prefixo do include (`/blog/`). Barra final
  mantida (dialeto Django); `normalizePath` da allowlist trata `/blog/` = `/blog`.

---

## Verificacao

### TDD

- [ ] **RED 1 (arquivo novo):** `bun test skills/security/lib/route-auth-python.test.ts` → modulo
  ausente (aceito). Apos stub `parsePythonFile = () => ({ ...vazio })`: `-t 'reads FastAPI'` →
  `Expected: ["app"], Received: []`
- [ ] **RED 2 (abuso):** `-t 'sibling route'` → com cadeia ingenua (qualquer `Depends` no arquivo cobre
  tudo): `Expected: "DESCOBERTA", Received: "coberta"` em `/b`
- [ ] **RED 3 (Django RF-04):** `-t 'never coberta'` → com cobertura Django vazia (sem opaque):
  `Expected: ["indeterminada","indeterminada"], Received: ["DESCOBERTA","DESCOBERTA"]` — tambem
  nao e silencio, mas afirma o que nao da para afirmar; o `opaque` e a resposta honesta
- [ ] **GREEN:** `bun test skills/security/lib/route-auth-python.test.ts` → `16 pass, 0 fail`

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `does not let a Depends on a sibling route cover the route without it`
      FALHOU antes da cadeia por rota existir — `Depends` "no arquivo" contando como cobertura de
      todas as rotas do arquivo e falsa garantia (impacto alto do PRD)
- [ ] **Segundo abuso no RED:** `marks routes of a router never included ... as unresolved` FALHOU
      antes (rota de router orfao saia com path sem prefixo = path inventado, RF-09)
- [ ] **CA-08 (parcial — Python):** `-t 'CA-08'` → 1 pass; as 5 rotas batem com a tabela do Passo 1
- [ ] **RF-04 (Django):** `-t 'never coberta'` → 1 pass; nenhuma rota Django e `coberta`
- [ ] **CA-05-equivalente Python:** f-string/variavel no path → `unresolved` (`-t 'f-string'`)
- [ ] **Premissa 3 medida:** FastAPI `0 / 5 = 0.00` registrado no MEMORY; Django NAO entra no corte
      (G16 — nao promete cobertura)
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A fase nao altera auth de projeto real
- [ ] **Nenhum secret literal:** `grep -rniE "SECRET\s*=|API_KEY\s*=|Bearer [A-Za-z0-9]" tests/fixtures/route-auth-matrix/python-fastapi-minimal skills/security/lib/route-auth-python.ts` → vazio (G19)

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) em (a)–(e), usar as deps do
      ARQUIVO em vez das da rota → `sibling route` FALHA em `/b`; restaurar. (2) Remover o `prefix` do
      grupo em `joinPaths` → `G14: concatenates` FALHA (`/api/users`) e o CA-08 da fixture FALHA;
      restaurar. (3) Trocar o `opaque` Django por nada → `never coberta` FALHA; trocar por
      `path-pattern '/:path*'` → FALHA com `Received: "coberta"` (o pior caso — prova que o teste pega
      falsa garantia); restaurar. (4) Fazer `isAuthName` devolver `true` para tudo → `ignores non-auth
      decorators` FALHA (`/b` coberta por `cached`) e a nota `decorators ignorados por nome: cached`
      some; restaurar. (5) Trocar `unresolved` por path literal no ramo f-string → `-t 'f-string'`
      FALHA; restaurar.
- [ ] `grep -n "switch" skills/security/lib/route-auth-python.ts` → vazio (hash map `DIALECTS`)
- [ ] `grep -nE "\bas [A-Z]" skills/security/lib/route-auth-python.ts` → vazio
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G3)
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G25)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G15)
- [ ] GT-fase02-1: arquivo de teste novo — RED de compilacao aceito e registrado como tal
- [ ] **Nenhum `.ts` novo em `tests/fixtures/`** (G1): `git status --porcelain tests/fixtures | grep '\.ts$'` → vazio
- [ ] Taxa de indeterminada Python (FastAPI) registrada no MEMORY; nota de que Django fica fora do corte
- [ ] MEMORY.md: DI/BUG/GT desta fase; Metricas (3/5); contagens reais se diferirem

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-python.test.ts` retorna `16 pass, 0 fail`
- `bun test skills/security/lib/route-auth-python.test.ts -t 'CA-08|sibling|never coberta|G14'` retorna `0 fail`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning

**Por humano:**
- Num projeto FastAPI real, `pythonAdapter.enumerate(<projeto>)` num REPL do Bun lista as rotas com
  `handler` dotted e prefixos concatenados; comparar 5 rotas com `/docs` (OpenAPI) do projeto — o que
  nao bate esta em `unresolved` com razao, nunca inventado — **pendente de projeto FastAPI
  disponivel**; registrar como divida se nao houver

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
