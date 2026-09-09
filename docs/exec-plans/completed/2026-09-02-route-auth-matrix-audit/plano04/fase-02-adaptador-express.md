<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Adaptador Express

**Plano:** 04 — Os outros tres adaptadores + multi-stack
**Sizing:** 2h
**Depende de:** fase-01 (Passo 0: `handler-chain`, `unresolved`, `isAuthName`, `readBalanced`/`splitTopLevel`)
**Visual:** false

---

## O que esta fase entrega

`expressAdapter` enumera `app.<verb>`/`router.<verb>`/`app.route().<verb>` por regex/linha sobre
`.ts/.tsx/.js/.jsx/.mjs/.cjs`, monta routers importados (um nivel) com prefixo, e prova cobertura
pela ORDEM da cadeia: middleware de rota com nome de auth, `app.use(auth)` antes da rota no mesmo
arquivo, `app.use('/prefix', auth)` antes de rota sob o prefixo, `router.use(auth)` antes da rota do
router, `app.use(auth)` antes da montagem do router — cada caso vira uma `handler-chain` com `via`
nomeando o `use` e a linha; `use` DEPOIS da rota nao cobre (e a nota diz). Path nao literal, `*`,
grupo regex ou RegExp viram `Route.unresolved` → `indeterminada` (CA-05, G12). `hasExpress(targetDir)`
decide se o adaptador se aplica (DP-12, registrado na fase-04). A taxa de `indeterminada` da fixture
(Premissa 3) e medida aqui.

**DP aplicadas:** DP-5 (+5a: nenhum `path-pattern` no Express — ver MEMORY DEV-plan-3), DP-1, DP-2,
DP-3, DP-10 (fixture `express-minimal` em `.mjs`), DP-12 (`hasExpress` exportada aqui; `applies` na fase-04).

