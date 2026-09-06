// 2026-09-03 (Luiz/dev): tracer bullet do PRD route-auth-matrix-audit — CA-01 no shape ingenuo.
// 2026-09-04 (Luiz/dev): reescrito na fase-05 — motor de veredito, regra de severidade e escopo G1.
// CA-02 e CA-06 sao testados contra `evaluateRoute` com CoverageMap inline, nao contra fixture em
// disco: o TDD gate bloqueia criar `middleware.ts` (GT-fase01-1) e funcao pura dispensa I/O.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditRouteCoverage, buildContractIssues, evaluateRoute, readAtBaseFromGit, severityFor, toContractIssue, verdictFor } from './route-auth-matrix'
import type { BaseRead, CoverageMap, Route } from './route-auth-matrix.types'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')
const MINIMAL = join(FIXTURES, 'nextjs-minimal')
// 2026-09-05 (Luiz/dev): Plano 02 fase-01 — fixture da allowlist (DP-13), sem middleware.ts (G1).
const ALLOWLIST = join(FIXTURES, 'nextjs-allowlist')
// 2026-09-05 (Luiz/dev): Plano 02 fase-02 — fixture da entrada ampla (DP-3/AB-1), sem middleware.ts (G1).
const WIDE = join(FIXTURES, 'nextjs-allowlist-wide')

const route = (over: Partial<Route>): Route => ({
  method: 'GET',
  path: '/x',
  file: 'app/x/route.ts',
  line: 1,
  stack: 'nextjs',
  ...over,
})

const coverage = (patterns: string[]): CoverageMap => ({
  stack: 'nextjs',
  rules: patterns.map((pattern) => ({ kind: 'path-pattern', pattern, file: 'middleware.ts', line: 9 })),
  sources: ['middleware.ts'],
  notes: [],
})

// 2026-09-05 (Luiz/dev): Plano 03 DP-9 — a ponta "antes" e TEXTO pelo seam readAtBase (G1 do plano: sem
// fixture de middleware). O matcher fica na linha 2, entao a evidence "antes" e `middleware.ts@base:2 casa <path>`.
const middlewareSource = (patterns: string[]): string =>
  `export function middleware() {}\nexport const config = { matcher: ${JSON.stringify(patterns)} }\n`

describe('auditRouteCoverage — gatilho G2 e duas pontas (Plano 03)', () => {
  it('flags G2 as triggered with middleware.ts as source when the diff touches it', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['middleware.ts'],
      readAtBase: () => ({ status: 'found', source: middlewareSource(['/api/:path*']) }),
    })
    expect(summary.g2.triggered).toBe(true)
    expect(summary.g2.sources).toEqual(['middleware.ts'])
    expect(summary.g2.before).toBe('resolved')
    expect(summary.g2.lost).toBe(4)                                   // admin, preferences, users GET, users DELETE
    expect(findings.every((f) => f.trigger === 'G2')).toBe(true)      // a ponta depois e o middleware.ts REAL da fixture
    expect(summary.notes.join(' ')).not.toContain('Plano 03')    // DP-7: nota G1 sem o ponteiro
  })

  it('lists the allowlist as a G2 source when it is in the diff', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ['anti-vibe.public-routes.json'],
      readAtBase: () => ({ status: 'found', source: '{"routes":[]}' }),
    })
    expect(summary.g2.triggered).toBe(true)
    expect(summary.g2.sources).toEqual(['anti-vibe.public-routes.json'])
    expect(summary.g2.before).toBe('resolved')
  })

  it('leaves G2 untriggered with no sources when the diff touches neither coverage nor allowlist', () => {
    const { summary } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(summary.g2).toEqual({ triggered: false, sources: [], before: 'resolved', lost: 0, indeterminate: 0 })
  })

  // Base ilegivel NAO pode virar `resolved` em silencio — a consequencia por rota e a fase-03.
  it('reflects an unavailable base in summary.g2.before with the reason', () => {
    const { summary } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['middleware.ts'],
      readAtBase: () => ({ status: 'unavailable', reason: 'shallow clone sem merge-base' }),
    })
    expect(summary.g2.before).toBe('unavailable')
    expect(summary.g2.reason).toContain('shallow clone')
  })

  // 2026-09-05 (Luiz/dev): DP-3 — a base e lida UMA vez por arquivo. readAtBase com git real custa 3
  // processos por chamada; duas leituras dobram o custo e abrem espaco para dois resultados da mesma base.
  it('reads each base file once when both the allowlist and the coverage are in the diff', () => {
    const calls = new Map<string, number>()
    const readAtBase = (file: string): BaseRead => {
      calls.set(file, (calls.get(file) ?? 0) + 1)
      return file === 'middleware.ts'
        ? { status: 'found', source: middlewareSource(['/api/:path*']) }
        : { status: 'found', source: '{"routes":[]}' }
    }
    const { summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['middleware.ts', 'anti-vibe.public-routes.json'], readAtBase })
    expect(summary.g2.sources).toEqual(['middleware.ts', 'anti-vibe.public-routes.json'])   // cobertura primeiro
    expect(calls.get('middleware.ts')).toBe(1)
    expect(calls.get('anti-vibe.public-routes.json')).toBe(1)
    expect(summary.allowlist.delta?.before).toBe('resolved')   // o delta do Plano 02 saiu da MESMA leitura
  })
})

