<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Parser da Allowlist Fail-Closed

**Plano:** 02 — Allowlist e veredictos completos
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase deste plano; Plano 01 completo)
**Visual:** false

---

## O que esta fase entrega

`anti-vibe.public-routes.json` na raiz do projeto auditado passa a ser lido por um parser puro e
fail-closed; rota cujo `path` casa exatamente uma entrada valida recebe `publica-declarada` ANTES do
motor e nao vira finding (CA-03); entrada sem `reason` e recusada, listada em `summary.allowlist.rejected`,
e a rota volta ao motor (CA-04b); o finding DESCOBERTA passa a dizer que a rota tambem "nao esta declarada
publica" (RF-05).

**DP aplicadas:** DP-1, DP-2, DP-4 (parte: `reason` obrigatorio, `path` invalido — duplicata e fase-02),
DP-5, DP-6, DP-7, DP-8 (sem `changed`/`delta`), DP-9 (so a declaracao `allowlistFindings: []`), DP-13
(fixture `nextjs-allowlist`), DP-14.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/public-routes-allowlist.test.ts` | Create (PRIMEIRO — G16) | Testes do parser puro, da leitura na raiz e do match exato |
| `skills/security/lib/public-routes-allowlist.ts` | Create | `PUBLIC_ROUTES_FILE`, `normalizePath`, `parsePublicRoutes`, `readPublicRoutes`, `matchAllowlist` |
| `skills/security/lib/route-auth-matrix.types.ts` | Modify (ADITIVO) | `AllowlistEntry`, `RejectedEntry`, `AllowlistFinding`, `AllowlistParseResult`; `export` em `isRecord` |
| `skills/security/lib/route-auth-matrix.ts` | Modify | allowlist antes do motor; `AuditSummary.publicaDeclarada` + `.allowlist`; `AuditResult.allowlistFindings: []`; texto DP-14 |
| `skills/security/lib/route-auth-matrix.test.ts` | Modify | CA-03 (x2), CA-04b, allowlist ausente; assercao nova em CA-01 |
| `tests/fixtures/route-auth-matrix/nextjs-allowlist/` | Create (dados) | `anti-vibe.public-routes.json` + `app/api/{health,webhooks/stripe,admin}/route.ts` — SEM `middleware.ts` (G1) |
| `agents/security-auditor.md` | Modify (ADITIVO — G9) | Secao 11: 3 bullets sobre allowlist, `publicaDeclarada`, `rejected` |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — lib nova, types, matrix, agente |

> Excecao de contagem declarada no README: fixture e dado, manifest e gerado.

---

## Implementacao

### Passo 1: Teste da lib PRIMEIRO — `public-routes-allowlist.test.ts`

O gate exige o teste em disco antes da lib (G16). Nomes finais; sem "should"; CA no nome.

```ts
// skills/security/lib/public-routes-allowlist.test.ts
// 2026-09-05 (Luiz/dev): Plano 02 fase-01 — parser puro sobre texto (mesmo desenho de parseMatcherConfig,
// DI-fase04-fixtures-inline): teste de parser nao precisa de I/O; a fixture em disco cobre so readPublicRoutes.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { PUBLIC_ROUTES_FILE, matchAllowlist, normalizePath, parsePublicRoutes, readPublicRoutes } from './public-routes-allowlist'
import type { Route } from './route-auth-matrix.types'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')
const FILE = PUBLIC_ROUTES_FILE
const src = (routes: unknown): string => JSON.stringify({ routes }, null, 2)
const route = (over: Partial<Route>): Route => ({ method: 'GET', path: '/x', file: 'app/x/route.ts', line: 1, stack: 'nextjs', ...over })

