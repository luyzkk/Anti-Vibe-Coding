<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Adaptador Rails (+ Passo 0: contrato aditivo, heuristica de nome e G13)

**Plano:** 04 — Os outros tres adaptadores + multi-stack
**Sizing:** 2h (Passo 0 ~45min como commit proprio; adaptador ~1h15)
**Depende de:** Nenhuma (primeira fase do plano; Plano 01 contrato + Plano 02 allowlist prontos na branch)
**Visual:** false

---

## O que esta fase entrega

O contrato ganha, aditivamente, o que os tres adaptadores precisam — `Route.unresolved?` com
curto-circuito para `indeterminada` (DP-2), a variante `handler-chain` e o escopo `opaque.handler?`
no `RULE_MATCHERS` (DP-1/DP-1a), a heuristica de nome de auth compartilhada (DP-3) e a promocao de
candidatas amplas da allowlist contra a enumeracao (DP-7, G13 resolvido) — e o primeiro adaptador
que usa tudo isso: `railsAdapter` le `config/routes.rb` (subset da DSL) e `app/controllers/**/*.rb`
(`before_action` com heranca de `ApplicationController`, `only:`/`except:`, `skip_before_action`,
redeclaracao que substitui) e emite uma `handler-chain` por handler coberto; o que nao resolve vira
`unresolved` ou `opaque` escopado — nunca `coberta`.

**DP aplicadas:** DP-1 (+1a, +1b), DP-2, DP-3 (+3a), DP-4, DP-7, DP-10 (fixture `rails-minimal`).
Premissa 2 do PRD (heranca de `ApplicationController` e o padrao dominante) e provada pela fixture.

---

## Arquivos Afetados

Dois commits numa fase (README, "Politica de fases"): **commit A** = Passo 0 (`refactor(security): ...`),
**commit B** = adaptador Rails (`feat(security): ...`). Cada commit regenera o manifest.

| Arquivo | Acao | Commit | Descricao |
|---------|------|--------|-----------|
| `skills/security/lib/route-auth-matrix.types.test.ts` | Modify (PRIMEIRO) | A | `isRoute` aceita `unresolved` string nao-vazia; rejeita vazia (2 testes, RED por assertion) |
| `skills/security/lib/route-auth-matrix.types.ts` | Modify (ADITIVO) | A | `Route.unresolved?`; `CoverageRule` + `handler-chain`; `opaque.handler?`; `AllowlistFinding.reason?` |
| `skills/security/lib/route-auth-matrix.test.ts` | Modify | A | `handler-chain` no motor (3), `unresolved` (2), `opaque` escopado (2), evidence por stack (1) — RED por assertion (literais inline, sem import novo) |
| `skills/security/lib/route-auth-matrix.ts` | Modify | A | `RULE_MATCHERS['handler-chain']`, `opaque` escopado, curto-circuito `unresolved`, `EVIDENCE_BY_KIND`, `NO_RULE_EVIDENCE`/`MISSING_BY_STACK`, promocao antes de `matchAllowlist` |
| `skills/security/lib/public-routes-allowlist.test.ts` | Modify | A | candidata guarda `reason` (1); `promoteWideCandidates` (3) — import novo em passo separado (G6) |
| `skills/security/lib/public-routes-allowlist.ts` | Modify | A | `wideFinding` com `reason?`; `promoteWideCandidates` |
| `skills/security/lib/route-auth-heuristics.test.ts` | Create (PRIMEIRO) | A | `isAuthName` (3), `splitByAuthName` (1), `lineOf`/`readBalanced`/`splitTopLevel` (3) |
| `skills/security/lib/route-auth-heuristics.ts` | Create | A | `AUTH_NAME_RE`, `isAuthName`, `splitByAuthName`, `authNameNotes`; utilitarios de texto MOVIDOS do Next (DP-3a) |
| `skills/security/lib/route-auth-nextjs.ts` | Modify | A | importa `lineOf`/`readBalanced`/`splitTopLevel`/`QUOTES` de `./route-auth-heuristics`; apaga as copias privadas; ZERO mudanca de comportamento (40 testes) |
| `skills/security/lib/route-auth-rails.test.ts` | Create (PRIMEIRO) | B | 14 testes: `parseRailsRoutes` (7), `parseRailsController` (4), `readRailsCoverage`/fixture (3) |
| `skills/security/lib/route-auth-rails.ts` | Create | B | `parseRailsRoutes`, `enumerateRailsRoutes`, `parseRailsController`, `resolveFilterChain`, `readRailsCoverage`, `railsAdapter` |
| `tests/fixtures/route-auth-matrix/rails-minimal/**` (8 arquivos: `Gemfile`, `config/routes.rb`, 4 controllers, `anti-vibe.public-routes.json`, `app/controllers/.keep` opcional) | Create | B | dados — passam pelo gate (G1) |
| `plugin-manifest.json` | Regenerate | A e B | `bun run generate:manifest` (G3) |

> Excecao declarada (>5 arquivos): ver README "Politica de fases". O Passo 0 e pre-requisito dos tres
> adaptadores e vive aqui porque Rails e o primeiro a produzir `/posts/:id` (o caso do G13). Corte
> natural se estourar 2h: entre o commit A e o commit B.

---

## Implementacao

### Passo 0.1: Tipos — ADITIVO em `route-auth-matrix.types.ts` (teste do `isRoute` primeiro)

```ts
// route-auth-matrix.types.test.ts — acrescentar (RED por assertion: isRoute hoje ignora a chave)
it('accepts a route flagged as unresolved with a non-empty reason', () => {
  expect(isRoute({ method: 'GET', path: '/${base}/x', file: 'src/app.mjs', line: 15, stack: 'node-ts', unresolved: 'path nao literal' })).toBe(true)
})
it('rejects an unresolved flag that is empty or not a string', () => {
  expect(isRoute({ method: 'GET', path: '/x', file: 'f', line: 1, stack: 'rails', unresolved: '' })).toBe(false)
  expect(isRoute({ method: 'GET', path: '/x', file: 'f', line: 1, stack: 'rails', unresolved: 42 })).toBe(false)
})
```

```ts
// route-auth-matrix.types.ts
export type Route = {
  // ...campos existentes, `handler?` inclusive...
  /**
   * 2026-09-06 (Luiz/dev): Plano 04 DP-2 — PRD RF-09/CA-05. Declaracao que o adaptador ENXERGA mas
   * nao consegue resolver estaticamente (path nao literal, `match` sem `via:`, `mount`, `re_path`...).
   * `path` e o texto-fonte da expressao (prefixado com `/`); o motor curto-circuita para
   * `indeterminada` antes de allowlist e matcher. Nunca inventar path, nunca `coberta`.
   */
  unresolved?: string
}

export type CoverageRule =
  | { kind: 'path-pattern'; pattern: string; file: string; line: number }
  | {
      kind: 'opaque'
      reason: string
      file: string
      line: number
      // 2026-09-06 (Luiz/dev): DP-1a — escopo do opaco. Sem isto, um `before_action ... if:` num
      // controller tornaria TODAS as rotas do projeto indeterminada. Next omite (opaco global, como hoje).
      handler?: string
    }
  | {
      // 2026-09-06 (Luiz/dev): DP-1 — a UNICA variante nova. "O adaptador demonstrou que auth esta
      // presa a ESTE handler" — before_action efetivo, Depends resolvido, middleware anterior na cadeia.
      // O motor casa por `handler` OU por `file:line`; nao sabe o que e Rails, Express ou FastAPI.
      kind: 'handler-chain'
      handler: string
      file: string
      line: number
      /** Prosa curta do que cobriu: `before_action :authenticate_user! (herdado de ApplicationController)`. */
      via: string
    }

/** DP-7: candidata ampla guarda a `reason` para poder ser promovida a entrada literal. */
export type AllowlistFinding = { path: string; file: string; line: number; severity: IssueSeverity; description: string; reason?: string }

// isRoute — acrescentar antes do return:
const { unresolved } = value
if (unresolved !== undefined && (typeof unresolved !== 'string' || unresolved.length === 0)) return false
```

### Passo 0.2: Motor — `handler-chain`, opaco escopado, curto-circuito, evidence por stack (testes primeiro)

Todos os testes abaixo usam literais inline de `CoverageRule`/`Route` — nenhum import novo, RED por
assertion (G6). O literal `{ kind: 'handler-chain', ... }` da erro de TIPO na janela RED (G25), nao de
runtime: o Bun executa e a assercao falha.