describe('severityFor (PRD D9 — regra fixa, nao julgamento)', () => {
  it('returns critical when the path has a privilege marker', () => {
    expect(severityFor(route({ path: '/api/admin' }))).toBe('critical')
    expect(severityFor(route({ path: '/billing-history' }))).toBe('critical')
    expect(severityFor(route({ path: '/internal/metrics' }))).toBe('critical')
  })

  it('returns critical when the method mutates state even without a marker', () => {
    expect(severityFor(route({ method: 'POST', path: '/api/preferences' }))).toBe('critical')
    expect(severityFor(route({ method: 'DELETE', path: '/api/notes/[id]' }))).toBe('critical')
  })

  it('returns high for GET without a privilege marker', () => {
    expect(severityFor(route({ path: '/api/preferences' }))).toBe('high')
  })

  // 2026-09-04 (Luiz/dev): marcador e PREFIXO DE SEGMENTO. Substring solta daria critical em
  // /api/badminton ("admin" dentro de "badminton") — falso positivo que corroi a confianca na regra.
  it('does not treat a marker buried inside a word as a privilege marker', () => {
    expect(severityFor(route({ path: '/api/badminton' }))).toBe('high')
  })
})

describe('evaluateRoute (motor de veredito)', () => {
  it('CA-02: yields coberta with evidence when a rule demonstrably matches', () => {
    const verdict = evaluateRoute(route({ path: '/api/admin' }), coverage(['/api/:path*']))
    expect(verdict.verdict).toBe('coberta')
    expect(verdict.evidence).toContain('middleware.ts:9')
  })

  // 2026-09-04 (Luiz/dev): AB-3 / CA-06. O texto '/api/protected/:path*' contem '/api', entao o
  // string-match diria coberta — e /api ficaria aberta reportada como protegida.
  it('CA-06: never yields coberta for a lookalike matcher', () => {
    const verdict = evaluateRoute(route({ path: '/api' }), coverage(['/api/protected/:path*']))
    expect(verdict.verdict).not.toBe('coberta')
    expect(verdict.verdict).toBe('DESCOBERTA')
  })

  it('yields indeterminada when a rule is opaque, never coberta', () => {
    const map: CoverageMap = {
      stack: 'nextjs',
      rules: [{ kind: 'opaque', reason: 'matcher computado — nao e literal', file: 'middleware.ts', line: 3 }],
      sources: ['middleware.ts'],
      notes: [],
    }
    const verdict = evaluateRoute(route({ path: '/api/admin' }), map)
    expect(verdict.verdict).toBe('indeterminada')
    expect(verdict.evidence).toContain('computado')
  })

  it('yields indeterminada when only some probes of a catch-all match', () => {
    const verdict = evaluateRoute(route({ path: '/docs/[...slug]' }), coverage(['/docs/:one']))
    expect(verdict.verdict).toBe('indeterminada')
  })

  // 2026-09-04 (Luiz/dev): o Plano 04 acrescenta variantes de CoverageRule. Kind desconhecido tem
  // de cair em indeterminada — jamais produzir coberta por acidente.
  it('treats an unknown rule kind as indeterminada, not as coverage', () => {
    const map: CoverageMap = {
      stack: 'rails',
      rules: [{ kind: 'controller-filter', pattern: 'x', file: 'a.rb', line: 1 } as never],
      sources: ['a.rb'],
      notes: [],
    }
    expect(evaluateRoute(route({ path: '/users' }), map).verdict).toBe('indeterminada')
  })

  it('yields DESCOBERTA when there is no rule at all', () => {
    const map: CoverageMap = { stack: 'nextjs', rules: [], sources: [], notes: [] }
    expect(evaluateRoute(route({ path: '/api/admin' }), map).verdict).toBe('DESCOBERTA')
  })
})

