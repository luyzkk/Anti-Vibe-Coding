<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Cobertura nas Duas Pontas do Diff

**Plano:** 03 — G2: cobertura perdida
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase do plano; exige Plano 02 completo)
**Visual:** false

---

## O que esta fase entrega

O adaptador Next passa a saber dizer se um arquivo do diff e cobertura (`isNextjsCoverageFile`) e a
reconstruir a cobertura na ponta ANTES a partir do texto que o seam `readAtBase` devolve
(`readNextjsCoverageAtBase`, pura sobre `BaseRead`); `RouteAdapter` ganha os dois metodos como OPCIONAIS;
`auditRouteCoverage` reconhece o gatilho G2 (arquivo de cobertura OU allowlist no diff), le a base UMA vez
por arquivo e deriva dela tanto o `delta` do Plano 02 quanto a `allowlistBefore`, reconstroi a
`coverageBefore`, extrai `verdictFor` como a unica funcao de veredito e expoe `summary.g2`
(`triggered`, `sources`, `before`, `lost: 0`, `indeterminate: 0`, `reason?`). Nenhum finding G2 e emitido
ainda — o loop rota a rota e a fase-02.

**DP aplicadas:** DP-1 (gatilho), DP-2 (metodos opcionais + adaptador Next), DP-3 (duas pontas pelo mesmo
pipeline; base lida uma vez), DP-7 (parte: `g2.triggered/sources/before`, nota G1 sem o ponteiro), DP-9
(helper `middlewareSource` nasce aqui). Ver MEMORY DEV-plan-2 sobre por que o loop por rota fica para a
fase-02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-matrix.test.ts` | Modify (PRIMEIRO) | Helper `middlewareSource`; 5 testes de `summary.g2` (sem import novo — RED por assertion/runtime); 1 teste de `verdictFor` (import novo — passo separado, G5) |
| `skills/security/lib/route-auth-nextjs.test.ts` | Modify | 5 testes: `isNextjsCoverageFile`, `readNextjsCoverageAtBase` found / absent / unavailable / proxy sem matcher (imports novos — RED de compilacao aceito, G5) |
| `skills/security/lib/route-auth-matrix.types.ts` | Modify (ADITIVO) | `RouteAdapter.isCoverageFile?` / `readCoverageAtBase?`; `CoverageAtBase`; `isCoverageUnavailable`; `G2Summary` |
| `skills/security/lib/route-auth-nextjs.ts` | Modify | `isNextjsCoverageFile`, `readNextjsCoverageAtBase`, `nextjsAdapter` com os dois metodos |
| `skills/security/lib/route-auth-matrix.ts` | Modify | `verdictFor`; `safeBaseReader`; `readAllowlistAtBase` + `toAllowlistDelta` (substituem `computeAllowlistDelta`); `resolveG2Sources`; `reconstructBefore`; `toG2Summary`; `AuditSummary.g2`; nota G1 |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — types, nextjs, matrix |

> Excecao declarada (>5 arquivos contando o manifest gerado): tipos, adaptador e motor sao a mesma fatia —
> o metodo opcional sem chamador ou o chamador sem metodo deixaria um estado intermediario sem sentido.

---

## Implementacao

### Passo 1: Testes PRIMEIRO no motor — `summary.g2` (SEM import de valor novo)

Acrescentar ao lado de `coverage()` o helper da DP-9 e um `describe` novo. `BaseRead` entra no
`import type` existente (type-only: o Bun apaga, nao ha RED de compilacao).

```ts
// route-auth-matrix.test.ts
import type { BaseRead, CoverageMap, Route } from './route-auth-matrix.types'

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
    expect(summary.g2.lost).toBe(0)                              // emissao e a fase-02
    expect(findings).toHaveLength(0)
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
```

Rodar `bun test skills/security/lib/route-auth-matrix.test.ts -t 'gatilho G2'` e VER os 5 falharem
(ver "Verificacao" para a forma exata do RED). Os 33 testes preexistentes continuam verdes neste passo.

### Passo 2: Testes do adaptador — imports novos (RED de compilacao aceito, G5)

```ts
// route-auth-nextjs.test.ts — acrescentar ao import de './route-auth-nextjs':
//   isNextjsCoverageFile, readNextjsCoverageAtBase
// e as duas linhas:
import { isCoverageUnavailable } from './route-auth-matrix.types'
import type { BaseRead } from './route-auth-matrix.types'