describe('parsePublicRoutes (DP-1 — fail-closed)', () => {
  // JSON.stringify(..., 2) poe "path" na linha 4 — diferente da fixture (linha 3): prova que a linha
  // vem do TEXTO (DP-5), nao de posicao fixa.
  it('accepts an entry with path and reason and records the line of its path', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'probe do load balancer' }]), FILE)
    expect(result.entries).toEqual([{ path: '/api/health', reason: 'probe do load balancer', file: FILE, line: 4 }])
    expect(result.rejected).toEqual([])
  })

  it('CA-04b: rejects an entry without reason, keeps the others and points at its line', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'ok' }, { path: '/api/admin' }]), FILE)
    expect(result.entries.map((e) => e.path)).toEqual(['/api/health'])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.path).toBe('/api/admin')
    expect(result.rejected[0]?.line).toBe(8)
    expect(result.rejected[0]?.reason).toContain('reason')
  })

  it('rejects a reason made only of whitespace', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: '   ' }]), FILE)
    expect(result.entries).toEqual([])
    expect(result.rejected[0]?.reason).toContain('reason')
  })

  it('rejects a path that is not a string or does not start with a slash', () => {
    const result = parsePublicRoutes(src([{ path: 42, reason: 'x' }, { path: 'api/x', reason: 'x' }]), FILE)
    expect(result.entries).toEqual([])
    expect(result.rejected.map((r) => r.path)).toEqual([undefined, 'api/x'])
  })

  it('accepts nothing when the JSON is invalid and says why', () => {
    const result = parsePublicRoutes('{ "routes": [', FILE)
    expect(result.entries).toEqual([])
    expect(result.notes.join(' ')).toContain('JSON invalido')
  })

  it('accepts nothing when the top level is an array or routes is missing or not an array', () => {
    for (const bad of ['[]', '{}', '{ "routes": {} }', '{ "public": [] }']) {
      const result = parsePublicRoutes(bad, FILE)
      expect(result.entries).toEqual([])
      expect(result.notes.join(' ')).toContain('routes')
    }
  })
})

describe('readPublicRoutes (raiz do projeto — PRD Decisao 7)', () => {
  it('reports present=false and zero entries when the file is absent — never "anything goes"', () => {
    const result = readPublicRoutes(join(FIXTURES, 'nextjs-minimal'))
    expect(result.present).toBe(false)
    expect(result.entries).toEqual([])
    expect(result.notes.join(' ')).toContain('nenhuma rota declarada publica')
  })

  it('reads the fixture allowlist and rejects its reason-less entry at line 5', () => {
    const result = readPublicRoutes(join(FIXTURES, 'nextjs-allowlist'))
    expect(result.present).toBe(true)
    expect(result.entries.map((e) => e.path)).toEqual(['/api/health', '/api/webhooks/stripe'])
    expect(result.rejected.map((r) => r.line)).toEqual([5])
  })
})

describe('matchAllowlist (DP-2 — igualdade exata, so barra final normalizada)', () => {
  const entries = parsePublicRoutes(src([{ path: '/api/health/', reason: 'lb' }, { path: '/api/users/[id]', reason: 'perfil publico' }]), FILE).entries

  it('matches the exact path for any method', () => {
    expect(matchAllowlist(route({ path: '/api/health' }), entries)?.path).toBe('/api/health/')
    expect(matchAllowlist(route({ method: 'POST', path: '/api/health' }), entries)).not.toBeNull()
  })

  it('does not match a prefix, a parent or a sibling path', () => {
    expect(matchAllowlist(route({ path: '/api' }), entries)).toBeNull()
    expect(matchAllowlist(route({ path: '/api/health/live' }), entries)).toBeNull()
  })

  // 2026-09-05 (Luiz/dev): `[id]` e o path como o Next o escreve (Route.path, fase-02 do Plano 01) —
  // literal valido, casa UMA rota do contrato. `:id` e outra historia (fase-02 deste plano, G13).
  it('treats a Next dynamic segment as a literal path', () => {
    expect(matchAllowlist(route({ path: '/api/users/[id]' }), entries)?.reason).toBe('perfil publico')
  })

  it('normalizes only the trailing slash', () => {
    expect(normalizePath('/api/health/')).toBe('/api/health')
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('/API/Health')).toBe('/API/Health')
  })
})
```

Neste ponto: `bun test skills/security/lib/public-routes-allowlist.test.ts` falha por **modulo
inexistente** — isso e o RED de compilacao esperado ANTES da lib existir; o RED por assertion desta
fase e o CA-03 do Passo 6 (ver Verificacao).

### Passo 2: Tipos — ADITIVO em `route-auth-matrix.types.ts`

Nenhum campo existente renomeado. `isRecord` ja existe (privado): acrescentar `export` — reuso, nao
duplicacao.

```ts
// route-auth-matrix.types.ts — acrescentar ao final, antes dos type guards
// 2026-09-05 (Luiz/dev): Plano 02 — allowlist versionada (PRD RF-02, Decisoes 3 e 7). Tudo aditivo:
// o contrato de Route/CoverageRule/RouteFinding esta congelado desde a fase-02 do Plano 01.