```ts
// route-auth-matrix.test.ts
describe('evaluateRoute — handler-chain (Plano 04 DP-1)', () => {
  const chain = (handler: string): CoverageMap => ({
    stack: 'rails',
    rules: [{ kind: 'handler-chain', handler, file: 'app/controllers/application_controller.rb', line: 2, via: 'before_action :authenticate_user! (herdado de ApplicationController)' }],
    sources: ['config/routes.rb', 'app/controllers/application_controller.rb'],
    notes: [],
  })
  const rails = (over: Partial<Route>): Route => route({ stack: 'rails', file: 'config/routes.rb', ...over })

  it('yields coberta when the rule names the same handler as the route', () => {
    const v = evaluateRoute(rails({ path: '/admin/users', handler: 'Admin::UsersController#index' }), chain('Admin::UsersController#index'))
    expect(v.verdict).toBe('coberta')
    expect(v.evidence).toContain('application_controller.rb:2')
    expect(v.evidence).toContain('herdado de ApplicationController')
  })

  // 2026-09-06 (Luiz/dev): G18 — handler diferente NUNCA cobre; e `no`, nao `unsure`.
  it('never covers a route served by another handler, and yields DESCOBERTA not indeterminada', () => {
    const v = evaluateRoute(rails({ path: '/health', handler: 'HealthController#show' }), chain('Admin::UsersController#index'))
    expect(v.verdict).toBe('DESCOBERTA')
  })

  it('covers by file and line when the route has no handler (Express-style anonymous handler)', () => {
    const cov: CoverageMap = { stack: 'node-ts', rules: [{ kind: 'handler-chain', handler: 'src/app.mjs:11', file: 'src/app.mjs', line: 11, via: 'app.use(requireAuth) em src/app.mjs:9' }], sources: ['src/app.mjs'], notes: [] }
    expect(evaluateRoute(route({ stack: 'node-ts', file: 'src/app.mjs', line: 11, path: '/api/preferences' }), cov).verdict).toBe('coberta')
    expect(evaluateRoute(route({ stack: 'node-ts', file: 'src/app.mjs', line: 7, path: '/health' }), cov).verdict).toBe('DESCOBERTA')
  })
})

describe('evaluateRoute — unresolved (Plano 04 DP-2 / CA-05)', () => {
  it('CA-05: yields indeterminada with the reason for an unresolved route, even when a rule would cover it', () => {
    const r = route({ stack: 'node-ts', path: '/${base}/reports', file: 'src/app.mjs', line: 15, unresolved: 'path nao literal: template literal com ${}' })
    const v = evaluateRoute(r, coverage(['/:path*']))
    expect(v.verdict).toBe('indeterminada')
    expect(v.verdict).not.toBe('coberta')
    expect(v.evidence).toContain('path nao literal')
  })
  it('emits a medium finding for an unresolved route through auditRouteCoverage', () => {
    // via coverageOverride + fixture nextjs-minimal nao da (Next nao produz unresolved): usar evaluateRoute
    // + SEVERITY_BY_VERDICT indireto — o teste de ponta a ponta fica na fase-05 (express-minimal).
    const v = evaluateRoute(route({ path: '/x', unresolved: 'mount dinamico' }), coverage([]))
    expect(v.verdict).toBe('indeterminada')
  })
})

describe('evaluateRoute — opaque escopado (DP-1a)', () => {
  const scoped: CoverageMap = { stack: 'rails', rules: [{ kind: 'opaque', handler: 'HomeController#index', reason: 'controller HomeController nao encontrado em app/controllers/', file: 'config/routes.rb', line: 3 }], sources: ['config/routes.rb'], notes: [] }
  it('makes only the scoped handler indeterminada', () => {
    expect(evaluateRoute(route({ stack: 'rails', path: '/', handler: 'HomeController#index' }), scoped).verdict).toBe('indeterminada')
  })
  it('does not leak the opaque onto routes of other handlers — they stay DESCOBERTA', () => {
    expect(evaluateRoute(route({ stack: 'rails', path: '/posts', handler: 'PostsController#index' }), scoped).verdict).toBe('DESCOBERTA')
  })
})

it('describes what is missing in the dialect of the stack (RF-05), keeping the Next wording intact', () => {
  const v = evaluateRoute(route({ stack: 'rails', path: '/posts', handler: 'PostsController#index', file: 'config/routes.rb' }), { stack: 'rails', rules: [], sources: ['config/routes.rb'], notes: [] })
  expect(v.evidence).not.toContain('config.matcher')
  const issue = toContractIssue({ route: v.route, verdict: 'DESCOBERTA', severity: 'high', missing: v.evidence }, 0)
  expect(issue.description).toContain('before_action')
  expect(issue.description).not.toContain('middleware')
})
```

```ts
// route-auth-matrix.ts
const RULE_MATCHERS: Readonly<Record<string, RuleMatcher>> = {
  'path-pattern': /* inalterado */,
  opaque: (route, rule) => {
    if (rule.kind !== 'opaque') return 'unsure'
    // 2026-09-06 (Luiz/dev): DP-1a — opaco com escopo pesa SO sobre o proprio handler.
    if (rule.handler !== undefined && rule.handler !== route.handler) return 'no'
    return 'unsure'
  },
  'handler-chain': (route, rule) => {
    if (rule.kind !== 'handler-chain') return 'unsure'
    if (route.handler !== undefined && route.handler === rule.handler) return 'covers'
    return route.file === rule.file && route.line === rule.line ? 'covers' : 'no'
  },
}

const EVIDENCE_BY_KIND: Readonly<Record<string, (route: Route, rule: CoverageRule) => string>> = {
  'handler-chain': (route, rule) => (rule.kind === 'handler-chain' ? `${rule.file}:${rule.line} cobre ${route.handler ?? `${route.file}:${route.line}`} via ${rule.via}` : ''),
}
const defaultEvidence = (route: Route, rule: CoverageRule): string => `${rule.file}:${rule.line} casa ${route.path}`

// DP-1b: RF-05 pede "o que faltou" no dialeto da stack. Next mantem o texto atual (52 testes).
const NO_RULE_EVIDENCE: Readonly<Record<string, (sources: string) => string>> = {
  nextjs: (s) => `nenhuma entrada de config.matcher (${s}) casa`,
}
const NO_SOURCES_LABEL: Readonly<Record<string, string>> = { nextjs: 'middleware.ts ausente' }
const MISSING_BY_STACK: Readonly<Record<string, string>> = {
  nextjs: 'sem cobertura de middleware',
  rails: 'sem before_action de auth efetivo',
  'node-ts': 'sem middleware de auth na cadeia antes da rota',
  python: 'sem Depends/decorator/middleware de auth',
}

export function evaluateRoute(route: Route, coverage: CoverageMap): RouteVerdict {
  // 2026-09-06 (Luiz/dev): DP-2 — PRD RF-09/CA-05. Antes de qualquer regra: nao resolvida = indeterminada.
  if (route.unresolved !== undefined) {
    return { route, verdict: 'indeterminada', evidence: `rota nao resolvida estaticamente: ${route.unresolved}` }
  }
  // ...loop: no `covers`, evidence = (EVIDENCE_BY_KIND[rule.kind] ?? defaultEvidence)(route, rule)
  // ...DESCOBERTA: const label = NO_SOURCES_LABEL[route.stack] ?? 'sem fontes de cobertura'
  //    evidence: `${(NO_RULE_EVIDENCE[route.stack] ?? genericNoRule)(sources || label)} ${route.path}`
}

// DESCRIPTION_BY_VERDICT.DESCOBERTA:
(f) => `${MISSING_BY_STACK[f.route.stack] ?? 'sem cobertura de auth'} e nao declarada publica em ${PUBLIC_ROUTES_FILE} — ${f.missing}`
```

Na map de vereditos de `auditRouteCoverage` (ou em `verdictFor`, se o Plano 03 ja existir), a
PRIMEIRA linha e `if (route.unresolved !== undefined) return evaluateRoute(route, coverage)` — a
allowlist nao casa path-fonte, e o curto-circuito precisa vir antes dela por contrato (DP-2).

### Passo 0.3: Heuristica de nome + utilitarios de texto (`route-auth-heuristics.ts`, teste primeiro)