describe('verdictFor (DP-3 — a unica funcao de veredito, usada nas duas pontas)', () => {
  it('lets the allowlist win before the engine and falls through to evaluateRoute otherwise', () => {
    const entry = { path: '/api/health', reason: 'lb', file: 'anti-vibe.public-routes.json@base', line: 3 }
    const declared = verdictFor(route({ path: '/api/health' }), coverage([]), [entry])
    expect(declared.verdict).toBe('publica-declarada')
    expect(declared.evidence).toBe('anti-vibe.public-routes.json@base:3 declara publica — lb')
    expect(verdictFor(route({ path: '/api/admin' }), coverage(['/api/:path*']), [entry]).verdict).toBe('coberta')
    expect(verdictFor(route({ path: '/api/admin' }), coverage([]), []).verdict).toBe('DESCOBERTA')
  })
})

describe('auditRouteCoverage — escopo G1', () => {
  it('CA-01: emits a critical finding naming file and line for an uncovered admin route', () => {
    const { findings } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('critical')
    expect(findings[0]?.route.file).toBe('app/api/admin/route.ts')
    expect(findings[0]?.route.line).toBeGreaterThanOrEqual(1)
    expect(findings[0]?.missing).toContain('config.matcher')
    // DP-14: a description tambem diz que a rota nao esta declarada publica (RF-05).
    expect(findings.map(toContractIssue)[0]?.description).toContain('anti-vibe.public-routes.json')
  })

  it('CA-01b: emits high, not critical, for an uncovered GET without a marker', () => {
    const { findings } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/preferences/route.ts'] })
    expect(findings.map((f) => f.severity)).toEqual(['high'])
  })

  it('evaluates only routes whose files are in changedFiles', () => {
    const { summary } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(summary.enumerated).toBe(6)
    expect(summary.evaluated).toBe(1)
  })

  // G1 nao cai para full-surface: isso seria o RF-07 escondido, despejando findings de codigo que
  // a PR nao tocou. Escopo vazio e escopo vazio, com a razao visivel.
  it('evaluates nothing and says so when changedFiles is empty', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, { changedFiles: [] })
    expect(findings).toHaveLength(0)
    expect(summary.evaluated).toBe(0)
    expect(summary.notes.join(' ')).toContain('G1')
  })

  // 2026-09-05 (Luiz/dev): Plano 02 fase-03 — CA-10/D8. Substitui o teste "sem emitir" (que
  // afirmava findings.length === 0): manter os dois lado a lado seria uma contradicao permanente.
  it('CA-10: emits a medium finding for each indeterminada route instead of hiding it', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['app/api/users/[id]/route.ts'],
      coverageOverride: {
        stack: 'nextjs',
        rules: [{ kind: 'opaque', reason: 'matcher computado', file: 'middleware.ts', line: 1 }],
        sources: ['middleware.ts'],
        notes: [],
      },
    })
    expect(findings).toHaveLength(2) // GET e DELETE de /api/users/[id]
    expect(findings.map((f) => f.severity)).toEqual(['medium', 'medium'])
    expect(findings.map((f) => f.verdict)).toEqual(['indeterminada', 'indeterminada'])
    expect(findings[0]?.missing).toContain('computado')
    expect(summary.indeterminada).toBe(2)
    const issue = findings.map(toContractIssue)[0]
    expect(issue?.description).toContain('indeterminada: ')
    expect(issue?.description).toContain('cobertura nao demonstravel')
  })

  it('orders findings by severity so the worst one comes first', () => {
    const { findings } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['app/api/preferences/route.ts', 'app/api/admin/route.ts'],
    })
    expect(findings.map((f) => f.severity)).toEqual(['critical', 'high'])
  })

  // coverage(['/docs/:one']) → /api/admin nao casa (DESCOBERTA critical); /docs/[...slug] casa so uma
  // sonda (partial → indeterminada medium). Prova que medium vem DEPOIS de critical na lista.
  it('orders medium indeterminada after critical and high findings', () => {
    const { findings } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['app/docs/[...slug]/page.tsx', 'app/api/admin/route.ts'],
      coverageOverride: coverage(['/docs/:one']),
    })
    expect(findings.map((f) => f.severity)).toEqual(['critical', 'medium'])
  })
})