describe('G2 — cobertura na ponta antes (Plano 03 DP-2)', () => {
  // G17 do plano: readNextjsCoverage so le a raiz; reconhecer src/middleware.ts aqui daria G2 com base vazia.
  it('recognizes only the root middleware.ts as a coverage file', () => {
    expect(isNextjsCoverageFile('middleware.ts')).toBe(true)
    expect(isNextjsCoverageFile('src/middleware.ts')).toBe(false)
    expect(isNextjsCoverageFile('app/api/admin/route.ts')).toBe(false)
  })

  it('rebuilds the base coverage from the middleware text with @base-suffixed sources', () => {
    const read = (): BaseRead => ({ status: 'found', source: `export const config = {\n  matcher: ['/api/:path*', '/admin/:path*'],\n}\n` })
    const result = readNextjsCoverageAtBase(read)
    if (isCoverageUnavailable(result)) throw new Error('esperava CoverageMap')
    expect(result.sources).toEqual(['middleware.ts@base'])
    expect(result.rules.map((r) => (r.kind === 'path-pattern' ? r.pattern : r.kind))).toEqual(['/api/:path*', '/admin/:path*'])
    expect(result.rules[0]?.file).toBe('middleware.ts@base')
    expect(result.rules[0]?.line).toBe(2)
  })

  // DP-6: sem middleware antes = zero cobertura antes = nada a perder. NAO e `unavailable`.
  it('treats middleware.ts absent at the base as no coverage at all, with a note', () => {
    const result = readNextjsCoverageAtBase(() => ({ status: 'absent' }))
    if (isCoverageUnavailable(result)) throw new Error('esperava CoverageMap')
    expect(result.rules).toEqual([])
    expect(result.sources).toEqual([])
    expect(result.notes.join(' ')).toContain('nenhuma cobertura a perder')
  })

  it('passes an unavailable base through with its reason instead of inventing rules', () => {
    const result = readNextjsCoverageAtBase(() => ({ status: 'unavailable', reason: 'ref nao resolvivel' }))
    expect(result).toEqual({ unavailable: 'ref nao resolvivel' })
  })

  // G9 do plano: o proxy G13 (sem matcher = roda em tudo) vale na ponta antes — e precisa ficar visivel.
  it('keeps the G13 proxy on the base end: middleware without matcher covers everything, with a note', () => {
    const result = readNextjsCoverageAtBase(() => ({ status: 'found', source: 'export function middleware() {}\n' }))
    if (isCoverageUnavailable(result)) throw new Error('esperava CoverageMap')
    expect(result.rules).toEqual([{ kind: 'path-pattern', pattern: '/:path*', file: 'middleware.ts@base', line: 1 }])
    expect(result.notes.join(' ')).toContain('cobertura por proxy')
  })
})
```

### Passo 3: Tipos — ADITIVO em `route-auth-matrix.types.ts`

```ts
export interface RouteAdapter {
  readonly stack: StackId
  enumerate(targetDir: string): Route[]
  readCoverage(targetDir: string): CoverageMap
  // 2026-09-05 (Luiz/dev): Plano 03 DP-1/DP-2 — G2 (PRD Decisao 6). OPCIONAIS de proposito: o Plano 04
  // registra adaptadores sem eles e o motor responde `not-applicable` com nota — nunca `coberta`.
  /** O arquivo do diff define cobertura desta stack? (Next: `middleware.ts` na raiz.) */
  isCoverageFile?(file: string): boolean
  /** Reconstroi a cobertura na ponta ANTES a partir do seam `read` — puro, sem I/O proprio. */
  readCoverageAtBase?(read: (file: string) => BaseRead): CoverageAtBase
}

export type CoverageAtBase = CoverageMap | { unavailable: string }

/** G15 do plano: `in` narrowing — `CoverageMap` nao tem a chave `unavailable`. Sem `as`. */
export function isCoverageUnavailable(value: CoverageAtBase): value is { unavailable: string } {
  return 'unavailable' in value
}