/** Entrada ACEITA. `file`/`line` apontam para a declaracao — RF-05 vale para ela tambem. */
export type AllowlistEntry = { path: string; reason: string; file: string; line: number }

/** Entrada recusada pelo parser (DP-4). Sem finding proprio: a rota volta ao motor (CA-04b). */
export type RejectedEntry = { path?: string; line: number; reason: string }

/**
 * Finding sobre a PROPRIA allowlist — nao ha `route`, por isso nao e RouteFinding (DP-9).
 * Nesta fase o tipo existe e ninguem o produz: `AuditResult.allowlistFindings` e sempre `[]`.
 * A fase-02 (DP-3) passa a produzi-lo para entrada ampla; declarar aqui faz o RED dela ser
 * assertion (`Expected length: 1, Received length: 0`), nao erro de compilacao.
 */
export type AllowlistFinding = { path: string; file: string; line: number; severity: IssueSeverity; description: string }

export type AllowlistParseResult = {
  entries: AllowlistEntry[]
  rejected: RejectedEntry[]
  /** Fase-02 preenche. Aqui sempre `[]`. */
  wide: AllowlistFinding[]
  notes: string[]
}

export function isRecord(value: unknown): value is Record<string, unknown> { /* ja existe — so exportar */ }
```

### Passo 3: A lib — `public-routes-allowlist.ts`

Stack-agnostica: importa so de `route-auth-matrix.types`, NUNCA do adaptador Next. `lineOf` (4 linhas)
e copiado, nao importado de `route-auth-nextjs.ts`.

```ts
// skills/security/lib/public-routes-allowlist.ts
// 2026-09-05 (Luiz/dev): allowlist de rotas publicas — PRD RF-02, Decisoes 3 e 7; Plano 02 fase-01.
// Parser PURO sobre texto (como parseMatcherConfig): sem I/O, sem parser JSON proprio (DP-5), fail-closed.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AllowlistEntry, AllowlistParseResult, RejectedEntry, Route } from './route-auth-matrix.types'
import { isRecord } from './route-auth-matrix.types'

// Raiz do projeto auditado, nao `.anti-vibe/` — que e gitignored (.gitignore:62) e tornaria a
// declaracao invisivel ao review (PRD Decisao 7).
export const PUBLIC_ROUTES_FILE = 'anti-vibe.public-routes.json'

/** Barra final e a UNICA normalizacao (DP-2, G7). `/` permanece `/`. */
export function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function lineOf(source: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i += 1) if (source[i] === '\n') line += 1
  return line
}

// DP-5: JSON.parse perde posicao. Procura a N-esima ocorrencia textual de `"path": "<literal>"`
// (N = quantas vezes esse path ja apareceu) para a duplicata (fase-02) apontar a PROPRIA linha.
function locateEntryLine(source: string, path: string, occurrence: number): number | null {
  const literal = JSON.stringify(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`"path"\\s*:\\s*${literal}`, 'g')
  let seen = 0
  for (const match of source.matchAll(re)) {
    if (match.index === undefined) continue
    if (seen === occurrence) return lineOf(source, match.index)
    seen += 1
  }
  return null
}

type EntryCheck = { rejects: (entry: Record<string, unknown>) => boolean; reason: string }

