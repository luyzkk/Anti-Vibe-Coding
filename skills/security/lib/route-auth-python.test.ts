// skills/security/lib/route-auth-python.test.ts
// 2026-09-06 (Luiz/dev): adaptador Python — Plano 04 fase-03 PARTE A (FastAPI). Fontes:
// knowledge/python/atoms/architecture-and-di-fastapi.md, security-fastapi-owasp.md; FastAPI docs
// "Bigger Applications - Multiple Files" (include_router concatena prefix; dependencies do include
// aplicam a todas as rotas do router). Flask e Django ficam para a Parte B deste mesmo plano.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { evaluateRoute } from './route-auth-matrix'
import { isRoute } from './route-auth-matrix.types'
import type { CoverageMap, Route, Verdict } from './route-auth-matrix.types'
import { analyzePython, detectPythonDialects, parseDjangoUrls, parsePythonFile, pythonAdapter } from './route-auth-python'

const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/python-fastapi-minimal')
const files = (entries: Record<string, string>): ReadonlyMap<string, string> => new Map(Object.entries(entries))
const key = (r: Route): string => `${r.method} ${r.path} ${r.handler ?? ''}${r.unresolved === undefined ? '' : ' [unresolved]'}`
const verdictOf = (routes: Route[], cov: CoverageMap, path: string, method = 'GET'): Verdict => {
  const route = routes.find((r) => r.path === path && r.method === method)
  if (route === undefined) throw new Error(`fixture nao tem rota ${method} ${path}`)
  return evaluateRoute(route, cov).verdict
}

describe('parsePythonFile — FastAPI (atom architecture-and-di-fastapi; FastAPI docs "Bigger Applications")', () => {
  it('reads FastAPI()/APIRouter(prefix, dependencies) declarations and decorated routes with path, method, function, line and decorator deps', () => {
    const src =
      'from fastapi import APIRouter, Depends, FastAPI\napp = FastAPI()\nrouter = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])\n\n@router.get("/users", dependencies=[Depends(audit)])\nasync def list_users():\n    return []\n\n@app.post("/x")\ndef create(): ...'
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
    const src =
      'app = FastAPI()\n@app.get("/a")\nasync def a(user: User = Depends(get_current_user)): ...\n@app.get("/b")\nasync def b(user: Annotated[User, Depends(auth.current_user)], s = Security(scopes_ok, scopes=["x"])): ...'
    const p = parsePythonFile(src, 'app/main.py', 'fastapi')
    expect(p.routes[0]?.signatureDeps).toEqual(['get_current_user'])
    expect(p.routes[1]?.signatureDeps).toEqual(['current_user', 'scopes_ok'])
  })

  // 2026-09-06 (Luiz/dev): DP-2 / RF-09 — f-string ou variavel no path nunca vira path inventado.
  it('reads api_route(methods=[...]) and path= kwarg, and marks f-string or variable paths as unresolved', () => {
    const src =
      'app = FastAPI()\n@app.api_route("/r", methods=["GET", "PUT"])\ndef r(): ...\n@app.get(path="/k")\ndef k(): ...\n@app.get(f"{PREFIX}/x")\ndef fx(): ...\n@app.get(ROUTE)\ndef v(): ...'
    const p = parsePythonFile(src, 'app/main.py', 'fastapi')
    expect(p.routes.map(key)).toEqual([
      'GET /r app.main.r',
      'PUT /r app.main.r',
      'GET /k app.main.k',
      'GET /f"{PREFIX}/x" app.main.fx [unresolved]',
      'GET /ROUTE app.main.v [unresolved]',
    ])
    expect(p.routes[3]?.unresolved).toContain('f-string')
  })

  it('resolves absolute, relative and aliased imports to dotted modules', () => {
    const src = 'from app.routers import admin\nfrom .routers.users import router as users_router\nimport app.routers.billing as billing\nfrom ..shared import deps'
    const p = parsePythonFile(src, 'app/main.py', 'fastapi')
    expect([...p.imports.entries()]).toEqual([
      ['admin', 'app.routers.admin'],
      ['users_router', 'app.routers.users.router'],
      ['billing', 'app.routers.billing'],
      ['deps', 'shared.deps'],
    ])
  })
})