// DP-7. `reason` so quando `before !== 'resolved'` (G3: nunca `reason: undefined`).
export type G2Summary = {
  triggered: boolean
  /** Arquivos de cobertura e/ou allowlist que estavam no diff (cobertura primeiro). */
  sources: string[]
  /** `resolved` tambem quando nao disparou: a ponta antes E a ponta depois. */
  before: 'resolved' | 'unavailable' | 'not-applicable'
  /** G2 com veredito DESCOBERTA (a fase-02 preenche; aqui sempre 0). */
  lost: number
  /** G2 com veredito indeterminada (fases 02/03 preenchem; aqui sempre 0). */
  indeterminate: number
  reason?: string
}
```

### Passo 4: Adaptador Next — `isNextjsCoverageFile` e `readNextjsCoverageAtBase`

```ts
// route-auth-nextjs.ts
import type { BaseRead, CoverageAtBase, CoverageMap, CoverageRule, HttpMethod, Route, RouteAdapter } from './route-auth-matrix.types'

const MIDDLEWARE_AT_BASE = `${MIDDLEWARE_FILE}@base`   // G6: o sufixo e o que distingue as pontas no texto do finding

/** DP-1. Igualdade exata: `readNextjsCoverage` so le a raiz, entao `src/middleware.ts` NAO e cobertura (G17). */
export function isNextjsCoverageFile(file: string): boolean {
  return file === MIDDLEWARE_FILE
}

// 2026-09-05 (Luiz/dev): DP-2/DP-6 — puro sobre o seam. `absent` = nao havia middleware = zero cobertura
// antes = nada a perder. `unavailable` passa adiante com a razao; a consequencia e do motor (DP-5, fase-03).
export function readNextjsCoverageAtBase(read: (file: string) => BaseRead): CoverageAtBase {
  const result = read(MIDDLEWARE_FILE)
  if (result.status === 'unavailable') return { unavailable: result.reason }
  if (result.status === 'absent') {
    return { stack: 'nextjs', rules: [], sources: [], notes: [`${MIDDLEWARE_FILE} ausente na base — nenhuma cobertura a perder`] }
  }
  const notes: string[] = []
  // G9: o proxy G13 (sem matcher = roda em tudo) vale na ponta antes tambem — e precisa ficar visivel.
  if (!/matcher\s*:/.test(result.source)) {
    notes.push(`${MIDDLEWARE_AT_BASE} sem config.matcher — o middleware rodava em toda rota; cobertura por proxy`)
  }
  return { stack: 'nextjs', rules: parseMatcherConfig(result.source, MIDDLEWARE_AT_BASE), sources: [MIDDLEWARE_AT_BASE], notes }
}

export const nextjsAdapter: RouteAdapter = {
  stack: 'nextjs',
  enumerate(targetDir: string): Route[] { return enumerateNextjsRoutes(targetDir).routes },
  readCoverage(targetDir: string): CoverageMap { return readNextjsCoverage(targetDir) },
  isCoverageFile: isNextjsCoverageFile,
  readCoverageAtBase: readNextjsCoverageAtBase,
}
```

### Passo 5: Motor — `verdictFor`, leitor seguro, base lida uma vez, gatilho e ponta antes

`computeAllowlistDelta` e SUBSTITUIDA por `readAllowlistAtBase` + `toAllowlistDelta`: a leitura sai da
funcao para que o G2 consuma o mesmo resultado. Os 6 testes de CA-07 nao mudam (mesma saida).

```ts
// route-auth-matrix.ts
import type { AllowlistDelta, AllowlistEntry, BaseRead, G2Summary, RouteAdapter } from './route-auth-matrix.types'
import { isCoverageUnavailable } from './route-auth-matrix.types'

// 2026-09-05 (Luiz/dev): DP-3 — a UNICA forma de produzir veredito de rota. Allowlist ANTES do motor
// (DP-6 do Plano 02); as duas pontas do diff passam por aqui, entao nao ha como divergir.
export function verdictFor(route: Route, coverage: CoverageMap, allowlist: AllowlistEntry[]): RouteVerdict {
  const declared = matchAllowlist(route, allowlist)
  if (declared !== null) {
    return { route, verdict: 'publica-declarada', evidence: `${declared.file}:${declared.line} declara publica — ${declared.reason}` }
  }
  return evaluateRoute(route, coverage)
}

type BaseReader = (file: string) => BaseRead