// Listas, nao switch (CLAUDE.md). Duas listas de proposito: a fase-02 insere a checagem de
// amplitude ENTRE elas (entrada ampla e finding mesmo sem reason — amplitude e o sinal mais forte).
const PATH_CHECKS: readonly EntryCheck[] = [
  { rejects: (e) => typeof e.path !== 'string', reason: 'path ausente ou nao e string' },
  { rejects: (e) => typeof e.path === 'string' && !e.path.startsWith('/'), reason: 'path precisa comecar com /' },
]
const REASON_CHECKS: readonly EntryCheck[] = [
  {
    rejects: (e) => typeof e.reason !== 'string' || e.reason.trim().length === 0,
    reason: 'reason ausente ou vazio — toda rota publica precisa de justificativa (PRD RF-02)',
  },
]

const empty = (note: string): AllowlistParseResult => ({ entries: [], rejected: [], wide: [], notes: [note] })

export function parsePublicRoutes(source: string, file: string): AllowlistParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    return empty(`${file}: JSON invalido — ${error instanceof Error ? error.message : String(error)}; nenhuma entrada aceita`)
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.routes)) {
    return empty(`${file}: shape invalido — esperado { "routes": [ { "path", "reason" } ] }; nenhuma entrada aceita`)
  }

  const entries: AllowlistEntry[] = []
  const rejected: RejectedEntry[] = []
  const notes: string[] = []
  const occurrences = new Map<string, number>()

  for (const raw of parsed.routes) {
    const record: Record<string, unknown> = isRecord(raw) ? raw : {}
    const path = typeof record.path === 'string' ? record.path : undefined
    const nth = path === undefined ? 0 : (occurrences.get(path) ?? 0)
    if (path !== undefined) occurrences.set(path, nth + 1)
    const located = path === undefined ? null : locateEntryLine(source, path, nth)
    if (located === null) notes.push(`${file}: linha da entrada ${path ?? '(sem path)'} nao localizada no texto — usando 1`)
    const line = located ?? 1

    const reject = (reason: string): void => {
      // G3: exactOptionalPropertyTypes — nunca `path: undefined`; spread condicional.
      rejected.push({ ...(path !== undefined ? { path } : {}), line, reason })
    }

    const badPath = PATH_CHECKS.find((c) => c.rejects(record))
    if (badPath !== undefined) { reject(badPath.reason); continue }
    // fase-02 insere aqui: if (isWideEntry(path)) { wide.push(wideFinding(...)); continue }
    const badReason = REASON_CHECKS.find((c) => c.rejects(record))
    if (badReason !== undefined) { reject(badReason.reason); continue }
    // fase-02 insere aqui: duplicata por normalizePath(path) → reject('path duplicado ...')

    const { reason } = record
    if (path === undefined || typeof reason !== 'string') continue // type guard — os checks ja garantem
    entries.push({ path, reason: reason.trim(), file, line })
  }

  return { entries, rejected, wide: [], notes }
}

export function readPublicRoutes(targetDir: string): AllowlistParseResult & { present: boolean } {
  const absolute = join(targetDir, PUBLIC_ROUTES_FILE)
  if (!existsSync(absolute)) {
    return {
      present: false,
      ...empty(`${PUBLIC_ROUTES_FILE} ausente — nenhuma rota declarada publica (fail-closed, PRD RF-02)`),
    }
  }
  return { present: true, ...parsePublicRoutes(readFileSync(absolute, 'utf8'), PUBLIC_ROUTES_FILE) }
}