// 2026-09-05 (Luiz/dev): Plano 02 fase-01 — allowlist consultada ANTES do motor (DP-6). evaluateRoute
// nao muda; quem casa a allowlist nem chega nele.
describe('auditRouteCoverage — allowlist (Plano 02)', () => {
  it('CA-03: emits nothing and counts publica-declarada for a route declared in the allowlist', () => {
    const { findings, summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['app/api/health/route.ts'] })
    expect(findings).toHaveLength(0)
    expect(summary.publicaDeclarada).toBe(1)
    expect(summary.allowlist.present).toBe(true)
    expect(summary.allowlist.accepted).toBe(2)
  })

  // Sem a allowlist este POST seria critical (metodo mutante). A declaracao escrita e o que muda isso.
  it('CA-03: a declared POST is publica-declarada, not a critical finding', () => {
    const { findings, verdicts } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['app/api/webhooks/stripe/route.ts'] })
    expect(findings).toHaveLength(0)
    expect(verdicts.map((v) => v.verdict)).toEqual(['publica-declarada'])
    expect(verdicts[0]?.evidence).toContain('anti-vibe.public-routes.json:4')
  })

  it('CA-04b: a rejected entry sends the route back to the engine and lists the rejection', () => {
    const { findings, summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['app/api/admin/route.ts'] })
    expect(findings.map((f) => f.severity)).toEqual(['critical'])
    expect(summary.publicaDeclarada).toBe(0)
    expect(summary.allowlist.rejected.map((r) => r.path)).toEqual(['/api/admin'])
    expect(summary.allowlist.rejected[0]?.line).toBe(5)
  })

  it('reports the allowlist as absent with zero declared when the project has none', () => {
    const { summary, allowlistFindings } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(summary.allowlist.present).toBe(false)
    expect(summary.publicaDeclarada).toBe(0)
    expect(summary.allowlist.notes.join(' ')).toContain('nenhuma rota declarada publica')
    expect(allowlistFindings).toEqual([])
  })
})

describe('auditRouteCoverage — entrada ampla (AB-1 / CA-04)', () => {
  it('CA-04: emits its own high finding for a wide allowlist entry, independent of the routes', () => {
    const result = auditRouteCoverage(WIDE, { changedFiles: ['app/api/admin/route.ts'] })
    expect(result.allowlistFindings).toHaveLength(1)
    expect(result.allowlistFindings[0]?.severity).toBe('high')
    expect(result.allowlistFindings[0]?.file).toBe('anti-vibe.public-routes.json')
    expect(result.allowlistFindings[0]?.line).toBe(3)
    expect(result.summary.allowlist.wide).toBe(1)
    expect(result.summary.allowlist.accepted).toBe(0)
  })

  it('CA-04: a wide entry silences nothing — the route under it is still DESCOBERTA critical', () => {
    const { findings, summary } = auditRouteCoverage(WIDE, { changedFiles: ['app/api/admin/route.ts'] })
    expect(findings.map((f) => f.severity)).toEqual(['critical'])
    expect(summary.publicaDeclarada).toBe(0)
  })

  it('emits ALLOW-* issues before ROUTE-* issues in the contract output', () => {
    const result = auditRouteCoverage(WIDE, { changedFiles: ['app/api/admin/route.ts'] })
    const issues = buildContractIssues(result)
    expect(issues.map((i) => i.id)).toEqual(['ALLOW-001', 'ROUTE-001'])
    expect(issues[0]?.severity).toBe('high')
    expect(issues[0]?.line).toBe(3)
  })
})