// DP-3/DP-5: um leitor seguro para allowlist E cobertura. Ausente ou lancando vira `unavailable` com
// razao — a consequencia (delta "tudo added", G2 indeterminada) e decidida por quem consome.
function safeBaseReader(readAtBase: AuditOptions['readAtBase']): BaseReader {
  return (file) => {
    if (readAtBase === undefined) return { status: 'unavailable', reason: 'sem leitor da base (readAtBase ausente)' }
    try {
      return readAtBase(file)
    } catch (error) {
      return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }
    }
  }
}

type AllowlistAtBase = { status: 'resolved'; entries: AllowlistEntry[] } | { status: 'unavailable'; reason: string }

/** Le a allowlist na base UMA vez; `delta` (Plano 02) e `allowlistBefore` (G2) derivam daqui. */
function readAllowlistAtBase(read: BaseReader): AllowlistAtBase {
  const result = read(PUBLIC_ROUTES_FILE)
  if (result.status === 'unavailable') return { status: 'unavailable', reason: result.reason }
  if (result.status === 'absent') return { status: 'resolved', entries: [] }
  return { status: 'resolved', entries: parsePublicRoutes(result.source, `${PUBLIC_ROUTES_FILE}@base`).entries }
}

// Substitui `computeAllowlistDelta`. Mesma saida dos 6 testes de CA-07 — so a leitura saiu para fora.
function toAllowlistDelta(current: AllowlistEntry[], base: AllowlistAtBase): AllowlistDelta {
  if (base.status === 'unavailable') {
    return { before: 'unavailable', added: current, removed: [], reason: `base do diff indisponivel: ${base.reason} — delta assume tudo como novo` }
  }
  return { before: 'resolved', ...diffAllowlist(base.entries, current) }
}

/** DP-1: arquivos de cobertura (o adaptador decide) e depois a allowlist. Vazio = G2 nao disparou. */
function resolveG2Sources(adapter: RouteAdapter, changed: Set<string>): string[] {
  const coverageFiles = [...changed].filter((file) => adapter.isCoverageFile?.(file) ?? false).sort()
  return changed.has(PUBLIC_ROUTES_FILE) ? [...coverageFiles, PUBLIC_ROUTES_FILE] : coverageFiles
}

type BeforeState =
  | { kind: 'resolved'; coverage: CoverageMap; allowlist: AllowlistEntry[] }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'not-applicable'; reason: string }

// DP-2/DP-3. O que NAO esta no diff e igual nas duas pontas — nao se le a base a toa.
function reconstructBefore(
  adapter: RouteAdapter,
  read: BaseReader,
  coverageTouched: boolean,
  after: { coverage: CoverageMap; allowlist: AllowlistEntry[] },
  allowlistBase: AllowlistAtBase | null,
): BeforeState {
  if (adapter.isCoverageFile === undefined || adapter.readCoverageAtBase === undefined) {
    return { kind: 'not-applicable', reason: `adaptador ${adapter.stack} sem suporte a G2 (isCoverageFile/readCoverageAtBase ausentes)` }
  }
  const coverage = coverageTouched ? adapter.readCoverageAtBase(read) : after.coverage
  if (isCoverageUnavailable(coverage)) return { kind: 'unavailable', reason: coverage.unavailable }
  if (allowlistBase !== null && allowlistBase.status === 'unavailable') return { kind: 'unavailable', reason: allowlistBase.reason }
  return { kind: 'resolved', coverage, allowlist: allowlistBase === null ? after.allowlist : allowlistBase.entries }
}

function toG2Summary(sources: string[], before: BeforeState): G2Summary {
  return {
    triggered: sources.length > 0,
    sources,
    before: before.kind,
    lost: 0,            // fase-02
    indeterminate: 0,   // fases 02/03
    ...(before.kind === 'resolved' ? {} : { reason: before.reason }),   // G3
  }
}

export type AuditSummary = {
  // ...campos existentes...
  g2: G2Summary   // novo (DP-7) — obrigatorio: sempre computado
}