```ts
// route-auth-heuristics.test.ts (arquivo NOVO — RED de compilacao ate a lib existir, aceito)
describe('isAuthName (DP-3 — heuristica declarada como proxy)', () => {
  it('matches the auth vocabulary of the four stacks', () => {
    for (const n of ['authenticate_user!', 'requireAuth', 'require_login', 'login_required', 'get_current_user', 'verify_jwt', 'JWTBearer', 'AuthMiddleware', 'check_auth', 'signed_in?', 'authorize_admin'])
      expect(isAuthName(n)).toBe(true)
  })
  it('does not match cross-cutting names that are not auth', () => {
    for (const n of ['set_locale', 'logRequests', 'cors', 'author_lookup', 'compression', 'set_current_tenant'])
      expect(isAuthName(n)).toBe(false)
  })
  it('is case-insensitive and ignores a trailing bang or question mark', () => {
    expect(isAuthName('AUTHENTICATE!')).toBe(true)
  })
})
it('splitByAuthName partitions names and authNameNotes lists both sides', () => {
  const split = splitByAuthName(['authenticate_user!', 'set_locale'])
  expect(split).toEqual({ auth: ['authenticate_user!'], other: ['set_locale'] })
  expect(authNameNotes('filtros', split)).toEqual([
    'filtros contados como auth: authenticate_user!',
    'filtros ignorados por nome: set_locale',
    'heuristica de nome de auth e proxy: nome que casa e contado sem ler o corpo; nome que nao casa nao conta',
  ])
})
describe('utilitarios de texto (movidos do adaptador Next — DP-3a)', () => {
  it('lineOf counts newlines before the index', () => expect(lineOf('a\nb\nc', 4)).toBe(3))
  it('readBalanced returns the body between matching delimiters, skipping strings', () => {
    expect(readBalanced('f(a, "(", (b))', 1, '(', ')')).toEqual({ body: 'a, "(", (b)', end: 14 })
  })
  it('splitTopLevel splits on top-level commas only', () => {
    expect(splitTopLevel("'/x', [a, b], {c: (d, e)}")).toEqual(["'/x'", ' [a, b]', ' {c: (d, e)}'])
  })
})
```

```ts
// route-auth-heuristics.ts
// 2026-09-06 (Luiz/dev): Plano 04 DP-3 — heuristica de NOME compartilhada pelos adaptadores Rails,
// Express e Python. E proxy, nao prova: conta quem casa sem ler o corpo. Toda saida vai para `notes`.
// Regex da DP-3 + tres alternativas para nome de classe/middleware (AuthMiddleware, auth_guard, check_auth).
export const AUTH_NAME_RE =
  /authenticat|require_?(login|user|auth|admin)|login_required|signed_in|authoriz|current_user|verify_?(token|jwt)|jwt|session_required|protect|^auth$|auth_?(middleware|guard|check|required)|(^|[_-])auth$/i

export function isAuthName(name: string): boolean {
  return AUTH_NAME_RE.test(name.replace(/[!?]$/, ''))
}

export function splitByAuthName(names: string[]): { auth: string[]; other: string[] } {
  const unique = [...new Set(names)]
  return { auth: unique.filter(isAuthName), other: unique.filter((n) => !isAuthName(n)) }
}

const PROXY_NOTE = 'heuristica de nome de auth e proxy: nome que casa e contado sem ler o corpo; nome que nao casa nao conta'

export function authNameNotes(label: string, split: { auth: string[]; other: string[] }): string[] {
  const notes: string[] = []
  if (split.auth.length > 0) notes.push(`${label} contados como auth: ${split.auth.join(', ')}`)
  if (split.other.length > 0) notes.push(`${label} ignorados por nome: ${split.other.join(', ')}`)
  if (notes.length > 0) notes.push(PROXY_NOTE)
  return notes
}

// --- utilitarios de texto: MOVIDOS de route-auth-nextjs.ts sem mudanca (DP-3a) ---
export const QUOTES = new Set(["'", '"', '`'])
export function lineOf(source: string, index: number): number { /* igual */ }
export function readBalanced(source: string, start: number, open: string, close: string): { body: string; end: number } | null { /* igual */ }
export function splitTopLevel(body: string): string[] { /* igual */ }
```

`route-auth-nextjs.ts`: `import { QUOTES, lineOf, readBalanced, splitTopLevel } from './route-auth-heuristics'`
e apagar as quatro definicoes locais. `bun test skills/security/lib/route-auth-nextjs.test.ts` → 40 pass.

### Passo 0.4: G13 — candidata ampla promovida contra a enumeracao (DP-7; teste primeiro)

```ts
// public-routes-allowlist.test.ts
it('keeps the reason on a wide candidate so the engine can promote it', () => {
  const r = parsePublicRoutes(src([{ path: '/posts/:id', reason: 'post publico' }]), FILE)
  expect(r.wide[0]?.reason).toBe('post publico')
  expect(r.wide[0]?.severity).toBe('high')     // parser continua marcando; a decisao e do motor
})

// import novo em passo separado (G6): promoteWideCandidates
describe('promoteWideCandidates (DP-7 — amplitude decidida contra a enumeracao)', () => {
  const routes = [route({ stack: 'rails', path: '/posts/:id', handler: 'PostsController#show' }), route({ stack: 'rails', path: '/posts' })]
  it('promotes a wide candidate that equals an enumerated route path to a literal entry', () => {
    const parsed = parsePublicRoutes(src([{ path: '/posts/:id', reason: 'post publico' }]), FILE)
    const out = promoteWideCandidates(parsed, routes)
    expect(out.entries.map((e) => e.path)).toEqual(['/posts/:id'])
    expect(out.wide).toEqual([])
    expect(out.notes.some((n) => n.includes('promovida'))).toBe(true)
  })
  it('rejects a promoted candidate without reason instead of accepting it (CA-04b still applies)', () => {
    const out = promoteWideCandidates(parsePublicRoutes(src([{ path: '/posts/:id' }]), FILE), routes)
    expect(out.entries).toEqual([])
    expect(out.rejected.map((r) => r.path)).toEqual(['/posts/:id'])
    expect(out.wide).toEqual([])
  })
  it('CA-04: keeps a candidate that matches no enumerated route as a high finding', () => {
    const out = promoteWideCandidates(parsePublicRoutes(src([{ path: '/api/*', reason: 'tudo' }]), FILE), routes)
    expect(out.wide.map((w) => w.severity)).toEqual(['high'])
    expect(out.wide[0]?.description).toContain('nao corresponde a nenhuma rota enumerada')
  })
})
```

```ts
// public-routes-allowlist.ts
function wideFinding(path: string, file: string, line: number, reason: string | undefined): AllowlistFinding {
  return {
    path, file, line, severity: 'high',
    description: `entrada ampla \`${path}\` cobriria mais de uma rota — declare cada rota publica individualmente`,
    ...(reason !== undefined && reason.trim().length > 0 ? { reason: reason.trim() } : {}),   // G4
  }
}
// no loop: wide.push(wideFinding(path, file, line, typeof record.reason === 'string' ? record.reason : undefined))

const REASON_REQUIRED = 'reason ausente ou vazio — toda rota publica precisa de justificativa (PRD RF-02)'  // reusado por REASON_CHECKS

/**
 * 2026-09-06 (Luiz/dev): DP-7 / G13. `:id` e literal no Rails e no Express: `/posts/:id` na allowlist
 * e a declaracao de UMA rota enumerada, nao um curinga. A amplitude e decidida contra a enumeracao —
 * o parser so marca candidatas. Rotas `unresolved` nao contam (path e texto-fonte).
 */