Source-driven: nao ha atom de roteamento Express em `knowledge/nodejs-typescript/`. Cada forma
sintatica aceita cita a documentacao oficial do Express — 4.x API reference (`app.METHOD`,
`app.use([path,] callback [, callback...])`, `express.Router()`, `app.route()`, `app.all()`) e o
Express 5 migration guide (§"Path syntax changes": `*` → `/*splat`, grupos regex e `?`/`+` removidos,
path-to-regexp v8).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-express.test.ts` | Create (PRIMEIRO) | 14 testes: `parseExpressFile` (7), ordem de `use` via `analyzeExpress` puro (3), mount/import (2), fixture + `hasExpress` (2) |
| `skills/security/lib/route-auth-express.ts` | Create | `parseExpressFile`, `analyzeExpress`, `enumerateExpressRoutes`, `readExpressCoverage`, `hasExpress`, `expressAdapter` |
| `tests/fixtures/route-auth-matrix/express-minimal/**` (4 arquivos: `package.json`, `src/app.mjs`, `src/routes/admin.mjs`, `src/auth.mjs`) | Create | dados em `.mjs` (G1/G2) — nao typechecados, nao bloqueados |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) — lib nova |
| `skills/security/lib/route-auth-matrix.ts` | Modify (SO se faltar algo do Passo 0) | esperado: nenhuma mudanca |

> Dentro do limite (2 arquivos de codigo + fixture + manifest).

---

## Implementacao

### Passo 1: Fixture `express-minimal` (dados)

`tests/fixtures/route-auth-matrix/express-minimal/package.json` — `express` em `dependencies` (DP-12)
e `typescript` em `devDependencies` (para `detectStack` devolver `node-ts`):
```json
{
  "name": "express-minimal",
  "private": true,
  "type": "module",
  "dependencies": { "express": "^5.1.0" },
  "devDependencies": { "typescript": "^5" }
}
```

`src/app.mjs` (numeracao importa — golden da fase-05)
```js
// 2026-09-06 (Luiz/dev): fixture CA-08/CA-05 Express — a ORDEM do use decide; path nao literal vira unresolved.
import express from 'express'
import adminRouter from './routes/admin.mjs'
import { requireAuth } from './auth.mjs'

const app = express()

app.get('/health', (req, res) => res.json({ ok: true }))

app.use(requireAuth)

app.get('/api/preferences', (req, res) => res.json({}))
app.post('/api/preferences', (req, res) => res.status(204).end())

const base = '/api/v2'
app.get(`${base}/reports`, (req, res) => res.json([]))

app.use('/admin', adminRouter)

export default app
```

`src/routes/admin.mjs`
```js
import { Router } from 'express'
import { requireAdmin } from '../auth.mjs'

const router = Router()

router.get('/users', (req, res) => res.json([]))
router.delete('/users/:id', requireAdmin, (req, res) => res.status(204).end())

export default router
```

`src/auth.mjs` — middlewares que so checam presenca de header; nenhum token literal (G19)
```js
// Middlewares de fixture: checam so a presenca do header. Nenhum token literal.
export function requireAuth(req, res, next) {
  if (!req.headers.authorization) return res.status(401).end()
  next()
}
export function requireAdmin(req, res, next) {
  if (req.headers['x-role'] !== 'admin') return res.status(403).end()
  next()
}
```

**Enumeracao esperada (6 rotas):**

| method | path | handler (= `file:line`) | cobertura | veredito |
|---|---|---|---|---|
| GET | `/health` | `src/app.mjs:8` | `app.use(requireAuth)` esta na linha 10, DEPOIS → nenhuma | DESCOBERTA high |
| GET | `/api/preferences` | `src/app.mjs:12` | `handler-chain` via `app.use(requireAuth) em src/app.mjs:10, antes da rota` | coberta |
| POST | `/api/preferences` | `src/app.mjs:13` | idem | coberta |
| GET | `` /${base}/reports `` | `src/app.mjs:16` | — | indeterminada (`unresolved`: template literal com `${}`) — CA-05 |
| GET | `/admin/users` | `src/routes/admin.mjs:6` | via `app.use(requireAuth) em src/app.mjs:10, antes da montagem do router (src/app.mjs:18)` | coberta |
| DELETE | `/admin/users/:id` | `src/routes/admin.mjs:7` | via `middleware de rota requireAdmin` (o mais especifico vence; o global tambem cobriria) | coberta |

Taxa Premissa 3: `1 / 6 = 0.17` (< 0.25) → registrar no MEMORY. `hasExpress(express-minimal)` = true;
`hasExpress(nextjs-minimal)` = false (nao tem `package.json` com express).

### Passo 2: Testes PRIMEIRO (`route-auth-express.test.ts`)

```ts
// route-auth-express.test.ts (arquivo NOVO — RED de compilacao ate a lib existir, aceito)
import { analyzeExpress, enumerateExpressRoutes, expressAdapter, hasExpress, parseExpressFile } from './route-auth-express'
import { evaluateRoute } from './route-auth-matrix'
import { isRoute } from './route-auth-matrix.types'

const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/express-minimal')
const NEXT = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/nextjs-minimal')
const files = (entries: Record<string, string>): ReadonlyMap<string, string> => new Map(Object.entries(entries))
const key = (r: Route): string => `${r.method} ${r.path} ${r.file}:${r.line}${r.unresolved === undefined ? '' : ' [unresolved]'}`

describe('parseExpressFile (Express 4.x API reference: app.METHOD, app.use, express.Router, app.route)', () => {
  // Sintaxe TS provada por texto inline (G2: fixture em .mjs nao pode ser .ts)
  it('reads app and router declarations, including TypeScript annotations and express.Router()', () => {
    const p = parseExpressFile("import express from 'express'\nconst app: express.Application = express()\nconst r = express.Router()\nconst s: Router = Router()", 'src/app.ts')
    expect(p.apps).toEqual(['app'])
    expect(p.routers).toEqual(['r', 's'])
  })
  it('reads verb routes with literal path, route-level middlewares, line, and expands all into seven', () => {
    const p = parseExpressFile("const app = express()\napp.get('/x', requireAuth, (req, res) => res.end())\napp.all('/y', h)", 'src/app.ts')
    expect(p.routes[0]).toMatchObject({ owner: 'app', method: 'GET', path: '/x', middlewares: ['requireAuth'], line: 2 })
    expect(p.routes.filter((r) => r.path === '/y').map((r) => r.method).sort()).toEqual(['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'])
  })
  it('reads app.use with and without path, and names middlewares by identifier, dotted access or factory call', () => {
    const p = parseExpressFile("const app = express()\napp.use(cors())\napp.use('/api', auth.requireUser)\napp.use(requireRole('admin'), logger)", 'src/app.ts')
    expect(p.uses.map((u) => ({ path: u.path, names: u.names, line: u.line }))).toEqual([
      { path: null, names: ['cors'], line: 2 }, { path: '/api', names: ['requireUser'], line: 3 }, { path: null, names: ['requireRole', 'logger'], line: 4 },
    ])
  })
  it('records default imports and require() of relative modules only', () => {
    const p = parseExpressFile("import express from 'express'\nimport adminRouter from './routes/admin.mjs'\nconst users = require('./routes/users')", 'src/app.mjs')
    expect([...p.imports.entries()]).toEqual([['adminRouter', './routes/admin.mjs'], ['users', './routes/users']])
  })
  it('reads app.route(path).get(h).post(h) as two routes on the same line', () => {
    const p = parseExpressFile("const app = express()\napp.route('/books').get(list).post(requireAuth, create)", 'src/app.ts')
    expect(p.routes.map((r) => `${r.method} ${r.path} ${r.middlewares.join(',')}`)).toEqual(['GET /books ', 'POST /books requireAuth'])
  })
  // 2026-09-06 (Luiz/dev): PRD CA-05 / AB-2 — rota montada via variavel NUNCA vira path inventado.
  it('CA-05: marks non-literal paths (template with ${}, variable, concatenation, array) as unresolved with the source text', () => {
    const p = parseExpressFile("const app = express()\napp.get(`${base}/x`, h)\napp.get(prefix, h)\napp.get('/a' + v, h)\napp.get(['/b', '/c'], h)", 'src/app.mjs')
    expect(p.routes.every((r) => r.unresolved !== undefined)).toBe(true)
    expect(p.routes[0]?.path).toBe('/${base}/x')
    expect(p.routes[0]?.unresolved).toContain('template literal')
    expect(p.routes[1]?.path).toBe('/prefix')
    expect(p.routes[3]?.unresolved).toContain('array')
  })
  // G12: Express 4 (path-to-regexp v0.1) e 5 (v8) divergem em `*`, grupos e modificadores — nao traduzir.
  it('marks wildcard, regex group, modifier and RegExp paths as unresolved (Express 4 vs 5 differ)', () => {
    const p = parseExpressFile("const app = express()\napp.get('/files/*', h)\napp.get('/u/:id(\\\\d+)', h)\napp.get('/a?b', h)\napp.get(/^\\/re/, h)", 'src/app.ts')
    expect(p.routes.map((r) => r.unresolved)).toEqual([
      expect.stringContaining('Express 4/5'), expect.stringContaining('Express 4/5'), expect.stringContaining('Express 4/5'), expect.stringContaining('RegExp'),
    ])
  })
})

describe('analyzeExpress — ordem da cadeia (app.use antes/depois, por linha)', () => {
  // 2026-09-06 (Luiz/dev): teste de abuso — use DEPOIS da rota nao cobre. Escrito antes da defesa.
  it('covers a route only when app.use(auth) comes BEFORE it in the same file', () => {
    const src = "const app = express()\napp.get('/before', h)\napp.use(requireAuth)\napp.get('/after', h)"
    const { routes, coverage } = analyzeExpress(files({ 'src/app.ts': src }))
    const verdict = (path: string): Verdict => evaluateRoute(routes.find((r) => r.path === path)!, coverage).verdict
    expect(verdict('/after')).toBe('coberta')
    expect(verdict('/before')).toBe('DESCOBERTA')
    expect(coverage.notes).toContain('app.use(requireAuth) em src/app.ts:3 vem DEPOIS de GET /before (src/app.ts:2) — nao cobre')
    expect(coverage.rules.every((r) => r.kind === 'handler-chain')).toBe(true)   // DP-5a: nenhum path-pattern
  })
  it('scopes app.use(prefix, auth) to later routes under the prefix', () => {
    const src = "const app = express()\napp.use('/admin', requireAdmin)\napp.get('/admin/users', h)\napp.get('/public', h)"
    const { routes, coverage } = analyzeExpress(files({ 'src/app.ts': src }))
    expect(evaluateRoute(routes.find((r) => r.path === '/admin/users')!, coverage).verdict).toBe('coberta')
    expect(evaluateRoute(routes.find((r) => r.path === '/public')!, coverage).verdict).toBe('DESCOBERTA')
  })
  it('covers router routes by router.use before them, or by app.use before the mount — never by app.use after the mount', () => {
    const app = "import r from './r'\nconst app = express()\napp.use('/a', r)\napp.use(requireAuth)\nimport s from './s'\napp.use('/b', s)"
    const r = "const router = Router()\nrouter.get('/x', h)\nrouter.use(requireAuth)\nrouter.get('/y', h)\nexport default router"
    const s = "const router = Router()\nrouter.get('/z', h)\nexport default router"
    const { routes, coverage } = analyzeExpress(files({ 'src/app.ts': app, 'src/r.ts': r, 'src/s.ts': s }))
    const verdict = (path: string): Verdict => evaluateRoute(routes.find((r) => r.path === path)!, coverage).verdict
    expect(verdict('/a/x')).toBe('DESCOBERTA')      // montado ANTES do app.use(auth); router.use vem depois de /x
    expect(verdict('/a/y')).toBe('coberta')         // router.use antes de /y
    expect(verdict('/b/z')).toBe('coberta')         // app.use(auth) antes da montagem de s
    const rule = coverage.rules.find((c) => c.kind === 'handler-chain' && c.handler === 'src/s.ts:2')
    expect(rule?.kind === 'handler-chain' ? rule.via : '').toContain('antes da montagem do router (src/app.ts:6)')
  })
})

describe('analyzeExpress — montagem de router importado (um nivel)', () => {
  it('prefixes routes of an imported router (default import or require) with the mount path; nested mounts are unresolved', () => {
    const app = "import admin from './routes/admin'\nconst users = require('./routes/users.mjs')\nconst app = express()\napp.use('/admin', admin)\napp.use('/users', users)"
    const admin = "const router = Router()\nrouter.get('/', h)\nrouter.get('/list', h)\nimport nested from './nested'\nrouter.use('/deep', nested)\nexport default router"
    const users = "const router = Router()\nrouter.get('/:id', h)\nmodule.exports = router"
    const nested = "const router = Router()\nrouter.get('/leaf', h)\nexport default router"
    const { routes } = analyzeExpress(files({ 'src/app.ts': app, 'src/routes/admin/index.ts': admin, 'src/routes/users.mjs': users, 'src/routes/admin/nested.ts': nested }))
    expect(routes.filter((r) => r.unresolved === undefined).map(key).sort()).toEqual(['GET /admin src/routes/admin/index.ts:2', 'GET /admin/list src/routes/admin/index.ts:3', 'GET /users/:id src/routes/users.mjs:2'])
    expect(routes.find((r) => r.file === 'src/routes/admin/nested.ts')?.unresolved).toContain('aninhad')
  })
  it('marks routes of a router that no app mounts as unresolved (prefix unknown), and reports zero routes without express()', () => {
    const { routes, notes } = analyzeExpress(files({ 'src/orphan.ts': "const router = Router()\nrouter.get('/x', h)\nexport default router" }))
    expect(routes[0]?.unresolved).toContain('nao montado')
    expect(analyzeExpress(files({ 'src/lib.ts': 'export const x = 1' })).routes).toEqual([])
    expect(notes.some((n) => n.includes('express()'))).toBe(true)
  })
})

describe('expressAdapter (fixture express-minimal)', () => {
  it('CA-08 (Express): enumerates the six routes of the fixture with file:line handlers', () => {
    const routes = expressAdapter.enumerate(FIXTURE)
    expect(routes.every(isRoute)).toBe(true)
    expect(routes.map(key).sort()).toEqual([
      'DELETE /admin/users/:id src/routes/admin.mjs:7', 'GET /${base}/reports src/app.mjs:16 [unresolved]', 'GET /admin/users src/routes/admin.mjs:6',
      'GET /api/preferences src/app.mjs:12', 'GET /health src/app.mjs:8', 'POST /api/preferences src/app.mjs:13',
    ])
    expect(routes.find((r) => r.path === '/health')?.handler).toBe('src/app.mjs:8')
  })
  it('CA-05 + Premissa 3: health is DESCOBERTA, preferences and admin are coberta, the template route is indeterminada, and the rate is under the cut', () => {
    const routes = expressAdapter.enumerate(FIXTURE)
    const cov = expressAdapter.readCoverage(FIXTURE)
    const verdicts = routes.map((r) => ({ path: r.path, method: r.method, verdict: evaluateRoute(r, cov).verdict }))
    expect(verdicts.find((v) => v.path === '/health')?.verdict).toBe('DESCOBERTA')
    expect(verdicts.find((v) => v.path === '/${base}/reports')?.verdict).toBe('indeterminada')
    expect(verdicts.filter((v) => v.path.startsWith('/api') || v.path.startsWith('/admin')).every((v) => v.verdict === 'coberta')).toBe(true)
    expect(verdicts.filter((v) => v.verdict === 'indeterminada').length / verdicts.length).toBeLessThanOrEqual(0.25)
    expect(cov.notes).toContain('middlewares contados como auth: requireAuth, requireAdmin')
    expect(hasExpress(FIXTURE)).toBe(true)
    expect(hasExpress(NEXT)).toBe(false)
  })
})
```

### Passo 3: `route-auth-express.ts` — parser por arquivo (puro)

```ts
// route-auth-express.ts
// 2026-09-06 (Luiz/dev): adaptador Express — PRD tabela "Rota vem de app.<verb>/router.<verb>;
// cobertura de app.use/router.use antes da rota na cadeia" (RF-01, D1, Premissa 3, CA-05).
// Regex/linha, parser proprio (DI-fase04-parser do Plano 01; GT-fase04-1: o AST nao resolve do cache).
// Fontes: Express 4.x API reference (app.METHOD, app.use, express.Router, app.route, app.all);
// Express 5 migration guide §"Path syntax changes" (G12).
import { QUOTES, lineOf, readBalanced, splitTopLevel } from './route-auth-heuristics'
import { authNameNotes, isAuthName, splitByAuthName } from './route-auth-heuristics'

const VERBS = new Set(['get', 'post', 'put', 'patch', 'delete', 'all'])
const ALL_METHODS: readonly HttpMethod[] = HTTP_METHODS   // `all` = 7 (Express 4 API: "all HTTP request methods")

// Exemplos que casam / que NAO casam:
const APP_DECL_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[A-Za-z_$][\w$.<>]*)?\s*=\s*express\(\)/g
//   casa: `const app = express()`, `const app: express.Application = express()` | nao casa: `const app = createApp()`
const ROUTER_DECL_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[A-Za-z_$][\w$.<>]*)?\s*=\s*(?:express\.)?Router\(\)/g
//   casa: `const r = express.Router()`, `const s: Router = Router()` | nao casa: `const r = new Router()` (fora do subset)
const IMPORT_DEFAULT_RE = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])(\.{1,2}\/[^'"]+)\2/gm
const REQUIRE_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(['"])(\.{1,2}\/[^'"]+)\2\s*\)/g
//   so caminhos RELATIVOS: `import x from 'express'` nao entra no mapa
const CALL_RE = /\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete|all|use|route)\s*\(/g
//   depois do match, `readBalanced(source, indiceDo'(', '(', ')')` le os argumentos; `splitTopLevel` separa
const CHAIN_RE = /^\s*\.(get|post|put|patch|delete|all)\s*\(/          // continuacao de app.route(...)
const LITERAL_RE = /^(['"])([^'"]*)\1$/
const TEMPLATE_RE = /^`([^`$]*)`$/                                      // template SEM ${} e literal
const NAME_RE = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?:\(|$)/  // identificador, dotted, ou chamada de fabrica
const OUT_OF_SUBSET_PATH_RE = /[*()?+]/                                  // G12

export type RouteCall = { owner: string; method: HttpMethod; path: string; middlewares: string[]; inlineMiddlewares: number; line: number; unresolved?: string }
export type UseCall = { owner: string; path: string | null; names: string[]; inline: number; line: number }
export type ExpressFile = { file: string; apps: string[]; routers: string[]; imports: Map<string, string>; routes: RouteCall[]; uses: UseCall[]; notes: string[] }

/** Puro. `file` POSIX relativo a raiz — vira `Route.file` e o `handler` `file:line`. */
export function parseExpressFile(source: string, file: string): ExpressFile
// Passos: apps/routers/imports por regex global; depois CALL_RE em loop: owner precisa estar em apps ∪ routers
// (senao ignora — `res.get(...)`, `axios.get(...)`); args = splitTopLevel(readBalanced(...).body);
//   verbo: first = args[0] trim → LITERAL_RE/TEMPLATE_RE → path (OUT_OF_SUBSET_PATH_RE → unresolved 'sintaxe de path
//     fora do subset comum Express 4/5: <path>'); RegExp literal (/^\/.*\/[gimsuy]*$/) → unresolved 'path RegExp';
//     `[` → unresolved 'array de paths fora do subset'; template com ${} → unresolved 'path nao literal: template literal com ${}';
//     senao → unresolved 'path nao literal: <expr>'. path da rota unresolved = expr comecando com '/' ? expr : '/' + expr.
//     middlewares = args.slice(1, -1) → NAME_RE → ultimo segmento do dotted (`auth.requireUser` → `requireUser`);
//     arg sem nome (arrow inline) → inlineMiddlewares += 1. `all` → 7 RouteCall (um por metodo).
//   use: args[0] literal → path; senao path null e o arg conta como middleware. Cada nome → names; sem nome → inline += 1.
//   route: path literal (mesma regra); em seguida consumir CHAIN_RE repetidamente a partir do fim do `)`; cada elo vira
//     RouteCall na MESMA linha do `route(`; elo fora do subset → unresolved 'app.route() encadeado fora do subset'.
```

### Passo 4: `analyzeExpress` — montagem, ordem e cobertura (puro sobre `Map<file, source>`)

```ts
export type ExpressAnalysis = { routes: Route[]; coverage: CoverageMap; notes: string[] }