export function auditRouteCoverage(targetDir: string, opts: AuditOptions): AuditResult {
  const adapter: RouteAdapter = nextjsAdapter   // fase-03: `opts.adapter ?? nextjsAdapter` (G14)
  const routes = adapter.enumerate(targetDir)
  const coverage = opts.coverageOverride ?? adapter.readCoverage(targetDir)
  const notes = [...coverage.notes]

  const changed = new Set(opts.changedFiles ?? [])
  const g1 = routes.filter((route) => changed.has(route.file))
  if (changed.size === 0) notes.push('escopo G1 vazio: nenhum arquivo de rota no diff')
  else if (g1.length === 0) notes.push('escopo G1 sem rotas: o diff nao tocou arquivo de rota')   // DP-7: g2 fala por si

  const allowlist = readPublicRoutes(targetDir)
  const read = safeBaseReader(opts.readAtBase)

  // DP-3: base da allowlist lida UMA vez — delta (Plano 02) e allowlistBefore (G2) saem dela.
  const allowlistChanged = changed.has(PUBLIC_ROUTES_FILE)
  const allowlistBase = allowlistChanged ? readAllowlistAtBase(read) : null
  const delta = allowlistBase === null ? undefined : toAllowlistDelta(allowlist.entries, allowlistBase)

  // DP-1/DP-2: gatilho G2 e ponta antes. O loop rota a rota e a fase-02.
  const g2Sources = resolveG2Sources(adapter, changed)
  const coverageTouched = g2Sources.some((file) => file !== PUBLIC_ROUTES_FILE)
  const before = reconstructBefore(adapter, read, coverageTouched, { coverage, allowlist: allowlist.entries }, allowlistBase)
  if (before.kind === 'resolved' && coverageTouched) notes.push(...before.coverage.notes)   // DP-6/G9: notas da base
  if (before.kind !== 'resolved') notes.push(`G2: ${before.reason}`)

  const verdicts = g1.map((route) => verdictFor(route, coverage, allowlist.entries))
  // findings / sort / allowlistFindings: inalterados
  return {
    // ...
    summary: {
      // ...campos existentes, com `changed: allowlistChanged, ...(delta !== undefined ? { delta } : {})` na allowlist...
      g2: toG2Summary(g2Sources, before),
    },
  }
}
```

### Passo 6: Teste de `verdictFor` (import novo — passo separado, G5)

So DEPOIS do Passo 5 compilar: acrescentar `verdictFor` ao import de `./route-auth-matrix` e:

```ts
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
```

### Passo 7: Manifest

`bun run generate:manifest` — `route-auth-matrix.ts`, `route-auth-matrix.types.ts` e `route-auth-nextjs.ts`
sao rastreados (G2). O agente NAO muda nesta fase.

---

## Gotchas

- **G1 do plano:** nenhuma fixture com `middleware.ts`. A ponta antes e `middlewareSource(...)` pelo seam;
  a ponta depois e a fixture `nextjs-minimal` (matcher `/dashboard/:path*`) ou `coverageOverride`.
- **G5 do plano (GT-fase02-1):** o Passo 1 nao importa valor novo (`BaseRead` e type-only) — RED honesto
  com o modulo carregando. Passos 2 e 6 importam simbolos novos — RED de compilacao aceito, defesa
  provada no RED-check.
- **G6 do plano:** `MIDDLEWARE_AT_BASE = 'middleware.ts@base'` vai em `file` das regras E em `sources`.
  `evaluateRoute` usa `rule.file:rule.line` na evidence de `coberta` — e assim que "antes" fica legivel
  no finding da fase-02.
- **G9 do plano:** base com middleware SEM matcher devolve `/:path*` (proxy G13). Se o HEAD estreitou,
  TODAS as rotas fora do matcher novo vao sair como perdidas na fase-02 — correto, mas a nota de proxy
  precisa estar em `summary.notes` (por isso `notes.push(...before.coverage.notes)` so quando
  `coverageTouched`; sem o guard, as notas do `coverage` atual entrariam duas vezes).
- **G15 do plano:** `isCoverageUnavailable` e o unico jeito de estreitar `CoverageAtBase`. Nao usar `as`;
  nao usar `'rules' in x` (fragil se `{ unavailable }` ganhar campo).
- **G16 do plano:** `safeBaseReader` e criado UMA vez e passado para `readAllowlistAtBase` e para
  `adapter.readCoverageAtBase`. O teste conta chamadas por arquivo.
- **G17 do plano:** `isNextjsCoverageFile('src/middleware.ts') === false` porque `readNextjsCoverage` nao
  le `src/`. Se um dia ler, os dois mudam juntos — o teste `recognizes only the root middleware.ts` e o
  lembrete.
- **G19 do plano:** `bun run typecheck` fica vermelho entre o Passo 1 e o Passo 5 (`summary.g2` nao
  existe). Esperado; nao declarar o tipo antes do RED.
- **G21 do plano:** os 6 testes de CA-07 passam a disparar G2 (allowlist no diff). Com base `{"routes":[]}`
  ou `absent`, `allowlistBefore` e vazia e nada muda no que eles afirmam. Rodar o arquivo inteiro, nao so
  o `-t`.
- **Local — forma do RED no Passo 1:** `summary.g2` nao existe, entao `summary.g2.triggered` lanca
  `TypeError: undefined is not an object (evaluating 'summary.g2.triggered')` — falha honesta em runtime
  (o modulo carregou; o campo e que nao existe), nao erro de compilacao. O teste `leaves G2 untriggered`
  da RED por assertion pura (`toEqual` contra `undefined`). Nao "consertar" com `summary.g2?.` — depois
  do GREEN o campo e obrigatorio e o `?.` mentiria sobre o tipo.
- **Local — `computeAllowlistDelta` desaparece:** nao deixar a funcao antiga ao lado da nova
  (`grep -n computeAllowlistDelta` deve dar vazio). A mensagem do ramo `readAtBase ausente` muda de
  `sem leitor da base (readAtBase ausente) — delta assume tudo como novo` para
  `base do diff indisponivel: sem leitor da base (readAtBase ausente) — delta assume tudo como novo`; o
  teste `reports unavailable when no base reader was given` afirma so `toContain('readAtBase')` e continua
  verde.
- **Local — `before.kind === 'resolved'` quando NAO disparou:** e verdade (nada de cobertura mudou; a ponta
  antes E a depois). `reconstructBefore` nao chama `read` nesse caso — `coverageTouched === false` e
  `allowlistBase === null`. O teste `leaves G2 untriggered` fixa o shape exato (sem `reason`).
- **Local — `adapter.isCoverageFile?.(file) ?? false`:** chamada opcional inline, nao
  `const f = adapter.isCoverageFile; f(file)` — desacoplar o metodo do objeto perderia `this` num
  adaptador que dependa dele (o Next nao depende, mas o contrato e para quatro stacks).

---

## Verificacao

### TDD

- [ ] **RED 1 (motor, Passo 1):** 5 testes escritos e FALHAM sem tocar producao
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'gatilho G2'`
  - Resultado esperado: `5 fail` — `leaves G2 untriggered` com `Expected: {...}, Received: undefined`;
    os outros com `TypeError: undefined is not an object (evaluating 'summary.g2.triggered')` (campo
    inexistente — falha honesta em runtime, modulo carregado). Os 33 preexistentes: `33 pass`.