describe('auditRouteCoverage — mudanca na allowlist (AB-4 / CA-07)', () => {
  const ALLOWLIST_IN_DIFF = ['anti-vibe.public-routes.json', 'app/api/health/route.ts']

  it('CA-07: flags the allowlist as changed and lists the delta when the file is in the diff', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ALLOWLIST_IN_DIFF,
      readAtBase: () => ({ status: 'found', source: '{"routes":[]}' }),
    })
    expect(summary.allowlist.changed).toBe(true)
    expect(summary.allowlist.delta?.before).toBe('resolved')
    expect(summary.allowlist.delta?.added.map((e) => e.path)).toEqual(['/api/health', '/api/webhooks/stripe'])
    expect(summary.allowlist.delta?.removed).toEqual([])
  })

  it('lists removed entries when the base declared a route that the head no longer does', () => {
    const base = JSON.stringify({ routes: [{ path: '/api/health', reason: 'lb' }, { path: '/api/legacy', reason: 'antiga' }] })
    const { summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ALLOWLIST_IN_DIFF,
      readAtBase: () => ({ status: 'found', source: base }),
    })
    expect(summary.allowlist.delta?.added.map((e) => e.path)).toEqual(['/api/webhooks/stripe'])
    expect(summary.allowlist.delta?.removed.map((e) => e.path)).toEqual(['/api/legacy'])
  })

  it('treats a file absent at the base as resolved with everything added', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ALLOWLIST_IN_DIFF, readAtBase: () => ({ status: 'absent' }) })
    expect(summary.allowlist.delta?.before).toBe('resolved')
    expect(summary.allowlist.delta?.added).toHaveLength(2)
  })

  // 2026-09-05 (Luiz/dev): DP-11 — NUNCA silencio. Base ilegivel nao e "sem mudanca".
  it('never stays silent when the base is unavailable', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ['anti-vibe.public-routes.json'],
      readAtBase: () => ({ status: 'unavailable', reason: 'ref nao resolvivel' }),
    })
    expect(summary.allowlist.changed).toBe(true)
    expect(summary.allowlist.delta?.before).toBe('unavailable')
    expect(summary.allowlist.delta?.added).toHaveLength(2)
    expect(summary.allowlist.delta?.reason).toContain('ref nao resolvivel')
  })

  it('reports unavailable when no base reader was given', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['anti-vibe.public-routes.json'] })
    expect(summary.allowlist.delta?.before).toBe('unavailable')
    expect(summary.allowlist.delta?.reason).toContain('readAtBase')
  })

  it('leaves changed=false and no delta when the allowlist is not in the diff', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['app/api/health/route.ts'] })
    expect(summary.allowlist.changed).toBe(false)
    expect(summary.allowlist.delta).toBeUndefined()
  })
})