/** DP-2: igualdade exata apos normalizar barra final; metodo nao entra. `null` = nao declarada. */
export function matchAllowlist(route: Route, entries: AllowlistEntry[]): AllowlistEntry | null {
  const target = normalizePath(route.path)
  return entries.find((entry) => normalizePath(entry.path) === target) ?? null
}
```

### Passo 4: Fixture `nextjs-allowlist` (dados — sem `middleware.ts`, G1)

Formato do JSON e **uma entrada por linha** — os testes afirmam `line: 3/4/5`. Sem `middleware.ts`,
`readNextjsCoverage` devolve `rules: []` e toda rota nao declarada e `DESCOBERTA` (Plano 01 fase-05).

```json
{
  "routes": [
    { "path": "/api/health", "reason": "probe do load balancer - sem sessao por definicao" },
    { "path": "/api/webhooks/stripe", "reason": "webhook assinado pelo Stripe; assinatura verificada no handler" },
    { "path": "/api/admin" }
  ]
}
```

```ts
// tests/fixtures/route-auth-matrix/nextjs-allowlist/app/api/health/route.ts
// 2026-09-05 (Luiz/dev): fixture CA-03 — declarada publica com reason. Sem import de next/* (G14).
export function GET() {
  return Response.json({ ok: true })
}
```

```ts
// tests/fixtures/route-auth-matrix/nextjs-allowlist/app/api/webhooks/stripe/route.ts
// 2026-09-05 (Luiz/dev): POST declarado publico — sem a allowlist seria critical (metodo mutante, D9).
export async function POST() {
  return new Response(null, { status: 204 })
}
```

```ts
// tests/fixtures/route-auth-matrix/nextjs-allowlist/app/api/admin/route.ts
// 2026-09-05 (Luiz/dev): fixture CA-04b — a entrada dela na allowlist nao tem reason; volta ao motor.
export function GET() {
  return Response.json({ admin: true })
}
```

### Passo 5: Encaixe em `auditRouteCoverage` (DP-6, DP-8, DP-9, DP-14)

`evaluateRoute` **nao muda**. O que muda e o `map` da linha 135 de `route-auth-matrix.ts` e os tipos
de saida.

```ts
// route-auth-matrix.ts — trechos
import { PUBLIC_ROUTES_FILE, matchAllowlist, readPublicRoutes } from './public-routes-allowlist'
import type { AllowlistFinding, RejectedEntry } from './route-auth-matrix.types'

export type AllowlistSummary = {
  file: string
  present: boolean
  accepted: number
  rejected: RejectedEntry[]
  wide: number          // fase-02 preenche; aqui 0
  notes: string[]
}

export type AuditSummary = {
  enumerated: number
  evaluated: number
  coberta: number
  publicaDeclarada: number   // novo (DP-8)
  descoberta: number
  indeterminada: number
  scope: 'diff'
  sources: string[]
  notes: string[]
  allowlist: AllowlistSummary // novo (DP-8)
}

export type AuditResult = {
  findings: RouteFinding[]
  /** DP-9. Sempre `[]` nesta fase — a fase-02 produz para entrada ampla. */
  allowlistFindings: AllowlistFinding[]
  verdicts: RouteVerdict[]
  summary: AuditSummary
}

// dentro de auditRouteCoverage, apos montar `evaluated`:
const allowlist = readPublicRoutes(targetDir)

// 2026-09-05 (Luiz/dev): DP-6 — allowlist ANTES do motor (PRD Decisao 3: coberta OU publica declarada).
// evaluateRoute nunca produz `publica-declarada`; quem casa a allowlist nem chega nele.
const verdicts = evaluated.map((route): RouteVerdict => {
  const declared = matchAllowlist(route, allowlist.entries)
  if (declared !== null) {
    return { route, verdict: 'publica-declarada', evidence: `${declared.file}:${declared.line} declara publica — ${declared.reason}` }
  }
  return evaluateRoute(route, coverage)
})

// summary — acrescentar:
publicaDeclarada: verdicts.filter((v) => v.verdict === 'publica-declarada').length,
allowlist: {
  file: PUBLIC_ROUTES_FILE,
  present: allowlist.present,
  accepted: allowlist.entries.length,
  rejected: allowlist.rejected,
  wide: allowlist.wide.length,
  notes: allowlist.notes,
},
// return — acrescentar `allowlistFindings: []` (fase-02 troca por allowlist.wide)
```

DP-14 em `toContractIssue` — a rota DESCOBERTA falhou nos DOIS caminhos, e a description diz os dois:

```ts
description:
  `${finding.verdict}: ${finding.route.method} ${finding.route.path} ` +
  `(${finding.route.file}:${finding.route.line}) sem cobertura de middleware e nao declarada publica em ${PUBLIC_ROUTES_FILE} — ${finding.missing}`,