describe('analyzePython — include_router, cadeia de Depends e middleware (FastAPI)', () => {
  const main =
    'from fastapi import Depends, FastAPI\nfrom app.routers import admin\napp = FastAPI()\napp.include_router(admin.router, prefix="/api", dependencies=[Depends(get_current_user)])'
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
    const src =
      'from fastapi import APIRouter, Depends, FastAPI\napp = FastAPI()\n@app.get("/a")\ndef a(u = Depends(get_current_user)): ...\n@app.get("/b")\ndef b(): ...\nr = APIRouter(dependencies=[Depends(require_login)])\n@r.get("/c")\ndef c(): ...\napp.include_router(r)'
    const { routes, coverage } = analyzePython(files({ 'app/main.py': src }))
    expect(verdictOf(routes, coverage, '/a')).toBe('coberta')
    expect(verdictOf(routes, coverage, '/b')).toBe('DESCOBERTA')
    expect(verdictOf(routes, coverage, '/c')).toBe('coberta')
  })

  // 2026-09-06 (Luiz/dev): correcao decidida no planejamento (README do fase-03, apos o bloco de
  // codigo do Passo 2) — path-pattern '/:path*' casa ANTES do opaque ser considerado (evaluateRoute
  // devolve no primeiro `covers`), entao /x sai coberta com o AuthMiddleware presente. Um segundo
  // cenario SEM add_middleware(AuthMiddleware) prova o opaque isolado (/x indeterminada, /y DESCOBERTA).
  it('turns a non-literal dependencies= into a scoped opaque, and an auth-named add_middleware into a /:path* proxy with a note', () => {
    // 2026-09-06 (Luiz/dev): a linha de import e necessaria aqui (diferente do rascunho do doc) —
    // este teste tem UM SO arquivo, entao detectPythonDialects nao tem de onde "herdar" o dialeto de
    // um arquivo irmao (diferente do teste de router orfao/aninhado, que tem 3 outros arquivos com
    // `from fastapi import`). Sem a linha, dialects fica vazio e a analise inteira sai `routes: []`.
    const src =
      'from fastapi import APIRouter, Depends, FastAPI\napp = FastAPI()\napp.add_middleware(CORSMiddleware, allow_origins=["*"])\napp.add_middleware(AuthMiddleware)\nr = APIRouter(dependencies=COMMON)\n@r.get("/x")\ndef x(): ...\napp.include_router(r)\n@app.get("/y")\ndef y(): ...'
    const { routes, coverage } = analyzePython(files({ 'app/main.py': src }))
    expect(coverage.rules.find((c) => c.kind === 'opaque')).toMatchObject({ handler: 'app.main.x', reason: expect.stringContaining('dependencies nao literal') })
    expect(coverage.rules.find((c) => c.kind === 'path-pattern')).toMatchObject({ pattern: '/:path*', line: 4 })
    expect(coverage.notes.some((n) => n.includes('AuthMiddleware') && n.includes('proxy'))).toBe(true)
    expect(coverage.notes).toContain('middlewares ignorados por nome: CORSMiddleware')
    expect(verdictOf(routes, coverage, '/x')).toBe('coberta') // path-pattern casa antes do opaque ser considerado

    const noAuthMiddleware =
      'from fastapi import APIRouter, Depends, FastAPI\napp = FastAPI()\napp.add_middleware(CORSMiddleware, allow_origins=["*"])\nr = APIRouter(dependencies=COMMON)\n@r.get("/x")\ndef x(): ...\napp.include_router(r)\n@app.get("/y")\ndef y(): ...'
    const second = analyzePython(files({ 'app/main.py': noAuthMiddleware }))
    expect(verdictOf(second.routes, second.coverage, '/x')).toBe('indeterminada')
    expect(verdictOf(second.routes, second.coverage, '/y')).toBe('DESCOBERTA')
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

describe('parsePythonFile — Flask (Flask docs Quickstart §Routing, Blueprints; Flask-Login)', () => {
  it('reads @app.route with methods (default GET), the verb shortcuts and converter segments as literal', () => {
    const src =
      'from flask import Flask\napp = Flask(__name__)\n@app.route("/a", methods=["GET", "POST"])\ndef a(): ...\n@app.route("/b")\ndef b(): ...\n@app.get("/u/<int:id>")\ndef u(id): ...'
    expect(parsePythonFile(src, 'app.py', 'flask').routes.map(key)).toEqual(['GET /a app.a', 'POST /a app.a', 'GET /b app.b', 'GET /u/<int:id> app.u'])
  })

  it('prefixes blueprint routes with url_prefix, letting register_blueprint(url_prefix=) win', () => {
    const bp = 'from flask import Blueprint\nbp = Blueprint("admin", __name__, url_prefix="/admin")\n@bp.route("/users")\ndef users(): ...'
    const main = 'from flask import Flask\nfrom app.admin import bp\napp = Flask(__name__)\napp.register_blueprint(bp, url_prefix="/staff")'
    const { routes } = analyzePython(files({ 'app/__init__.py': '', 'app/main.py': main, 'app/admin.py': bp }))
    expect(routes.map(key)).toEqual(['GET /staff/users app.admin.users'])
  })

  // 2026-09-06 (Luiz/dev): DI-fase03B-flask-import-needed — o rascunho do doc de planejamento (Passo
  // 2) nao tem `from flask import Flask` nestes dois testes; sem ela detectPythonDialects nao acha o
  // dialeto (arquivo unico, sem irmao para "herdar" de — mesmo problema que o teste FastAPI do
  // add_middleware ja tinha, corrigido na Parte A). Adicionada aqui pelo mesmo motivo.
  it('counts @login_required and @jwt_required() between the route decorator and def as handler-chain, ignores non-auth decorators', () => {
    const src =
      'from flask import Flask\napp = Flask(__name__)\n@app.route("/a")\n@login_required\ndef a(): ...\n@app.route("/b")\n@cache.cached(60)\ndef b(): ...\n@app.route("/c")\n@jwt_required()\ndef c(): ...'
    const { routes, coverage } = analyzePython(files({ 'app.py': src }))
    expect(verdictOf(routes, coverage, '/a')).toBe('coberta')
    expect(verdictOf(routes, coverage, '/b')).toBe('DESCOBERTA')
    expect(verdictOf(routes, coverage, '/c')).toBe('coberta')
    expect(coverage.notes).toContain('decorators ignorados por nome: cached')
  })

  it('turns @app.before_request with an auth-named function into a /:path* proxy, and ignores others', () => {
    const src = 'from flask import Flask\napp = Flask(__name__)\n@app.before_request\ndef require_login(): ...\n@app.before_request\ndef start_timer(): ...\n@app.route("/x")\ndef x(): ...'
    const { coverage } = analyzePython(files({ 'app.py': src }))
    expect(coverage.rules.filter((c) => c.kind === 'path-pattern')).toHaveLength(1)
    expect(coverage.rules[0]).toMatchObject({ pattern: '/:path*', line: 3 })
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
    const root =
      'from django.urls import include, path, re_path\nurlpatterns = [\n    path("blog/", include("blog.urls")),\n    re_path(r"^legacy/$", views.legacy),\n    path("api/", include(router.urls)),\n]'
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
      'DELETE /api/admin/users/{user_id} app.routers.admin.delete_user',
      'GET /api/admin/users app.routers.admin.list_users',
      'GET /health app.main.health',
      'GET /me app.main.me',
      'POST /feedback app.main.feedback',
    ])
    expect(routes.find((r) => r.path === '/me')).toMatchObject({ file: 'app/main.py', line: 15, stack: 'python' })
    expect(verdictOf(routes, cov, '/me')).toBe('coberta')
    expect(verdictOf(routes, cov, '/api/admin/users/{user_id}', 'DELETE')).toBe('coberta')
    expect(verdictOf(routes, cov, '/health')).toBe('DESCOBERTA')
    expect(verdictOf(routes, cov, '/feedback', 'POST')).toBe('DESCOBERTA')
    const all = routes.map((r) => evaluateRoute(r, cov).verdict)
    expect(all.filter((v) => v === 'indeterminada').length / all.length).toBeLessThanOrEqual(0.25)
    expect(cov.notes).toContain('dependencias contadas como auth: get_current_user')
    // 2026-09-06 (Luiz/dev): GT-fase02-1 (Plano 04 MEMORY) — a fixture precisa de um nome NAO-auth ao
    // lado de um auth para exercitar isAuthName nas duas direcoes; get_locale (nao-auth) fica no
    // /feedback ao lado de get_current_user (auth) em /me e no include_router.
    expect(cov.notes).toContain('dependencias ignoradas por nome: get_locale')
  })
})