- [ ] **RED 2 (adaptador, Passo 2):** arquivo de teste recusado por import inexistente
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts`
  - Resultado esperado: `SyntaxError: Export named 'isNextjsCoverageFile' not found` (RED de
    compilacao — G5; a defesa e provada no RED-check abaixo)

- [ ] **GREEN:** Passos 3–6 implementados, tudo PASSA
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `39 pass, 0 fail` (33 + 5 de `summary.g2` + 1 de `verdictFor`)
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts`
  - Resultado esperado: `39 pass, 0 fail` (34 + 5)
  - Se a contagem real diferir, registrar no MEMORY (Metricas).

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `reflects an unavailable base in summary.g2.before with the reason` FALHOU
      antes da defesa — base ilegivel virando `resolved` (ou sumindo) e o modo de falha silencioso que o PRD
      proibe ("nunca silencio"). `reads each base file once` tambem falhou antes — duas leituras da mesma
      base podem divergir, e a segunda seria invisivel
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'unavailable base in summary.g2|reads each base file once'`
  - Resultado esperado no RED: `TypeError ... summary.g2.before` / `... summary.g2.sources`
- [ ] **CAs cobertos:** nenhum CA fecha nesta fase — ela prepara CA-09 (fase-02) e RF-04/CA-10 estendidos ao
      G2 (fase-03). O que ela garante: `summary.g2.before` nunca e `resolved` com base ilegivel
      (`-t 'unavailable base in summary.g2'`), e `absent` no adaptador nunca vira `unavailable` nem regra
      inventada (`bun test skills/security/lib/route-auth-nextjs.test.ts -t 'ponta antes'`)
- [ ] **`coberta` nunca nasce da ponta antes:** `readNextjsCoverageAtBase` so devolve o que
      `parseMatcherConfig` le do texto; `absent` devolve `rules: []`; `unavailable` devolve `{ unavailable }`
      — nenhum ramo fabrica regra
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** Nenhum `middleware.ts` nem
      `anti-vibe.public-routes.json` de projeto algum foi criado ou editado por esta fase; os textos de
      middleware vivem so em memoria de teste
- [ ] Nenhum secret literal entrou no codigo; `readNextjsCoverageAtBase` nao loga `source`

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) fazer `isNextjsCoverageFile`
      devolver `false` sempre → `flags G2 as triggered` FALHA com `Expected: true, Received: false` e
      `reads each base file once` FALHA em `calls.get('middleware.ts')` (`Received: undefined`); restaurar.
      (2) Em `reconstructBefore`, trocar o retorno do ramo `isCoverageUnavailable` por
      `{ kind: 'resolved', coverage: after.coverage, allowlist: after.allowlist }` → `reflects an
      unavailable base` FALHA com `Expected: "unavailable", Received: "resolved"`; restaurar. (3) Dentro de
      `reconstructBefore`, chamar `readAllowlistAtBase(read)` uma segunda vez → `reads each base file once`
      FALHA com `Expected: 1, Received: 2`; restaurar. (4) No adaptador, trocar `MIDDLEWARE_AT_BASE` por
      `MIDDLEWARE_FILE` em `sources` → `rebuilds the base coverage ... @base-suffixed` FALHA; restaurar.
      (5) No ramo `absent` do adaptador, devolver `{ unavailable: 'ausente' }` → `treats middleware.ts absent
      at the base as no coverage` FALHA; restaurar.
- [ ] `grep -n "computeAllowlistDelta" skills/security/lib/route-auth-matrix.ts` → vazio
- [ ] `grep -n "cobertura perdida e o Plano 03" skills/security/lib/route-auth-matrix.ts` → vazio (DP-7)
- [ ] `grep -n "matchAllowlist(" skills/security/lib/route-auth-matrix.ts` → 1 ocorrencia (dentro de
      `verdictFor`) — o map do G1 nao repete a logica
- [ ] `grep -n "switch" skills/security/lib/route-auth-matrix.ts skills/security/lib/route-auth-nextjs.ts` → vazio
- [ ] `grep -n " as " skills/security/lib/route-auth-matrix.ts skills/security/lib/route-auth-nextjs.ts skills/security/lib/route-auth-matrix.types.ts` → so os `as const` preexistentes
- [ ] Refatoracao do delta preservou o Plano 02:
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-07|removed entries|absent at the base|never stays silent when the base is unavailable|no base reader|changed=false'` → `6 pass`
- [ ] CLI contra o repo do plugin: `bun skills/security/lib/route-auth-matrix.ts . --ref main` devolve
      `summary.g2: { triggered: false, sources: [], before: "resolved", lost: 0, indeterminate: 0 }` (o
      repo nao tem `middleware.ts` nem allowlist) e nenhum `blocked`
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G2) — 3 arquivos rastreados
- [ ] `bun run agents:contract` verde (o agente nao mudou; confirma que nada quebrou por tabela)
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G19)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G12)
- [ ] **GT-fase02-1 aplicada:** Passo 1 sem import de valor novo (RED por runtime/assertion); Passos 2 e 6
      com imports novos em passo separado — registrar no MEMORY se a ordem real divergiu
- [ ] MEMORY.md: contagem real de testes (se diferir de 39/39), DI/BUG/GT desta fase; Metricas (fases
      concluidas: 1)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'gatilho G2|verdictFor'` retorna `6 pass`
- `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'ponta antes'` retorna `5 pass`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning
- `bun skills/security/lib/route-auth-matrix.ts . --ref main` imprime `summary.g2` com `triggered: false`

**Por humano:**
- Num projeto Next.js real, num branch que edita `middleware.ts`, `/anti-vibe-coding:security` mostra em
  `reasoning` que a lib devolveu `summary.g2.triggered: true` com `sources: ["middleware.ts"]` e
  `before: "resolved"` (ainda sem finding G2 — e a fase-02) — **pendente de sync do cache do plugin
  (G1)**; registrar como divida, nao como falha

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