```

### Passo 6: Testes em `route-auth-matrix.test.ts` (RED por assertion)

```ts
// acrescentar aos imports: toContractIssue
const ALLOWLIST = join(FIXTURES, 'nextjs-allowlist')

// em CA-01 (describe 'auditRouteCoverage — escopo G1'), acrescentar a assercao DP-14:
expect(findings.map(toContractIssue)[0]?.description).toContain('anti-vibe.public-routes.json')

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
```

### Passo 7: Agente — secao 11 (ADITIVO, G9)

Acrescentar apos o bullet "Cite `summary` em `reasoning`..." de `agents/security-auditor.md`:

```markdown
- A lib le `anti-vibe.public-routes.json` na RAIZ do projeto auditado (PRD Decisao 7 — fora de
  `.anti-vibe/`, que e gitignored). Cite em `reasoning` `summary.publicaDeclarada` e
  `summary.allowlist` (`present`, `accepted`, `rejected`). `present: false` significa "nenhuma rota
  declarada publica" (fail-closed) — nao e erro e nao se inventa allowlist.
- Cada item de `summary.allowlist.rejected` (`path`, `line`, `reason`) e uma entrada que o parser
  RECUSOU: a rota voltou ao motor e, se estiver aberta, o finding dela JA esta em `issues`. Liste as
  recusas em `reasoning` com a linha — quem escreveu a entrada precisa saber por que ela nao valeu.
- A allowlist e configuracao de seguranca do projeto auditado (PRD "Fronteiras de confianca"): voce
  le a saida da lib e NUNCA edita o arquivo (regra "NUNCA modifique arquivos").
```

### Passo 8: Manifest

`bun run generate:manifest` — lib nova, `route-auth-matrix.types.ts`, `route-auth-matrix.ts` e
`agents/security-auditor.md` sao rastreados. Revisar o diff pelo checksum (G2).

---

## Gotchas

- **G1 do plano:** a fixture NAO tem `middleware.ts` — e isso e o desenho, nao uma falta. Sem
  middleware, `rules: []` e o motor da `DESCOBERTA` a tudo que nao esta declarado; e o cenario puro de
  allowlist. Se alguem sentir falta de "cobertura + allowlist" no mesmo teste, usar `coverageOverride`.
- **G3 do plano:** `RejectedEntry.path` e opcional — `{ path: undefined, ... }` quebra o `tsc` com
  `exactOptionalPropertyTypes`. Spread condicional, como no snippet.
- **G4 do plano:** `result.rejected[0]?.line`, `verdicts[0]?.evidence`, `match.index === undefined` —
  nunca `!`.
- **G5 do plano:** a linha vem do texto. `JSON.stringify(path)` produz `"/api/health"`, que e como
  99% dos arquivos escrevem; `/` ou `\/` nao casam e caem no fallback linha 1 + nota. Aceito.
- **G7 do plano:** `normalizePath` so tira barra final. `/API/Health` nao casa `/api/health` — e o
  comportamento correto no Next em Linux.
- **G17 do plano:** entre o Passo 6 e o Passo 5 concluido, `bun run typecheck` reclama de
  `summary.publicaDeclarada` inexistente. Esperado; rodar o `tsc` depois do GREEN.
- **Local — ordem `readPublicRoutes` antes de `evaluated`:** a allowlist e lida UMA vez por auditoria,
  fora do `map`. Ler dentro do `map` seria N leituras do mesmo arquivo — e o teste nao pegaria.
- **Local — `matchAllowlist` recebe `Route`, nao `string`:** a assinatura ja leva `route` inteiro
  embora so use `path` hoje. E deliberado (DP-7): o Plano 04 pode precisar de `route.stack` se a G13
  virar regra por stack, sem quebrar chamadores.
- **Local — `allowlistFindings: []` e `wide: []` sao declaracoes vazias de proposito** (DP-9). Nao
  "aproveitar" para implementar amplitude aqui — o RED da fase-02 depende de estar vazio.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-03: emits nothing'`
  - Resultado esperado: `Expected length: 0, Received length: 1` (a rota `/api/health` sai DESCOBERTA
    porque `auditRouteCoverage` ainda nao consulta a allowlist)
  - RED secundario (DP-14): `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-01:'` →
    `Expected: ... toContain "anti-vibe.public-routes.json"` falha sobre a description atual

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/security/lib/public-routes-allowlist.test.ts`
  - Resultado esperado: `12 pass, 0 fail`
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `20 pass, 0 fail` (16 existentes + 4 novos)

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `CA-04b: rejects an entry without reason, keeps the others and points
      at its line` FALHOU antes do parser recusar (o abuso e declarar `/api/admin` publica sem
      justificativa e a declaracao valer — PRD RF-02 "entrada sem razao e recusada")
  - Comando: `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'CA-04b'`
  - Resultado esperado no RED (com `REASON_CHECKS` vazio para simular): `Expected: ["/api/health"],
    Received: ["/api/health", "/api/admin"]`
- [ ] **CA-03:** Dado a rota listada na allowlist, quando o auditor roda, entao nenhum finding e
      emitido e o relatorio a contabiliza como `publica-declarada` — verificado por
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-03'` (2 testes)
- [ ] **CA-04b:** Dado uma entrada sem `reason`, quando o auditor le o arquivo, entao recusa a entrada
      e a rota volta a ser avaliada como se nao estivesse declarada — verificado por
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-04b'` e
      `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'CA-04b'`