/** Resolucao de UM nivel (G13): `./routes/admin` → `.ts/.js/.mjs/.cjs`, `index.*`; `./routes/admin.mjs` direto. */
function resolveImport(fromFile: string, spec: string, known: ReadonlySet<string>): string | null

export function analyzeExpress(sources: ReadonlyMap<string, string>): ExpressAnalysis {
  const parsed = new Map([...sources].map(([file, src]) => [file, parseExpressFile(src, file)]))
  // 1. apps: arquivos com apps.length > 0. Nenhum → notes ['nenhum express() encontrado nos diretorios escaneados'] e routes []
  // 2. rotas do app: RouteCall do owner ∈ apps → Route { method, path, file, line, stack: 'node-ts', handler: `${file}:${line}` }
  // 3. montagens: UseCall com names[0] ∈ routers do mesmo arquivo OU ∈ imports → { mountPath, mountLine, routerFile }
  //    rotas do router: prefixadas por joinPaths(mountPath, path); handler `${routerFile}:${line}`
  //    router que monta outro router (use com router/import) → rotas do segundo: unresolved 'montagem aninhada de router (2 niveis) fora do subset'
  //    router em arquivo nunca montado → rotas unresolved 'router `<var>` em <file> nao montado por app.use() em arquivo escaneado — prefixo desconhecido'
  // 4. cobertura (DP-5a — so handler-chain, nunca path-pattern):
  //    para cada rota resolvida, na ordem: (a) middleware de rota com isAuthName → via `middleware de rota <name>`;
  //    (b) rota de app: UseCall do mesmo owner/arquivo com line < route.line, (path null || route.path startsWith path), algum name com isAuthName
  //        → via `app.use(<name>) em <file>:<line>, antes da rota`;
  //    (c) rota de router: router.use no arquivo do router com line < route.line → via `router.use(<name>) em <rfile>:<line>`;
  //        senao app.use(auth) no arquivo do app com line < mountLine (path null || mountPath startsWith path)
  //        → via `app.use(<name>) em <file>:<line>, antes da montagem do router (<file>:<mountLine>)`.
  //    Um `handler-chain` por rota: { handler: route.handler, file: route.file, line: route.line, via }.
  //    (d) sem cobertura: se existe use(auth) do mesmo owner com line > route.line → nota
  //        `app.use(<name>) em <file>:<line> vem DEPOIS de <METHOD> <path> (<file>:<rline>) — nao cobre` (RF-05: diz o que faltou)
  //    inline (sem nome) em use → nota `<file>:<line>: app.use com middleware inline (nao nomeado) — fora do subset, nao conta`
  // 5. notes += authNameNotes('middlewares', splitByAuthName(<todos os nomes vistos em use e em rotas>))
  // 6. sources = arquivos com apps ou routers (ordenados); routes ordenadas por path e metodo
}