describe('auditRouteCoverage — G2 cobertura perdida (Plano 03 fase-02)', () => {
  // A ponta ANTES cobre toda a API; a ponta DEPOIS so /api/preferences. Nenhum arquivo de rota no diff.
  // `(): BaseRead` e obrigatorio: sem a anotacao, `status` alarga para string e o spread nao tipa (gotcha local).
  const NARROWED = {
    changedFiles: ['middleware.ts'],
    readAtBase: (): BaseRead => ({ status: 'found', source: middlewareSource(['/api/:path*']) }),
    coverageOverride: coverage(['/api/preferences']),
  }

  // 2026-09-05 (Luiz/dev): PRD CA-09 — teste de abuso escrito ANTES do loop existir. O RED e exatamente o
  // silencio que o G2 quebra: diff que so estreita o matcher, zero findings (PRD "G2 e o que quase ficou de fora").
  it('CA-09: emits a finding for every route that left coberta when only middleware.ts narrowed the matcher', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, NARROWED)
    expect(findings).toHaveLength(3)
    expect(findings.map((f) => [f.severity, f.route.method, f.route.path])).toEqual([
      ['critical', 'GET', '/api/admin'],           // marcador de privilegio (D9)
      ['critical', 'DELETE', '/api/users/[id]'],   // metodo mutante (D9)
      ['high', 'GET', '/api/users/[id]'],
    ])
    expect(findings.every((f) => f.verdict === 'DESCOBERTA' && f.trigger === 'G2')).toBe(true)
    expect(findings.some((f) => f.route.path === '/api/preferences')).toBe(false)                    // continua coberta
    expect(findings.some((f) => f.route.path === '/docs/[...slug]' || f.route.path === '/pricing')).toBe(false)   // abertas nas duas pontas: nada perdido
    expect(summary.g2).toEqual({ triggered: true, sources: ['middleware.ts'], before: 'resolved', lost: 3, indeterminate: 0 })
    expect(summary.evaluated).toBe(3)      // G1 = 0 (middleware.ts nao e arquivo de rota) + G2 = 3
    expect(summary.descoberta).toBe(3)
  })

  // DP-4: as DUAS pontas na evidence (G6: o sufixo @base e o que distingue a linha antiga), prefixo na description.
  it('carries both ends in the evidence and prefixes [cobertura perdida] on the contract description', () => {
    const { findings } = auditRouteCoverage(MINIMAL, NARROWED)
    expect(findings[0]?.missing).toBe(
      'cobertura perdida — antes: middleware.ts@base:2 casa /api/admin; agora: nenhuma entrada de config.matcher (middleware.ts) casa /api/admin',
    )
    const description = findings.map(toContractIssue)[0]?.description ?? ''
    expect(description.startsWith('[cobertura perdida] DESCOBERTA: GET /api/admin (app/api/admin/route.ts:2)')).toBe(true)
    expect(description).toContain('antes: middleware.ts@base:2')
  })

  // Entrada REMOVIDA da allowlist (G18 do Plano 02). A fixture nextjs-allowlist declara health e stripe e tem
  // /api/admin SEM reason (recusada, CA-04b). A base declarava /api/admin COM reason: a rota era publica-declarada,
  // agora esta DESCOBERTA — e o arquivo dela nao esta no diff. So o G2 enxerga. Admin fica na linha 5 do texto.
  const BASE_WITH_ADMIN = [
    '{',
    '  "routes": [',
    '    { "path": "/api/health", "reason": "lb" },',
    '    { "path": "/api/webhooks/stripe", "reason": "assinado" },',
    '    { "path": "/api/admin", "reason": "painel legado — publico ate este diff" }',
    '  ]',
    '}',
  ].join('\n')

  it('flags a route that lost its public declaration when its allowlist entry was removed', () => {
    const { findings, summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ['anti-vibe.public-routes.json'],
      readAtBase: () => ({ status: 'found', source: BASE_WITH_ADMIN }),
    })
    expect(summary.allowlist.delta?.removed.map((e) => e.path)).toEqual(['/api/admin'])   // delta (Plano 02) e G2 saem da MESMA leitura (G16)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.route.path).toBe('/api/admin')
    expect(findings[0]?.severity).toBe('critical')
    expect(findings[0]?.trigger).toBe('G2')
    expect(findings[0]?.missing).toContain('antes: anti-vibe.public-routes.json@base:5 declara publica — painel legado')
    expect(findings[0]?.missing).toContain('agora: nenhuma entrada de config.matcher (middleware.ts ausente) casa /api/admin')
    expect(summary.g2).toEqual({ triggered: true, sources: ['anti-vibe.public-routes.json'], before: 'resolved', lost: 1, indeterminate: 0 })
  })

  // 2026-09-05 (Luiz/dev): G7 do plano (DP-6, caso inverso do `absent`) — base COM matcher, HEAD SEM middleware.ts.
  // `readCoverage` atual devolve rules: [] e tudo que era coberta vira DESCOBERTA G2. Nenhum codigo especial; o
  // teste existe para ninguem "otimizar" o caso depois.
  it('treats a deleted middleware.ts as losing every route it covered', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['middleware.ts'],
      readAtBase: () => ({ status: 'found', source: middlewareSource(['/api/:path*']) }),
      coverageOverride: { stack: 'nextjs', rules: [], sources: [], notes: ['middleware.ts nao encontrado na raiz do projeto'] },
    })
    expect(findings.map((f) => `${f.route.method} ${f.route.path}`)).toEqual([
      'GET /api/admin', 'DELETE /api/users/[id]', 'GET /api/preferences', 'GET /api/users/[id]',
    ])
    expect(findings.map((f) => f.severity)).toEqual(['critical', 'critical', 'high', 'high'])
    expect(findings.every((f) => f.trigger === 'G2' && f.missing.includes('agora: nenhuma entrada de config.matcher (middleware.ts ausente)'))).toBe(true)
    expect(summary.g2.lost).toBe(4)
    expect(summary.sources).toEqual([])   // a ponta depois nao tem fonte; a ponta antes esta na evidence
  })

  // G8 + DP-10: rota do G1 que TAMBEM perdeu cobertura conta UMA vez, como G1 (sem prefixo). Ordenacao
  // (severidade, path) e ids ROUTE-* nao mudam com o trigger.
  it('counts a route that is in G1 and also lost coverage once, as G1, keeping order and ids', () => {
    const result = auditRouteCoverage(MINIMAL, { ...NARROWED, changedFiles: ['middleware.ts', 'app/api/admin/route.ts'] })
    const admin = result.findings.filter((f) => f.route.path === '/api/admin')
    expect(admin).toHaveLength(1)
    expect(admin[0]?.trigger).toBe('G1')
    expect(result.summary.evaluated).toBe(3)      // 1 G1 + 2 G2
    expect(result.summary.g2.lost).toBe(2)
    const issues = buildContractIssues(result)
    expect(issues.map((i) => i.id)).toEqual(['ROUTE-001', 'ROUTE-002', 'ROUTE-003'])
    expect(issues[0]?.description.startsWith('DESCOBERTA: GET /api/admin')).toBe(true)                             // G1: sem prefixo
    expect(issues[1]?.description.startsWith('[cobertura perdida] DESCOBERTA: DELETE /api/users/[id]')).toBe(true)
    expect(issues[2]?.severity).toBe('high')
  })

  // O gatilho e o ARQUIVO no diff; o finding e a PERDA. Diff que alarga (ou so reescreve) o matcher dispara o
  // G2 e nao emite nada — sem isso, todo commit em middleware.ts viraria ruido. Este teste NASCE VERDE (antes do
  // loop existir tambem nao ha finding) — e a trava contra falso positivo; a defesa e provada no RED-check (4).
  it('emits nothing when the middleware change widens or keeps the coverage', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, { ...NARROWED, coverageOverride: coverage(['/api/:path*', '/dashboard/:path*']) })
    expect(findings).toHaveLength(0)
    expect(summary.g2).toEqual({ triggered: true, sources: ['middleware.ts'], before: 'resolved', lost: 0, indeterminate: 0 })
    expect(summary.evaluated).toBe(0)
  })

  // 2026-09-05 (Luiz/dev): DP-4 emendada — base com matcher COMPUTADO (opaque): toda rota era `indeterminada` antes.
  // As que estao DESCOBERTA agora nao podem sair em silencio (RF-04/D8), mas tambem nao da para provar que eram
  // cobertas: entram como `indeterminada` G2 (medium). O par indeterminada → indeterminada (matcher continua
  // computado) NAO e mudanca e nao entra. /api/preferences esta coberta hoje: fora (OPEN_NOW).
  it('treats a route that was indeterminada at the base and is DESCOBERTA now as indeterminada G2, never silent', () => {
    const OPAQUE_BASE = (): BaseRead => ({ status: 'found', source: 'export function middleware() {}\nexport const config = { matcher: PROTECTED }\n' })
    const { findings, summary } = auditRouteCoverage(MINIMAL, { changedFiles: ['middleware.ts'], readAtBase: OPAQUE_BASE, coverageOverride: coverage(['/api/preferences']) })
    expect(findings).toHaveLength(5)
    expect(findings.every((f) => f.verdict === 'indeterminada' && f.severity === 'medium' && f.trigger === 'G2')).toBe(true)
    expect(findings[0]?.missing).toContain('antes: matcher computado')
    expect(summary.g2).toEqual({ triggered: true, sources: ['middleware.ts'], before: 'resolved', lost: 0, indeterminate: 5 })

    const stillOpaque = auditRouteCoverage(MINIMAL, {
      changedFiles: ['middleware.ts'],
      readAtBase: OPAQUE_BASE,
      coverageOverride: { stack: 'nextjs', rules: [{ kind: 'opaque', reason: 'matcher computado', file: 'middleware.ts', line: 2 }], sources: ['middleware.ts'], notes: [] },
    })
    expect(stillOpaque.findings).toHaveLength(0)
    expect(stillOpaque.summary.g2.indeterminate).toBe(0)
  })
})

// Integracao real com git: o repo do plugin E um repositorio; `import.meta.dir` ancora a raiz.
describe('readAtBaseFromGit (leitura no merge-base)', () => {
  const REPO = join(import.meta.dir, '../../..')
  it('returns found with the file content for a tracked file at HEAD', () => {
    const read = readAtBaseFromGit(REPO, 'HEAD')('package.json')
    expect(read.status).toBe('found')
    if (read.status === 'found') expect(read.source).toContain('"name"')
  })
  it('returns absent for a file that does not exist at the base', () => {
    expect(readAtBaseFromGit(REPO, 'HEAD')('nao-existe-nesta-base.json').status).toBe('absent')
  })
  it('returns unavailable with a reason when the ref cannot be resolved', () => {
    const read = readAtBaseFromGit(REPO, 'ref-que-nao-existe-xyz')('package.json')
    expect(read.status).toBe('unavailable')
    if (read.status === 'unavailable') expect(read.reason.length).toBeGreaterThan(0)
  })
})