- [ ] **Fail-closed em todo caminho de erro:** JSON invalido, shape errado e arquivo ausente devolvem
      zero entradas COM nota — `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'accepts nothing|present=false'`
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A fase le a allowlist do projeto
      auditado e nao a escreve; a decisao "essa rota e publica" continua sendo de quem versiona o arquivo
- [ ] Nenhum secret literal entrou no codigo ou na fixture (os `reason` da fixture sao prosa)

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, comentar a chamada a `matchAllowlist`
      no `map` (deixar so `evaluateRoute`) → `-t 'CA-03: emits nothing'` FALHA com `Received length: 1`;
      restaurar. Depois reverter a description de `toContractIssue` para o texto antigo → `-t 'CA-01:'`
      FALHA em `toContain`; restaurar. Depois esvaziar `REASON_CHECKS` → `-t 'CA-04b'` FALHA nos dois
      arquivos; restaurar. Cada teste tem de cair pela SUA defesa.
- [ ] `grep -n "switch" skills/security/lib/public-routes-allowlist.ts` → vazio (listas/hash map)
- [ ] `grep -nE " as [A-Z]| as const" skills/security/lib/public-routes-allowlist.ts` → so `as const`, se houver
- [ ] `grep -n "route-auth-nextjs" skills/security/lib/public-routes-allowlist.ts` → vazio (stack-agnostica)
- [ ] `ls tests/fixtures/route-auth-matrix/nextjs-allowlist/` NAO contem `middleware.ts` (G1)
- [ ] `git diff agents/security-auditor.md` e so adicao (G9); secao 11 cita `publicaDeclarada` e `rejected`
- [ ] `bun run generate:manifest` sem warning; diff do manifest revisado pelo checksum (G2)
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G17)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G11) — um comando por vez, saida lida ate o fim
- [ ] MEMORY.md: DI para qualquer ajuste de linha/formatacao da fixture; contagem real de testes se
      diferir de 12/20

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/public-routes-allowlist.test.ts` retorna `0 fail`
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-03|CA-04b'` retorna `3 pass`
- `bun test skills/security/lib/` retorna `0 fail` (71 existentes + novos)
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning
- CLI contra a fixture nao e possivel (nao e repo git → `blocked`, comportamento esperado do Plano 01);
  a cobertura de ponta a ponta vem de `auditRouteCoverage` nos testes

**Por humano:**
- Num projeto Next.js real com `anti-vibe.public-routes.json` declarando `/api/health` com `reason` e
  um `route.ts` novo em `app/api/health/`, `/anti-vibe-coding:security` NAO emite `ROUTE-*` para ela e
  o `reasoning` cita `publicaDeclarada: 1` — **pendente de sync do cache do plugin (G12)**; registrar como
  divida no MEMORY, nao como falha desta fase

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