function joinPaths(prefix: string, path: string): string   // '/admin' + '/' → '/admin'; '' + '/x' → '/x'; sem '//'; barra final removida (exceto '/')
```

### Passo 5: Disco, `hasExpress` e o adaptador

```ts
const SCAN_DIRS = ['src', 'app', 'routes', 'lib'] as const        // recursivo
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'tests', 'test', 'coverage', '.git'])
const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/
const SKIP_FILE_RE = /\.(test|spec)\.|\.d\.ts$/

/** Raiz: so o primeiro nivel; SCAN_DIRS: recursivo. Tudo POSIX relativo a targetDir. */
function collectSources(targetDir: string): Map<string, string>

/** DP-12: `express` em dependencies ou devDependencies do package.json da RAIZ. Sem package.json → false. */
export function hasExpress(targetDir: string): boolean {
  // readFileSync + JSON.parse com isRecord (type guard) — sem `as`; qualquer erro → false
}

export function enumerateExpressRoutes(targetDir: string): ExpressAnalysis { return analyzeExpress(collectSources(targetDir)) }
export function readExpressCoverage(targetDir: string): CoverageMap { return enumerateExpressRoutes(targetDir).coverage }

export const expressAdapter: RouteAdapter = {
  stack: 'node-ts',
  enumerate: (targetDir) => enumerateExpressRoutes(targetDir).routes,
  readCoverage: readExpressCoverage,
  // DP-9: sem G2 nesta versao. Nota: no Express o arquivo de rota E o de cobertura — mover um
  // `app.use(auth)` para baixo toca o arquivo da rota, entao o G1 ja reavalia as rotas dele.
}
```

`CoverageMap.stack` = `'node-ts'` (o `StackId` que `detectStack` devolve; o adaptador se chama
Express porque so ele e implementado — DP-12).

### Passo 6: Manifest

`bun run generate:manifest` — `route-auth-express.ts` e lib nova rastreada (G3).

---

## Gotchas

- **G2 do plano:** a fixture e `.mjs`; a sintaxe TS e provada por texto inline no primeiro teste. Nao
  criar `src/app.ts` na fixture (bloqueado pelo gate E quebra o `tsc` por `express` ausente).
- **G12 do plano:** `*`, `(`, `?`, `+` no path → `unresolved`. `:id` e `:id?`? O `?` cai no
  `OUT_OF_SUBSET_PATH_RE` → `unresolved` (Express 5 removeu o modificador; Express 4 aceita). Nao
  tentar adivinhar a major.
- **G13 do plano:** ordem por `line`. `app.use(auth)` dentro de `if (process.env.X)` nao e detectado
  como condicional (regex nao ve blocos) — conta como `use` normal. Limite conhecido, registrado em
  nota generica `ordem de app.use resolvida por linha; use condicional (dentro de if/funcao) nao e
  detectado` em `notes`. Nao inventar deteccao de bloco sem teste.
- **G18 do plano:** `handler` = `file:line` e tambem `file`/`line` da rota — os dois caminhos do matcher
  coincidem. `app.route('/x').get(h).post(h)` produz duas rotas na MESMA linha com o MESMO handler; uma
  `handler-chain` por rota (dedupe por `${method} ${handler}`) — o matcher casa as duas de qualquer jeito.
- **Local — `CALL_RE` casa `res.get('header')` e `axios.get(url)`:** o filtro e `owner ∈ apps ∪ routers`.
  Um router declarado como `export const router = Router()` casa `ROUTER_DECL_RE` (`const` esta la);
  `export default Router()` sem variavel NAO — rotas nesse arquivo ficam sem owner conhecido → nota
  `<file>: Router() sem variavel — fora do subset`.
- **Local — `readBalanced` a partir do `(`:** o `CALL_RE` termina no `(`; passar `match.index + match[0].length - 1`
  como `start`. Argumentos com arrow functions contendo parenteses/strings sao lidos corretamente
  porque `readBalanced` pula strings e conta profundidade (e a mesma funcao do matcher Next).
- **Local — `app.use(express.json())`, `app.use(cors())`:** nome `json`/`cors` → `isAuthName` false →
  ignorados, listados em `middlewares ignorados por nome`. `app.use(passport.authenticate('jwt'))` →
  nome `authenticate` → conta (proxy, G17).
- **Local — import ESM com extensao (`'./routes/admin.mjs'`) e sem (`'./routes/admin'`):** os dois
  resolvem; com extensao, direto; sem, tenta `.ts/.js/.mjs/.cjs` e `index.*` na ordem. Import de
  pacote (`'express'`, `'@scope/x'`) nunca entra no mapa (regex exige `./` ou `../`).
- **Local — `module.exports = router` vs `export default router`:** irrelevante para o adaptador —
  ele nao le exports; identifica o router do arquivo importado como "o primeiro `Router()` declarado
  naquele arquivo". Dois routers no mesmo arquivo importado → o primeiro e o montado; nota
  `<file>: mais de um Router() — so o primeiro e montado; os demais saem unresolved`.
- **Local — Next no mesmo projeto (monorepo, fase-04):** o scanner percorre `app/` e le
  `app/api/admin/route.ts`; `export function GET` nao casa `CALL_RE` (exige `x.get(`), entao nao
  produz rota nem `express()`. Sem apps → `enumerated: 0` + nota. E o `applies`/DP-12 que evita rodar
  isto em projeto Next sem express.
- **Local — `summary.sources`:** os arquivos com `express()`/`Router()`; em projeto grande sao muitos.
  Aceitavel — o relatorio cita; nao truncar.

---

## Verificacao

### TDD

- [ ] **RED 1 (arquivo novo):** `bun test skills/security/lib/route-auth-express.test.ts` → modulo
  ausente (aceito). Apos stub `parseExpressFile = () => ({ file, apps: [], routers: [], imports: new Map(), routes: [], uses: [], notes: [] })`:
  `-t 'reads app and router declarations'` → `Expected: ["app"], Received: []`
- [ ] **RED 2 (abuso — ordem):** `-t 'covers a route only when app.use'` → com `analyzeExpress` ingenuo
  (todo `use(auth)` cobre tudo): `Expected: "DESCOBERTA", Received: "coberta"` em `/before`
- [ ] **RED 3 (CA-05):** `-t 'CA-05'` → `Expected: true, Received: false` em `every(unresolved)`
- [ ] **GREEN:** `bun test skills/security/lib/route-auth-express.test.ts` → `14 pass, 0 fail`

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `covers a route only when app.use(auth) comes BEFORE it in the same
      file` FALHOU antes da resolucao por linha — `app.use(auth)` depois da rota saindo como cobertura
      e falsa garantia (risco de impacto alto do PRD) e e o motivo da DP-5a
- [ ] **Segundo abuso no RED:** `covers router routes ... never by app.use after the mount` FALHOU
      em `/a/x` (`Received: "coberta"`) antes da comparacao `use.line < mountLine`
- [ ] **CA-05 (AB-2):** Dado um projeto Express que monta rota via variavel, quando o adaptador nao
      consegue resolver o caminho, entao a rota sai `indeterminada` e aparece — nunca `coberta` —
      `bun test skills/security/lib/route-auth-express.test.ts -t 'CA-05'` → 2 pass (parser + fixture)
- [ ] **CA-08 (parcial — Express):** `-t 'CA-08'` → 1 pass; as 6 rotas batem com a tabela do Passo 1
- [ ] **CA-10:** a rota `unresolved` da fixture, passando pelo motor, e `indeterminada` (o finding
      `medium` e emitido por `auditRouteCoverage` — provado de ponta a ponta na fase-05)
- [ ] **Premissa 3 medida:** `1 / 6 = 0.17` registrado no MEMORY (tabela); < 0.25 → Express entra no
      registro na fase-04 (a decisao formal e da fase-05)
- [ ] **Nenhum `path-pattern` emitido pelo Express** (DP-5a): assercao `every(kind === 'handler-chain')` verde
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A fase nao altera auth de projeto real
- [ ] **Nenhum secret literal:** `grep -rniE "SECRET\s*=|API_KEY\s*=|Bearer [A-Za-z0-9]" tests/fixtures/route-auth-matrix/express-minimal skills/security/lib/route-auth-express.ts` → vazio (G19)

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) inverter a comparacao de linha
      em (b) (`use.line > route.line`) → `covers a route only when app.use(auth) comes BEFORE`
      FALHA (`/before` coberta, `/after` DESCOBERTA); restaurar. (2) Em (c), trocar `use.line < mountLine`
      por `true` → `never by app.use after the mount` FALHA em `/a/x`; restaurar. (3) Trocar
      `unresolved` por path literal no ramo de template (`path = expr`) → `CA-05` FALHA e o teste da
      fixture FALHA em `/${base}/reports` (`Received: "DESCOBERTA"` ou `"coberta"`); restaurar.
      (4) Fazer `isAuthName` devolver `true` para tudo → `middlewares contados como auth` FALHA
      (lista inclui `json`/`cors` nos inline tests); restaurar. (5) Remover o filtro
      `route.path.startsWith(use.path)` → `scopes app.use(prefix, auth)` FALHA em `/public`; restaurar.
- [ ] `grep -n "switch" skills/security/lib/route-auth-express.ts` → vazio
- [ ] `grep -nE "\bas [A-Z]" skills/security/lib/route-auth-express.ts` → vazio
- [ ] `grep -n "path-pattern" skills/security/lib/route-auth-express.ts` → vazio (DP-5a)
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G3)
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G25)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G15)
- [ ] GT-fase02-1: arquivo de teste novo — RED de compilacao aceito e registrado como tal
- [ ] **Nenhum `.ts` novo em `tests/fixtures/`** (G1): `git status --porcelain tests/fixtures | grep '\.ts$'` → vazio
- [ ] Taxa de indeterminada Express registrada no MEMORY
- [ ] MEMORY.md: DI/BUG/GT desta fase; Metricas (2/5); contagens reais se diferirem

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-express.test.ts` retorna `14 pass, 0 fail`
- `bun test skills/security/lib/route-auth-express.test.ts -t 'CA-05|CA-08|BEFORE|after the mount'` retorna `0 fail`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning

**Por humano:**
- Num projeto Express real, `expressAdapter.enumerate(<projeto>)` num REPL do Bun lista as rotas de
  `src/app.*` e dos routers montados com `file:line`; toda rota que o humano sabe existir e nao esta
  na lista aparece em `unresolved` com razao (nunca some em silencio) — **pendente de projeto Express
  disponivel**; registrar como divida se nao houver

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