export function promoteWideCandidates<T extends AllowlistParseResult>(parsed: T, routes: Route[]): T {
  const enumerated = new Set(routes.filter((r) => r.unresolved === undefined).map((r) => normalizePath(r.path)))
  const entries = [...parsed.entries]
  const rejected = [...parsed.rejected]
  const wide: AllowlistFinding[] = []
  const notes = [...parsed.notes]
  for (const candidate of parsed.wide) {
    if (!enumerated.has(normalizePath(candidate.path))) {
      wide.push({ ...candidate, description: `entrada ampla \`${candidate.path}\` nao corresponde a nenhuma rota enumerada — declare cada rota publica individualmente` })
      continue
    }
    if (candidate.reason === undefined) { rejected.push({ path: candidate.path, line: candidate.line, reason: REASON_REQUIRED }); continue }
    entries.push({ path: candidate.path, reason: candidate.reason, file: candidate.file, line: candidate.line })
    notes.push(`${candidate.file}:${candidate.line}: entrada ampla ${candidate.path} promovida — declaracao literal de rota enumerada`)
  }
  return { ...parsed, entries, rejected, wide, notes }
}
```

```ts
// route-auth-matrix.ts — auditRouteCoverage: promocao ANTES de matchAllowlist
const routes = adapter.enumerate(targetDir)
// ...
const allowlist = promoteWideCandidates(readPublicRoutes(targetDir), routes)
// summary.allowlist.accepted = allowlist.entries.length (inclui promovidas); wide = allowlist.wide.length (so as que ficaram)
// Se o Plano 03 ja existir: readAllowlistAtBase(read) → { entries: promoteWideCandidates(parsePublicRoutes(...), routes).entries } (G24)
```

Em projeto so-Next nada muda: nenhum `Route.path` do Next contem `:`/`*`/`(`, logo nenhuma candidata e
promovida e `nextjs-allowlist-wide` continua produzindo `ALLOW-001 high` (CA-04 do motor intacto —
rodar `-t 'CA-04'` e ver 3 pass).

**Commit A aqui:** `refactor(security): contrato aditivo handler-chain/unresolved/opaque.handler, heuristica de nome de auth e amplitude decidida contra a enumeracao (Plano 04 fase-01 Passo 0)` + `bun run generate:manifest`.

### Passo 1: Fixture `rails-minimal` (dados — commit B)

`tests/fixtures/route-auth-matrix/rails-minimal/Gemfile`
```ruby
source "https://rubygems.org"
gem "rails", "~> 7.1"
```

`config/routes.rb` (numeracao importa — o golden da fase-05 usa estas linhas)
```ruby
# 2026-09-06 (Luiz/dev): fixture CA-08 Rails — subset da DSL: root sem controller, verbo com to:, resources com only, namespace, match sem via.
Rails.application.routes.draw do
  root to: "home#index"
  get "health", to: "health#show"
  resources :posts, only: [:index, :show]
  namespace :admin do
    resources :users
  end
  match "legacy", to: "legacy#handle"
end
```

`app/controllers/application_controller.rb`
```ruby
class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  before_action :set_locale
end
```

`app/controllers/admin/users_controller.rb` (forma `module Admin; class UsersController`)
```ruby
module Admin
  class UsersController < ApplicationController
    def index; end
    def show; end
    def new; end
    def create; end
    def edit; end
    def update; end
    def destroy; end
  end
end
```

`app/controllers/health_controller.rb`
```ruby
class HealthController < ApplicationController
  skip_before_action :authenticate_user!
  def show; end
end
```

`app/controllers/posts_controller.rb` (G22: redeclaracao SUBSTITUI a herdada — `show` fica sem auth)
```ruby
class PostsController < ApplicationController
  before_action :authenticate_user!, only: [:index]
  def index; end
  def show; end
end
```

`anti-vibe.public-routes.json` (a segunda entrada prova DP-7; nenhum segredo — G19)
```json
{
  "routes": [
    { "path": "/health", "reason": "probe do load balancer - sem sessao por definicao" },
    { "path": "/posts/:id", "reason": "post publico - leitura anonima e produto" }
  ]
}
```

NAO existe `home_controller.rb` (de proposito: `root` → controller ausente → `opaque` escopado) nem
`legacy_controller.rb` (`match` sem `via:` → `unresolved`, nem chega a procurar controller).

**Enumeracao esperada (13 rotas, ordenadas por path e metodo):**

| method | path | handler | file:line | veredito sem allowlist | com allowlist (fase-05) |
|---|---|---|---|---|---|
| GET | `/` | `HomeController#index` | routes.rb:3 | indeterminada (controller ausente) | indeterminada |
| GET | `/admin/users` | `Admin::UsersController#index` | routes.rb:7 | coberta (herdado) | coberta |
| POST | `/admin/users` | `#create` | :7 | coberta | coberta |
| DELETE | `/admin/users/:id` | `#destroy` | :7 | coberta | coberta |
| GET | `/admin/users/:id` | `#show` | :7 | coberta | coberta |
| PATCH | `/admin/users/:id` | `#update` | :7 | coberta | coberta |
| PUT | `/admin/users/:id` | `#update` | :7 | coberta (G10) | coberta |
| GET | `/admin/users/:id/edit` | `#edit` | :7 | coberta | coberta |
| GET | `/admin/users/new` | `#new` | :7 | coberta | coberta |
| GET | `/health` | `HealthController#show` | :4 | DESCOBERTA high (skip) | publica-declarada |
| GET | `/legacy` | `LegacyController#handle` | :9 | indeterminada (`unresolved`: match sem via) | indeterminada |
| GET | `/posts` | `PostsController#index` | :5 | coberta (`only: [:index]`) | coberta |
| GET | `/posts/:id` | `PostsController#show` | :5 | DESCOBERTA high (G22) | publica-declarada (DP-7) |

Taxa Premissa 3: `indeterminada / enumerated = 2 / 13 = 0.15` (< 0.25).

### Passo 2: Testes do adaptador PRIMEIRO (`route-auth-rails.test.ts`)

Fontes citadas nos testes: Rails Guides "Rails Routing from the Outside In" (§2.2 CRUD/verbos/
`resources`, §2.5 singular `resource`, §2.6 namespace/scope, §2.7 nested, §2.10 member/collection,
§3.7 `match ... via:`) e `knowledge/rails/atoms/action-controller-and-routing.md` (`before_action` com
`only:/except:`, `skip_before_action`, anti-pattern `match`, nested max 1 nivel, API-only).

```ts
// route-auth-rails.test.ts (arquivo NOVO — RED de compilacao ate a lib existir, aceito)
const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/rails-minimal')
const R = 'config/routes.rb'
const draw = (body: string): string => `Rails.application.routes.draw do\n${body}\nend`
const key = (r: Route): string => `${r.method} ${r.path} ${r.handler ?? ''}${r.unresolved === undefined ? '' : ' [unresolved]'}`

describe('parseRailsRoutes (subset da DSL — Rails Guides "Routing from the Outside In")', () => {
  it('expands resources into the eight REST routes with PATCH and PUT for update', () => {
    const { routes } = parseRailsRoutes(draw('  resources :users'), R)
    expect(routes.map(key).sort()).toEqual([
      'DELETE /users/:id UsersController#destroy', 'GET /users UsersController#index', 'GET /users/:id UsersController#show',
      'GET /users/:id/edit UsersController#edit', 'GET /users/new UsersController#new', 'PATCH /users/:id UsersController#update',
      'POST /users UsersController#create', 'PUT /users/:id UsersController#update',
    ])
    expect(routes[0]?.line).toBe(2)
  })
  it('honours only: and except: on resources', () => {
    expect(parseRailsRoutes(draw('  resources :posts, only: [:index, :show]'), R).routes.map(key).sort()).toEqual(['GET /posts PostsController#index', 'GET /posts/:id PostsController#show'])
    expect(parseRailsRoutes(draw('  resources :posts, except: [:destroy]'), R).routes).toHaveLength(7)
  })
  it('prefixes path and module inside namespace, and path/module inside scope', () => {
    const ns = parseRailsRoutes(draw('  namespace :admin do\n    resources :users, only: [:index]\n  end'), R).routes
    expect(ns.map(key)).toEqual(['GET /admin/users Admin::UsersController#index'])
    const sc = parseRailsRoutes(draw("  scope path: '/v1', module: 'api' do\n    get 'ping', to: 'status#ping'\n  end"), R).routes
    expect(sc.map(key)).toEqual(['GET /v1/ping Api::StatusController#ping'])
  })
  it('reads verb routes with to: and =>, root, singular resource and one level of nesting', () => {
    const src = draw("  root to: 'home#index'\n  get 'health' => 'health#show'\n  resource :profile, only: [:show]\n  resources :posts, only: [] do\n    resources :comments, only: [:index]\n  end")
    expect(parseRailsRoutes(src, R).routes.map(key).sort()).toEqual([
      'GET / HomeController#index', 'GET /health HealthController#show', 'GET /posts/:post_id/comments CommentsController#index', 'GET /profile ProfilesController#show',
    ])
  })
  it('reads member and collection blocks and inline on:', () => {
    const src = draw("  resources :posts, only: [] do\n    member do\n      post :publish\n    end\n    collection do\n      get :search\n    end\n    get :preview, on: :member\n  end")
    expect(parseRailsRoutes(src, R).routes.map(key).sort()).toEqual(['GET /posts/:id/preview PostsController#preview', 'GET /posts/search PostsController#search', 'POST /posts/:id/publish PostsController#publish'])
  })
  it('expands match with via: into one route per verb and via: :all into seven', () => {
    expect(parseRailsRoutes(draw("  match 'x', to: 'x#y', via: [:get, :post]"), R).routes.map((r) => r.method).sort()).toEqual(['GET', 'POST'])
    expect(parseRailsRoutes(draw("  match 'x', to: 'x#y', via: :all"), R).routes).toHaveLength(7)
  })
  // 2026-09-06 (Luiz/dev): DP-2 / RF-09 — fora do subset vira unresolved, nunca rota inventada.
  it('marks match without via, mount, constraints, unknown scope keys and unknown lines as unresolved', () => {
    const src = draw("  match 'legacy', to: 'legacy#handle'\n  mount Sidekiq::Web => '/sidekiq'\n  scope as: :v2 do\n    get 'a', to: 'a#b'\n  end\n  devise_for :users")
    const { routes } = parseRailsRoutes(src, R)
    expect(routes.every((r) => r.unresolved !== undefined)).toBe(true)
    expect(routes.map((r) => r.unresolved)).toEqual([
      expect.stringContaining('via:'), expect.stringContaining('mount'), expect.stringContaining('scope'), expect.stringContaining('fora do subset'),
    ])
    expect(routes[0]?.path).toBe('/legacy')
    expect(routes[1]?.path.startsWith('/')).toBe(true)
  })
})

describe('parseRailsController + resolveFilterChain (before_action com heranca — atom action-controller-and-routing)', () => {
  const app = parseRailsController('class ApplicationController < ActionController::Base\n  before_action :authenticate_user!\n  before_action :set_locale\nend', 'app/controllers/application_controller.rb')
  it('reads class, parent, module nesting and filters with only/except and their lines', () => {
    const c = parseRailsController("module Admin\n  class UsersController < ApplicationController\n    before_action :require_admin, except: [:index]\n    skip_before_action :set_locale, only: [:show]\n  end\nend", 'app/controllers/admin/users_controller.rb')
    expect(c?.name).toBe('Admin::UsersController')
    expect(c?.parent).toBe('ApplicationController')
    expect(c?.filters).toEqual([
      { kind: 'before', names: ['require_admin'], except: ['index'], conditional: false, line: 3 },
      { kind: 'skip', names: ['set_locale'], only: ['show'], conditional: false, line: 4 },
    ])
  })
  it('inherits ApplicationController filters and stops at ActionController::Base or ::API', () => {
    const child = parseRailsController('class Admin::UsersController < ApplicationController\nend', 'app/controllers/admin/users_controller.rb')
    const chain = resolveFilterChain('Admin::UsersController', toMap([app, child]))
    expect(chain.kind).toBe('resolved')
    if (chain.kind === 'resolved') expect(chain.filters.map((f) => f.name)).toEqual(['authenticate_user!', 'set_locale'])
  })
  // 2026-09-06 (Luiz/dev): teste de abuso (PRD AB-2 lado Rails) — skip no filho tira a cobertura herdada.
  it('drops an inherited filter when the child skips it, and restricts it when the skip has only:', () => {
    const health = parseRailsController('class HealthController < ApplicationController\n  skip_before_action :authenticate_user!\nend', 'app/controllers/health_controller.rb')
    const chain = resolveFilterChain('HealthController', toMap([app, health]))
    if (chain.kind === 'resolved') expect(chain.filters.map((f) => f.name)).toEqual(['set_locale'])
    const posts = parseRailsController('class PostsController < ApplicationController\n  skip_before_action :authenticate_user!, only: [:show]\nend', 'app/controllers/posts_controller.rb')
    const c2 = resolveFilterChain('PostsController', toMap([app, posts]))
    if (c2.kind === 'resolved') {
      expect(appliesTo(c2.filters[0], 'index')).toBe(true)
      expect(appliesTo(c2.filters[0], 'show')).toBe(false)
    }
  })
  it('replaces an inherited filter when the child redeclares it (CallbackChain semantics) and flags if:/unless: as conditional', () => {
    const posts = parseRailsController('class PostsController < ApplicationController\n  before_action :authenticate_user!, only: [:index]\n  before_action :check_auth, if: :api_request?\nend', 'app/controllers/posts_controller.rb')
    const chain = resolveFilterChain('PostsController', toMap([app, posts]))
    if (chain.kind === 'resolved') {
      const auth = chain.filters.find((f) => f.name === 'authenticate_user!')
      expect(auth?.only).toEqual(['index'])                       // G22: substituiu a herdada sem only
      expect(chain.filters.find((f) => f.name === 'check_auth')?.conditional).toBe(true)
    }
    expect(resolveFilterChain('MissingController', toMap([app])).kind).toBe('missing')
  })
})

describe('railsAdapter (fixture rails-minimal)', () => {
  it('CA-08 (Rails): enumerates the thirteen routes of the fixture with handlers and lines', () => {
    const routes = railsAdapter.enumerate(FIXTURE)
    expect(routes).toHaveLength(13)
    expect(routes.every(isRoute)).toBe(true)
    expect(routes.find((r) => r.path === '/admin/users/:id' && r.method === 'PUT')?.handler).toBe('Admin::UsersController#update')
    expect(routes.find((r) => r.path === '/legacy')?.unresolved).toContain('via:')
    expect(routes.find((r) => r.path === '/health')).toMatchObject({ file: 'config/routes.rb', line: 4, stack: 'rails' })
  })
  it('emits one handler-chain per covered handler, a scoped opaque for the missing controller, and name notes', () => {
    const cov = railsAdapter.readCoverage(FIXTURE)
    const chains = cov.rules.filter((r) => r.kind === 'handler-chain')
    expect(chains.map((r) => (r.kind === 'handler-chain' ? r.handler : '')).sort()).toEqual([
      'Admin::UsersController#create', 'Admin::UsersController#destroy', 'Admin::UsersController#edit', 'Admin::UsersController#index',
      'Admin::UsersController#new', 'Admin::UsersController#show', 'Admin::UsersController#update', 'PostsController#index',
    ])
    expect(chains[0]).toMatchObject({ file: 'app/controllers/application_controller.rb', line: 2 })
    expect(cov.rules.find((r) => r.kind === 'opaque')).toMatchObject({ handler: 'HomeController#index', file: 'config/routes.rb', line: 3 })
    expect(cov.notes).toContain('filtros contados como auth: authenticate_user!')
    expect(cov.notes).toContain('filtros ignorados por nome: set_locale')
    expect(cov.sources[0]).toBe('config/routes.rb')
  })
  // Premissa 2 (heranca) + abuso (skip) + G22 (redeclaracao), atravessando o motor real.
  it('Premissa 2: inherited before_action covers admin, skip uncovers health, redeclaration uncovers posts#show', () => {
    const routes = railsAdapter.enumerate(FIXTURE)
    const cov = railsAdapter.readCoverage(FIXTURE)
    const verdictOf = (method: HttpMethod, path: string): Verdict => evaluateRoute(routes.find((r) => r.method === method && r.path === path)!, cov).verdict
    expect(verdictOf('DELETE', '/admin/users/:id')).toBe('coberta')
    expect(verdictOf('GET', '/health')).toBe('DESCOBERTA')
    expect(verdictOf('GET', '/posts')).toBe('coberta')
    expect(verdictOf('GET', '/posts/:id')).toBe('DESCOBERTA')
    expect(verdictOf('GET', '/')).toBe('indeterminada')
    expect(verdictOf('GET', '/legacy')).toBe('indeterminada')
    const all = routes.map((r) => evaluateRoute(r, cov).verdict)
    expect(all.filter((v) => v === 'indeterminada').length / all.length).toBeLessThanOrEqual(0.25)   // Premissa 3, medida
  })
})
```

> O `!` em `routes.find(...)!` e o unico permitido no arquivo de TESTE (fixture conhecida). Em codigo
> de producao, nunca (G5). `toMap` e um helper local do teste: `new Map(cs.map((c) => [c.name, c]))`.

### Passo 3: `route-auth-rails.ts` — enumeracao por linha com pilha de contexto

```ts
// route-auth-rails.ts
// 2026-09-06 (Luiz/dev): adaptador Rails — PRD tabela "Rota vem de config/routes.rb; cobertura de
// before_action incluindo herdado de ApplicationController" (RF-01, D1, Premissa 2). Regex/linha por
// desenho (PLAN "Risks": nao ha parser Ruby no repo); fidelidade menor vira `unresolved`, nunca rota
// inventada (RF-09). Fontes: Rails Guides "Routing from the Outside In"; knowledge/rails/atoms/action-controller-and-routing.md.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { CoverageMap, CoverageRule, HttpMethod, Route, RouteAdapter } from './route-auth-matrix.types'
import { HTTP_METHODS } from './route-auth-matrix.types'
import { authNameNotes, isAuthName, splitByAuthName } from './route-auth-heuristics'

const ROUTES_FILE = 'config/routes.rb'
const CONTROLLERS_DIR = 'app/controllers'
const BASE_CLASSES = new Set(['ActionController::Base', 'ActionController::API', 'ApplicationController::Base'])

// Guia §2.2 — as 7 acoes REST, 8 rotas (update = PATCH + PUT, G10). Hash map, nao switch.
const RESOURCE_ACTIONS: Readonly<Record<string, ReadonlyArray<{ method: HttpMethod; suffix: string }>>> = {
  index:   [{ method: 'GET', suffix: '' }],
  new:     [{ method: 'GET', suffix: '/new' }],
  create:  [{ method: 'POST', suffix: '' }],
  show:    [{ method: 'GET', suffix: '/:id' }],
  edit:    [{ method: 'GET', suffix: '/:id/edit' }],
  update:  [{ method: 'PATCH', suffix: '/:id' }, { method: 'PUT', suffix: '/:id' }],
  destroy: [{ method: 'DELETE', suffix: '/:id' }],
}
const RESOURCE_ORDER = ['index', 'new', 'create', 'show', 'edit', 'update', 'destroy'] as const
// §2.5 singular: sem index, sem `:id`
const SINGULAR_SKIP = new Set(['index'])

// Linhas do subset. Exemplo que casa / que NAO casa em cada uma:
const RESOURCES_RE = /^\s*(resources|resource)\s+:([a-z0-9_]+)\s*(?:,\s*(.*?))?\s*(do)?\s*$/
//   casa: `resources :posts, only: [:index, :show]`   |   nao casa: `resources "posts"` (string, fora do subset)
const VERB_RE = /^\s*(get|post|put|patch|delete|match)\s+(['"])([^'"]+)\2\s*(.*)$/
//   casa: `get "health", to: "health#show"`           |   nao casa: `get :preview` (forma de member/collection)
const SYMBOL_VERB_RE = /^\s*(get|post|put|patch|delete)\s+:([a-z0-9_]+)\s*(.*)$/
//   casa: `post :publish` (dentro de member/collection ou com `on:`)
const TO_RE = /(?:\bto:\s*|=>\s*)(['"])([a-z0-9_\/]+)#([a-z0-9_]+)\1/
//   casa: `to: "admin/users#index"` e `=> 'health#show'` | nao casa: `controller: 'x', action: 'y'` (→ unresolved)
const ROOT_RE = /^\s*root\s+(?:to:\s*)?(['"])([a-z0-9_\/]+)#([a-z0-9_]+)\1/
const NAMESPACE_RE = /^\s*namespace\s+:([a-z0-9_]+)\s+do\s*$/
const SCOPE_RE = /^\s*scope\s+(.+?)\s+do\s*$/
const BLOCK_RE = /^\s*(member|collection)\s+do\s*$/
const ONLY_RE = /\bonly:\s*(\[[^\]]*\]|:[a-z0-9_]+)/
const EXCEPT_RE = /\bexcept:\s*(\[[^\]]*\]|:[a-z0-9_]+)/
const VIA_RE = /\bvia:\s*(\[[^\]]*\]|:[a-z]+)/
const ON_RE = /\bon:\s*:(member|collection)/
const OUT_OF_SUBSET_RE = /^\s*(mount|constraints|draw|concern|concerns|direct|resolve|redirect|devise_for|devise_scope|shallow)\b/
const END_RE = /^\s*end\s*$/
const DRAW_RE = /routes\.draw\s+do\s*$/

type Frame =
  | { kind: 'draw' }
  | { kind: 'namespace' | 'scope'; path: string; module: string }
  | { kind: 'resources'; path: string; controller: string; singular: boolean; line: number }
  | { kind: 'member' | 'collection' }
  | { kind: 'unresolved'; reason: string }   // G23: bloco inteiro fora do subset

/** `users` → `UsersController`; `admin/users` → `Admin::UsersController`. Sem inflexao alem de camelize. */
export function controllerNameFor(pathLike: string, modulePrefix: string): string
/** `resource :profile` → `ProfilesController` (guia §2.5: controller plural). Subset: `+ 's'` quando nao termina em `s`. */
function pluralize(name: string): string
function symbols(list: string): string[]   // `[:index, :show]` ou `:index` → ['index','show']

export function parseRailsRoutes(source: string, file: string): { routes: Route[]; notes: string[] }
// Estado: stack de Frame; para cada linha (1-based): comentario/vazia → skip; DRAW_RE → push draw;
// END_RE → pop; NAMESPACE_RE → push namespace {path: prefix+'/'+name, module: mod+Camel+'::'};
// SCOPE_RE → parse `path:`/`module:`/string solta; qualquer outra chave → push unresolved (G23);
// RESOURCES_RE → expande acoes (only/except), emite rotas com handler `${Ctrl}#${action}`, line = linha da
//   declaracao; se `do` → push resources (path da instancia `/posts/:post_id` para nested, `/posts/:id` para member);
// BLOCK_RE → push member/collection; SYMBOL_VERB_RE dentro de member/collection ou com ON_RE → rota
//   `${resourcePath}/:id/${name}` ou `${resourcePath}/${name}` com handler `${Ctrl}#${name}`;
// VERB_RE → TO_RE obrigatorio (senao unresolved 'verbo sem to:'); `match` exige VIA_RE (senao unresolved
//   'match sem via: — aceita todos os verbos (anti-pattern, atom action-controller-and-routing)'); `via: :all` → 7;
// ROOT_RE → GET `${prefix}/` (normalizado para `/` na raiz);
// OUT_OF_SUBSET_RE → unresolved (com `do` no fim → push unresolved);
// frame unresolved no topo → toda linha interna vira unresolved com a razao do frame;
// linha nao reconhecida → unresolved 'linha fora do subset da DSL: <texto>'.
// Rota unresolved: { method: 'GET', path: '/' + texto (max 80 chars, so se nao comecar com '/'), file, line, stack: 'rails', handler?, unresolved }
// Nested alem de 1 nivel (frame resources dentro de resources dentro de resources) → unresolved (atom: max 1 nivel).
// Saida ordenada por path e metodo (mesma regra do Next).
```

O `enumerateRailsRoutes(targetDir)` le `config/routes.rb` (ausente → `{ routes: [], notes: ['config/routes.rb ausente — nenhuma rota Rails enumerada'] }`, DP-13) e chama `parseRailsRoutes`.

### Passo 4: Controllers — `parseRailsController`, `resolveFilterChain`, `readRailsCoverage`

```ts
export type FilterDecl = { kind: 'before' | 'skip'; names: string[]; only?: string[]; except?: string[]; conditional: boolean; line: number }
export type ControllerInfo = { name: string; parent: string; file: string; line: number; filters: FilterDecl[] }

const MODULE_RE = /^\s*module\s+([A-Z][A-Za-z0-9_]*)\s*$/
const CLASS_RE = /^\s*class\s+([A-Z][A-Za-z0-9_:]*)\s*<\s*(?:::)?([A-Z][A-Za-z0-9_:]*)/
//   casa: `class Admin::UsersController < ApplicationController` | nao casa: `class Foo` (sem pai: nao e controller)
const FILTER_RE = /^\s*(before_action|prepend_before_action|append_before_action|skip_before_action)\s+((?::[a-z0-9_!?]+\s*,?\s*)+)(.*)$/
//   casa: `before_action :authenticate_user!, only: [:index]` e `before_action :a, :b`
//   nao casa: `before_action do ... end` (bloco anonimo → linha cai em CONDITIONAL_RE via `do`) — tratado como conditional sem nome
const CONDITIONAL_RE = /\b(if|unless):|\bdo\b|\{|->|\blambda\b|\bproc\b/

/** `null` quando o arquivo nao declara `class X < Y`. Modulos aninhados antes da classe compoem o nome. */
export function parseRailsController(source: string, file: string): ControllerInfo | null

export type EffectiveFilter = { name: string; only?: string[]; except?: string[]; skippedFor: string[]; conditional: boolean; owner: string; file: string; line: number }
export type ChainResult =
  | { kind: 'resolved'; filters: EffectiveFilter[] }
  | { kind: 'missing'; name: string }
  | { kind: 'unknown-parent'; name: string; parent: string }

/**
 * Semantica do ActiveSupport::Callbacks (guia "Action Controller Overview" §Filters):
 * pai primeiro; `before_action` com o MESMO nome no filho REMOVE e re-adiciona com as novas opcoes (G22);
 * `skip_before_action` sem opcoes remove; com `only:` restringe (`skippedFor`); com `except:` → conditional
 * (fora do subset — nao inventar a intersecao). Ciclo ou profundidade > 10 → unknown-parent.
 */
export function resolveFilterChain(name: string, controllers: ReadonlyMap<string, ControllerInfo>, seen = new Set<string>()): ChainResult

export function appliesTo(filter: EffectiveFilter, action: string): boolean {
  return (filter.only === undefined || filter.only.includes(action)) && !(filter.except?.includes(action) ?? false) && !filter.skippedFor.includes(action)
}

/** G26: mapa por SCAN de app/controllers/**\/*.rb, nao por inflexao do nome. */
function scanControllers(targetDir: string): { byName: Map<string, ControllerInfo>; files: string[] }

export function readRailsCoverage(targetDir: string): CoverageMap {
  const { routes } = enumerateRailsRoutes(targetDir)
  const { byName, files } = scanControllers(targetDir)
  const rules: CoverageRule[] = []
  const seenHandlers = new Set<string>()
  const filterNames: string[] = []
  const notes: string[] = []
  for (const route of routes) {
    if (route.unresolved !== undefined || route.handler === undefined || seenHandlers.has(route.handler)) continue
    seenHandlers.add(route.handler)
    const [ctrl, action] = route.handler.split('#')      // G5: ambos `string | undefined` — checar e continue
    const chain = resolveFilterChain(ctrl, byName)
    if (chain.kind === 'missing')        { rules.push({ kind: 'opaque', handler: route.handler, reason: `controller ${chain.name} nao encontrado em ${CONTROLLERS_DIR}/`, file: route.file, line: route.line }); continue }
    if (chain.kind === 'unknown-parent') { rules.push({ kind: 'opaque', handler: route.handler, reason: `${chain.name} herda de ${chain.parent}, que nao foi encontrado — cadeia de filtros incompleta`, file: route.file, line: route.line }); continue }
    const applicable = chain.filters.filter((f) => appliesTo(f, action))
    filterNames.push(...applicable.map((f) => f.name))
    const auth = applicable.filter((f) => isAuthName(f.name))
    const conditional = auth.find((f) => f.conditional)
    if (conditional !== undefined) { rules.push({ kind: 'opaque', handler: route.handler, reason: `before_action :${conditional.name} condicional (if:/unless:/bloco) em ${conditional.file}:${conditional.line}`, file: conditional.file, line: conditional.line }); continue }
    const first = auth[0]
    if (first === undefined) continue        // DESCOBERTA: o motor decide; nada a emitir
    const inherited = first.owner !== ctrl ? ` (herdado de ${first.owner})` : ''
    rules.push({ kind: 'handler-chain', handler: route.handler, file: first.file, line: first.line, via: `before_action :${first.name}${describeScope(first)}${inherited}` })
  }
  notes.push(...authNameNotes('filtros', splitByAuthName(filterNames)))
  return { stack: 'rails', rules, sources: [ROUTES_FILE, ...files], notes }
}

export const railsAdapter: RouteAdapter = {
  stack: 'rails',
  enumerate: (targetDir) => enumerateRailsRoutes(targetDir).routes,
  readCoverage: readRailsCoverage,
  // DP-9: sem isCoverageFile/readCoverageAtBase nesta versao — G2 sai not-applicable com nota.
}
```

`describeScope(f)` devolve `, only: [:index]` / `, except: [...]` quando houver, para o `via` dizer
exatamente o que cobriu. `sources` lista os controllers lidos (POSIX, ordenados) — o relatorio cita.

### Passo 5: Manifest

`bun run generate:manifest` nos DOIS commits (heuristics, rails sao libs novas; types, matrix, allowlist,
nextjs mudaram). Revisar pelo checksum (G3).

---

## Gotchas

- **G1/G2 do plano:** fixture SO `.rb`, `Gemfile`, `.json` — todos passam pelo gate e nao entram no
  `tsc`. Nao criar `.ts` na fixture.
- **G4 do plano:** `Route` com `unresolved`: montar `{ method, path, file, line, stack, handler }` e
  espalhar `...(reason !== undefined ? { unresolved: reason } : {})`; nunca `unresolved: undefined`.
  Idem `only?`/`except?` em `FilterDecl` e `reason?` em `AllowlistFinding`.
- **G5 do plano:** `route.handler.split('#')` devolve `(string | undefined)[]` — desestruturar e
  `if (ctrl === undefined || action === undefined) continue`. `match[2]` de toda regex idem.
- **G6 do plano:** os testes do motor (Passo 0.2) usam literais inline → RED por assertion.
  `promoteWideCandidates` e `isAuthName` sao imports novos → passo separado (compilacao RED aceita,
  defesa provada no RED-check). `route-auth-heuristics.test.ts` e `route-auth-rails.test.ts` sao
  arquivos novos → RED de compilacao ate a lib existir (mesmo padrao do Plano 02 fase-01).
- **G10 do plano:** `resources` completo = 8 rotas (PATCH + PUT). Quem "corrige" para 7 quebra o teste
  `expands resources into the eight REST routes`.
- **G18 do plano:** rules `handler-chain` sao deduplicadas por `handler` (`seenHandlers`) — PATCH e PUT
  de `update` casam a MESMA regra. Nao emitir uma por rota.
- **G21 do plano:** todas as rotas tem `file: 'config/routes.rb'`; `line` e a linha da declaracao
  (`resources`/`get`/`root`) — para rotas de `namespace ... do resources :users end`, a linha e a do
  `resources` (7 na fixture), nao a do `namespace`.
- **G22 do plano:** redeclaracao substitui. A implementacao e literal: ao ver `before` com nome ja
  presente na cadeia, `filters = filters.filter((f) => f.name !== name)` antes de `push`. O teste
  `replaces an inherited filter when the child redeclares it` cai se alguem "mesclar" as opcoes.
- **G23 do plano:** `scope as: :v2 do` → frame `unresolved`; toda linha ate o `end` correspondente vira
  `unresolved` com a razao do frame. `shallow: true` como OPCAO de `resources` (nao bloco) → nota
  "shallow ignorado: rotas nested enumeradas na forma completa" (conservador: mais rotas, nao menos).
- **G24 do plano:** se `readAllowlistAtBase` (Plano 03) ja existir no checkout, aplicar
  `promoteWideCandidates` tambem la (uma linha) — senao `/posts/:id` promovida hoje vira "perdida" no G2.
- **G26 do plano:** `scanControllers` percorre `app/controllers/` recursivamente; um `.rb` sem
  `class X < Y` (concern, helper) e ignorado com nota `sem classe de controller`. `class Foo < ApplicationController`
  em arquivo com nome diferente e encontrado do mesmo jeito — o mapa e por NOME declarado.
- **Local — `resource` singular e `resources` compartilham o loop; a diferenca e `SINGULAR_SKIP` e o
  sufixo sem `:id`.** `resource :profile` → `/profile`, `/profile/new`, `/profile/edit` e
  `ProfilesController` (plural — guia §2.5). Subset de pluralizacao: `+ 's'`; `resource :person`
  viraria `PersonsController` — nota, e o controller "nao encontrado" vira `opaque` escopado, nunca
  `coberta`.
- **Local — `get 'a/b'` sem `to:`:** guia §3.1 infere `a#b`. No subset, SO quando o path tem exatamente
  um `/` interno; `get 'health'` sem `to:` → `unresolved` 'verbo sem to:'.
- **Local — `except:` em `skip_before_action`:** `skip_before_action :x, except: [:a]` = a rota `a`
  mantem `x`, as outras perdem. A intersecao com o `only:` herdado e calculavel, mas fora do subset —
  vira `conditional: true` → `opaque` escopado → `indeterminada`. Conservador por desenho.
- **Local — `before_action` com varios nomes:** `before_action :a, :b, only: [:x]` = dois filtros com as
  mesmas opcoes. `FilterDecl.names` e array; a cadeia expande um `EffectiveFilter` por nome.
- **Local — `prepend_before_action`/`append_before_action`:** ordem nao importa para o veredito (so
  "existe filtro de auth aplicavel?"); tratados como `before`.

---

## Verificacao

### TDD

- [ ] **RED 0 (contrato):** `bun test skills/security/lib/route-auth-matrix.types.test.ts -t 'unresolved'`
  → `Expected: true, Received: false` (o `isRoute` atual aceita a chave extra? NAO — ele nao a valida;
  o teste `rejects an unresolved flag that is empty` e o que falha: `Expected: false, Received: true`)
- [ ] **RED 1 (motor):** `bun test skills/security/lib/route-auth-matrix.test.ts -t 'handler-chain|unresolved|escopado|dialect'`
  → `handler-chain`: `Expected: "coberta", Received: "indeterminada"` (kind desconhecido cai em `unsure`);
  `unresolved` (CA-05): `Expected: "indeterminada", Received: "coberta"` — **este e o abuso**; opaco
  escopado: `Expected: "DESCOBERTA", Received: "indeterminada"`; dialect: `Expected not toContain "config.matcher"`
- [ ] **RED 2 (heuristics, arquivo novo):** `bun test skills/security/lib/route-auth-heuristics.test.ts`
  → erro de resolucao de modulo (aceito)
- [ ] **RED 3 (allowlist):** `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'keeps the reason'`
  → `Expected: "post publico", Received: undefined`; depois, com o import, `-t 'promoteWideCandidates'`
  → compilacao RED (aceito)
- [ ] **GREEN A:** `bun test skills/security/lib/` → `0 fail`; `route-auth-matrix.test.ts` 60 pass;
  `public-routes-allowlist.test.ts` 24; `route-auth-heuristics.test.ts` 7; `route-auth-nextjs.test.ts`
  **40 (inalterado)**; `route-auth-matrix.types.test.ts` 10
- [ ] **RED 4 (Rails, arquivo novo):** `bun test skills/security/lib/route-auth-rails.test.ts` → modulo
  ausente (aceito). Apos stub `parseRailsRoutes = () => ({ routes: [], notes: [] })`: `-t 'eight REST'`
  → `Expected length: 8, Received length: 0`
- [ ] **GREEN B:** `bun test skills/security/lib/route-auth-rails.test.ts` → `14 pass, 0 fail`

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `CA-05: yields indeterminada with the reason for an unresolved route,
      even when a rule would cover it` FALHOU antes do curto-circuito existir (`Received: "coberta"`) —
      rota que o adaptador nao resolve saindo como coberta e o AB-2 do PRD
- [ ] **Segundo abuso no RED (Rails):** `drops an inherited filter when the child skips it` e
      `Premissa 2: ... skip uncovers health, redeclaration uncovers posts#show` FALHARAM antes de
      `resolveFilterChain` tratar `skip`/redeclaracao — sem isso `/health` e `/posts/:id` sairiam
      `coberta` por heranca (falsa garantia, o risco de impacto alto do PRD)
- [ ] **CA-08 (parcial — Rails):** `bun test skills/security/lib/route-auth-rails.test.ts -t 'CA-08'`
      → 1 pass; a lista de 13 rotas bate com a tabela do Passo 1
- [ ] **CA-05-equivalente Rails:** `match` sem `via:` → `-t 'unresolved'` → `unresolved` contem `via:`
      e o veredito e `indeterminada` (teste Premissa 2)
- [ ] **CA-04 continua (DP-7 nao afrouxou):** `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-04'`
      → 3 pass (`/api/*` sem rota igual continua `high`)
- [ ] **Premissa 2 (PRD):** heranca de `ApplicationController` cobre as 8 rotas de `Admin::Users` — verde
- [ ] **Premissa 3 medida:** taxa Rails `2/13 = 0.15` registrada no MEMORY (tabela)
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A fase nao altera auth de projeto
      algum; a allowlist da fixture e dado de teste, nao configuracao de projeto real
- [ ] **Nenhum secret literal** em fixture ou codigo: `grep -rniE "SECRET\s*=|API_KEY\s*=" tests/fixtures/route-auth-matrix/rails-minimal skills/security/lib/route-auth-rails.ts` → vazio (G19)

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) fazer `isAuthName` devolver
      `true` para tudo → `-t 'does not match cross-cutting'` FALHA e `-t 'name notes'` FALHA em
      `filtros ignorados por nome: set_locale`; restaurar. (2) Em `resolveFilterChain`, remover a
      heranca (`parentChain = []`) → `inherits ApplicationController filters` FALHA com
      `Received: []` e `Premissa 2` FALHA em `/admin/users/:id` (`Received: "DESCOBERTA"`); restaurar.
      (3) Remover o `filter((f) => f.name !== name)` da redeclaracao → `replaces an inherited filter`
      FALHA (`only` esperado `['index']`, recebido `undefined`); restaurar. (4) Trocar `unresolved` por
      path literal em `match` sem via (emitir rota GET normal) → `marks match without via ... as unresolved`
      FALHA e `CA-05` do motor continua verde (prova que os dois testes cobrem camadas diferentes);
      restaurar. (5) Em `RULE_MATCHERS.opaque`, devolver `unsure` sempre → `does not leak the opaque`
      FALHA (`Received: "indeterminada"`); restaurar. (6) Em `promoteWideCandidates`, promover sem checar
      a enumeracao → `CA-04: keeps a candidate that matches no enumerated route` FALHA; restaurar.
- [ ] `grep -n "switch" skills/security/lib/route-auth-rails.ts skills/security/lib/route-auth-heuristics.ts` → vazio
- [ ] `grep -nE "\bas [A-Z]" skills/security/lib/route-auth-rails.ts` → vazio (type guards, nunca `as`)
- [ ] `grep -n "readBalanced\|splitTopLevel\|function lineOf" skills/security/lib/route-auth-nextjs.ts` →
      so a linha de `import` (copias privadas apagadas — DP-3a)
- [ ] `bun test skills/security/lib/route-auth-nextjs.test.ts` → `40 pass` (zero regressao pelo move)
- [ ] `bun run generate:manifest` sem warning nos DOIS commits; diff revisado pelo checksum (G3)
- [ ] `bun run agents:contract` verde (o agente nao muda nesta fase; confirma que nada quebrou)
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G25)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G15)
- [ ] GT-fase02-1 respeitado: imports novos em passo separado nos arquivos de teste existentes
- [ ] **Nenhum `.ts` novo em `tests/fixtures/`** (G1): `git status --porcelain tests/fixtures | grep '\.ts$'` → vazio
- [ ] Taxa de indeterminada Rails registrada no MEMORY (tabela Premissa 3)
- [ ] MEMORY.md: DI/BUG/GT desta fase; Metricas (1/5); contagens reais de teste se diferirem das estimadas

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-rails.test.ts` retorna `14 pass, 0 fail`
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-05|CA-04|handler-chain|escopado'` retorna `0 fail`
- `bun test skills/security/lib/route-auth-nextjs.test.ts` retorna `40 pass` (inalterado)
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning
- `git log --oneline -2` mostra os dois commits (refactor do Passo 0; feat do adaptador)

**Por humano:**
- Num projeto Rails real (API-only ou full-stack), `bun skills/security/lib/route-auth-rails.ts` nao e
  CLI (o adaptador so roda via `auditProject` na fase-04) — o criterio por humano desta fase e ler
  `railsAdapter.enumerate(<projeto>)` num REPL do Bun e conferir 5 rotas contra `bin/rails routes`
  (rodado pelo humano, nunca pela lib — PRD NFR "sem execucao de comando do projeto"): path, verbo e
  `controller#action` batem; o que nao bate esta em `unresolved` com razao, nunca inventado —
  **pendente de projeto Rails disponivel**; registrar como divida se nao houver

---

<!-- Gerado por /plan-feature em 2026-09-06 -->
