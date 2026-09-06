<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Delta e Veredito — Cobertura Perdida

**Plano:** 03 — G2: cobertura perdida
**Sizing:** 1.5h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

O conjunto G2 passa a existir: toda rota cujo arquivo NAO esta no diff, que era `coberta`, `publica-declarada`
ou `indeterminada` na ponta ANTES (`reconstructBefore` da fase-01) e esta `DESCOBERTA` ou `indeterminada` na
ponta DEPOIS (sem contar o par indeterminada → indeterminada; `indeterminada` antes vira `indeterminada` G2 — DP-4
emendada) entra em `verdicts`/`findings` com `trigger: 'G2'`, a MESMA regra de severidade (D9) e a
MESMA emissao (D8) do G1. A `evidence`/`missing` leva as duas pontas
(`cobertura perdida — antes: <evidenceBefore>; agora: <evidenceAfter>`), `toContractIssue` prefixa
`[cobertura perdida] ` na description, `summary.g2.lost`/`indeterminate` deixam de ser `0` fixo e
`summary.evaluated` passa a contar G1 + G2. Um diff que so estreita o `config.matcher`, apaga o
`middleware.ts` ou tira uma entrada da allowlist deixa de passar em silencio — CA-09 fecha aqui. A ponta
antes irreconstruivel (`before !== 'resolved'`) continua sem consequencia por rota nesta fase; e a fase-03.

**DP aplicadas:** DP-4 (conjunto G2, `trigger?`, evidence com as duas pontas, prefixo), DP-7 (fecha:
`lost`/`indeterminate` reais, `evaluated` = G1 + G2), DP-8 (bullets a/b no agente + a UNICA correcao
permitida pelo G13), DP-9 (CA-09 sem fixture nova), DP-10 (ordenacao e ids inalterados). DP-6 (parte:
middleware DELETADO no diff — G7 do README; o teste vem para esta fase porque e so mais um caso do mesmo
loop e nao depende de nada da fase-03).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-matrix.test.ts` | Modify (PRIMEIRO) | 7 testes novos em `describe` proprio (CA-09, description, allowlist removida, middleware deletado, G8/DP-10, alargamento, base indeterminada → DESCOBERTA) + reescrita de 2 assercoes do teste `flags G2 as triggered` da fase-01. SEM import de valor novo — RED por assertion em tudo (G5) |
| `skills/security/lib/route-auth-matrix.types.ts` | Modify (ADITIVO) | `AuditTrigger`; `trigger?` em `RouteVerdict` e `RouteFinding` |
| `skills/security/lib/route-auth-matrix.ts` | Modify | `LOST_FROM`/`OPEN_NOW`; `lostCoverage`; `g2Verdicts`; G1 com `trigger: 'G1'`; `trigger` propagado para findings; `TRIGGER_PREFIX` em `toContractIssue`; `toG2Summary` com `lost`/`indeterminate` reais; `evaluated` = G1 + G2; JSDoc |
| `agents/security-auditor.md` | Modify (ADITIVO — G13, com a UNICA correcao permitida) | Secao 11: bullets (a) e (b) da DP-8; bullet stale `delta.removed ... o G2 (Plano 03) fecha` corrigido no lugar |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — types, matrix, agente |

4 arquivos + manifest gerado — dentro do limite de 5. `route-auth-nextjs.ts` NAO muda nesta fase.

---

## Implementacao

### Passo 1: Testes PRIMEIRO — CA-09 e o conjunto G2 (SEM import de valor novo)

Tudo que estes testes leem ja esta importado (`auditRouteCoverage`, `toContractIssue`,
`buildContractIssues`) ou e campo novo (`f.trigger`, `summary.g2.lost`). `BaseRead` ja entrou no
`import type` na fase-01. RED por assertion em todos (G5).

**1a. Reescrita honesta no teste da fase-01.** Em `flags G2 as triggered with middleware.ts as source when
the diff touches it` (describe `gatilho G2 e duas pontas`), as duas assercoes-placeholder passam a mentir
depois desta fase: a ponta DEPOIS e o `middleware.ts` REAL da fixture (`/dashboard/:path*`), a ponta ANTES
cobre toda a API, logo 4 rotas perdem cobertura. Substituir (nao duplicar — mesmo criterio do CA-10 no
Plano 02):

```ts
// ANTES (fase-01):
//   expect(summary.g2.lost).toBe(0)                              // emissao e a fase-02
//   expect(findings).toHaveLength(0)
// DEPOIS:
    expect(summary.g2.lost).toBe(4)                                   // admin, preferences, users GET, users DELETE
    expect(findings.every((f) => f.trigger === 'G2')).toBe(true)      // a ponta depois e o middleware.ts REAL da fixture
```

**1b. `describe` novo, ao final do arquivo (antes de `readAtBaseFromGit`).**

```ts
// route-auth-matrix.test.ts
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
```

Rodar `bun test skills/security/lib/route-auth-matrix.test.ts -t 'cobertura perdida|flags G2 as triggered'`
e VER 7 falharem (1 nasce verde — ver "Verificacao"). Os outros 38 continuam verdes neste passo.

### Passo 2: Tipos — ADITIVO em `route-auth-matrix.types.ts`

```ts
// 2026-09-05 (Luiz/dev): Plano 03 DP-4 — qual entrada do CONJUNTO-GATILHO (PRD Decisao 6) trouxe a rota:
// G1 = o arquivo dela esta no diff; G2 = cobertura perdida por mudanca no matcher/allowlist. Opcional porque
// `evaluateRoute`/`verdictFor` sao puras e nao sabem o gatilho; o MOTOR sempre preenche.
export type AuditTrigger = 'G1' | 'G2'

export type RouteVerdict = {
  route: Route
  verdict: Verdict
  evidence: string
  trigger?: AuditTrigger
}

export type RouteFinding = {
  route: Route
  verdict: Exclude<Verdict, 'coberta' | 'publica-declarada'>
  severity: IssueSeverity
  missing: string
  trigger?: AuditTrigger
}
```

### Passo 3: Motor — `lostCoverage`, `g2Verdicts`, `trigger` no G1 e nos findings

```ts
// route-auth-matrix.ts
import type { AllowlistDelta, AllowlistEntry, AuditTrigger, BaseRead, G2Summary, RouteAdapter, Verdict } from './route-auth-matrix.types'

// 2026-09-05 (Luiz/dev): DP-4 (emendada) — o conjunto G2. So rota FORA do G1 (G8: quem esta no G1 conta uma vez, la);
// so quem ERA coberta/publica-declarada/indeterminada e AGORA esta aberta. `indeterminada` antes entra porque exclui-la
// seria aprovacao tacita por incapacidade (RF-04/D8) — mas o veredito G2 fica `indeterminada`: nao da para provar que
// era coberta. O par indeterminada → indeterminada nao e mudanca. `coberta` nunca nasce aqui: OPEN_NOW filtra.
const LOST_FROM: ReadonlySet<Verdict> = new Set(['coberta', 'publica-declarada', 'indeterminada'])
const OPEN_NOW: ReadonlySet<Verdict> = new Set(['DESCOBERTA', 'indeterminada'])

type Ends = { coverage: CoverageMap; allowlist: AllowlistEntry[] }

function lostCoverage(routes: Route[], changed: Set<string>, before: Ends, after: Ends): RouteVerdict[] {
  const lost: RouteVerdict[] = []
  for (const route of routes) {
    if (changed.has(route.file)) continue                              // G8
    const was = verdictFor(route, before.coverage, before.allowlist)
    if (!LOST_FROM.has(was.verdict)) continue
    const now = verdictFor(route, after.coverage, after.allowlist)
    if (!OPEN_NOW.has(now.verdict)) continue
    if (was.verdict === 'indeterminada' && now.verdict === 'indeterminada') continue   // nao mudou: nao e perda
    const verdict: Verdict = was.verdict === 'indeterminada' ? 'indeterminada' : now.verdict   // DP-4 emendada
    lost.push({ route, verdict, evidence: `cobertura perdida — antes: ${was.evidence}; agora: ${now.evidence}`, trigger: 'G2' })
  }
  return lost
}

// Sem gatilho, sem G2. Ponta antes irreconstruivel: a consequencia por rota e a fase-03 (DP-5) — aqui ainda `[]`,
// mas `summary.g2.before` e a nota `G2: <reason>` (fase-01) ja deixam visivel que a base nao foi lida.
function g2Verdicts(routes: Route[], changed: Set<string>, sources: string[], before: BeforeState, after: Ends): RouteVerdict[] {
  if (sources.length === 0 || before.kind !== 'resolved') return []
  return lostCoverage(routes, changed, before, after)
}

function toG2Summary(sources: string[], before: BeforeState, g2: RouteVerdict[]): G2Summary {
  return {
    triggered: sources.length > 0,
    sources,
    before: before.kind,
    lost: g2.filter((v) => v.verdict === 'DESCOBERTA').length,
    indeterminate: g2.filter((v) => v.verdict === 'indeterminada').length,
    ...(before.kind === 'resolved' ? {} : { reason: before.reason }),   // G3
  }
}

/**
 * CONJUNTO-GATILHO (PRD Decisoes 2 e 6): G1 = rotas cujos arquivos estao no diff; G2 = rotas existentes que
 * perderam cobertura porque o matcher/allowlist mudou (DP-4). O mapa de cobertura e lido inteiro nas duas pontas.
 */
export function auditRouteCoverage(targetDir: string, opts: AuditOptions): AuditResult {
  // ...fase-01 ate `reconstructBefore`, com `after` nomeado:
  const after: Ends = { coverage, allowlist: allowlist.entries }
  const before = reconstructBefore(adapter, read, coverageTouched, after, allowlistBase)
  // ...notas da base (fase-01) inalteradas...

  // DP-4: o motor SEMPRE sabe o gatilho; `verdictFor` nao. A anotacao `: RouteVerdict` mantem o literal 'G1'.
  const g1Verdicts = g1.map((route): RouteVerdict => ({ ...verdictFor(route, coverage, allowlist.entries), trigger: 'G1' }))
  const g2 = g2Verdicts(routes, changed, g2Sources, before, after)
  const verdicts = [...g1Verdicts, ...g2]

  const findings: RouteFinding[] = []
  for (const v of verdicts) {
    if (v.verdict !== 'DESCOBERTA' && v.verdict !== 'indeterminada') continue
    findings.push({
      route: v.route, verdict: v.verdict, severity: SEVERITY_BY_VERDICT[v.verdict](v.route), missing: v.evidence,
      ...(v.trigger !== undefined ? { trigger: v.trigger } : {}),   // G3: nunca `trigger: undefined`
    })
  }
  // sort (severidade, path) e allowlistFindings: INALTERADOS (DP-10)

  return {
    // ...
    summary: {
      // ...
      evaluated: verdicts.length,   // G1 + G2 (DP-7)
      // coberta/publicaDeclarada/descoberta/indeterminada continuam filtros sobre `verdicts` — agora G1 + G2
      g2: toG2Summary(g2Sources, before, g2),
    },
  }
}
```

### Passo 4: `toContractIssue` — prefixo por gatilho

```ts
// DP-4: o prefixo e o UNICO marcador de G2 que o relatorio ve (DP-8/G11: verify-work nao muda). Hash map, nao ternario.
const TRIGGER_PREFIX: Readonly<Record<AuditTrigger, string>> = { G1: '', G2: '[cobertura perdida] ' }

export function toContractIssue(finding: RouteFinding, index: number): ContractIssue {
  return {
    id: `ROUTE-${String(index + 1).padStart(3, '0')}`,
    severity: finding.severity,
    file: finding.route.file,
    line: finding.route.line,
    description:
      `${TRIGGER_PREFIX[finding.trigger ?? 'G1']}${finding.verdict}: ${finding.route.method} ${finding.route.path} ` +
      `(${finding.route.file}:${finding.route.line}) ${DESCRIPTION_BY_VERDICT[finding.verdict](finding)}`,
  }
}
```

### Passo 5: Agente — secao 11 (DP-8 a/b; a UNICA correcao do G13)

**5a. Correcao no lugar** (o bullet do Plano 02 fica FALSO apos esta fase — G13). Substituir:

```markdown
- Entrada em `delta.removed` e rota que PERDEU a declaracao de publica. Se o arquivo dela nao esta no
  diff, a lib nao a reavaliou nesta versao (escopo G1) — aponte isso no bloco; o G2 (Plano 03) fecha.
```

por:

```markdown
- Entrada em `delta.removed` e rota que PERDEU a declaracao de publica. A lib a reavalia pelo G2
  (cobertura perdida): se a rota esta aberta agora, o finding dela ja esta em `issues` com
  `[cobertura perdida]` — ligue os dois no bloco (entrada removida → issue correspondente).
```

**5b. Bullets novos**, ao final da secao 11 (depois de `- Cite summary.publicaDeclarada ...`):

```markdown
- Cite `summary.g2` em `reasoning`: `triggered`, `sources` e `lost`. `triggered: true` = o diff tocou
  `middleware.ts` e/ou `anti-vibe.public-routes.json` (`sources`) e a lib comparou a cobertura de TODA
  rota existente na base do diff e no HEAD; `lost` = quantas rotas existentes ficaram abertas por essa
  mudanca. `summary.evaluated` conta G1 + G2 — `evaluated: 0` com `g2.triggered: false` significa que
  o diff nao tocou rota nem cobertura; nao significa "tudo coberto".
- Issue cuja description comeca com `[cobertura perdida]` e rota EXISTENTE que ficou aberta porque o
  matcher/allowlist mudou — NAO e "rota nova sem auth". A description traz as duas pontas
  (`antes: middleware.ts@base:<linha> casa <path>; agora: ...`): o revisor precisa olhar o diff do
  `middleware.ts`/da allowlist, nao o arquivo da rota. Copie como esta; o prefixo e o unico marcador
  que o relatorio do `verify-work` ve.
```

### Passo 6: Manifest

`bun run generate:manifest` — `route-auth-matrix.ts`, `route-auth-matrix.types.ts` e
`agents/security-auditor.md` sao rastreados (G2). `route-auth-nextjs.ts` nao muda.

---

## Gotchas

- **G3 do plano:** `trigger` e opcional com `exactOptionalPropertyTypes`. No finding, spread condicional
  (`...(v.trigger !== undefined ? { trigger: v.trigger } : {})`); no G1, a anotacao `(route): RouteVerdict =>`
  e o que impede o TS de alargar `'G1'` para `string` dentro do spread. Sem ela, erro de atribuicao.
- **G4 do plano:** `findings[0]?.missing`, `issues[1]?.description` — nunca `xs[0]!`. Para a description,
  `findings.map(toContractIssue)[0]?.description ?? ''` (padrao ja usado em CA-01).
- **G5 do plano (GT-fase02-1):** esta fase NAO importa simbolo novo em arquivo de teste. `AuditTrigger` nao e
  importado no teste (so lido como `f.trigger`). RED por assertion em tudo — nao ha "segundo passo".
- **G8 do plano:** `changed.has(route.file)` e a primeira linha do loop. Sem ela, `changedFiles:
  ['middleware.ts', 'app/api/admin/route.ts']` emite dois `ROUTE-*` para `/api/admin` — o teste `counts a
  route that is in G1 and also lost coverage once` pega (`Expected length: 1, Received length: 2`).
- **G13 do plano:** o bullet `delta.removed ... o G2 (Plano 03) fecha` ocupa DUAS linhas fisicas no `.md`.
  "Uma linha `-`" no README significa UM bullet; `git diff` vai mostrar 2 linhas `-` (as duas do bullet) e
  nada mais em `-`. Qualquer outra remocao e regressao do "nunca diminuir".
- **G19 do plano:** `bun run typecheck` fica vermelho entre o Passo 1 e o Passo 2 (`f.trigger` nao existe
  em `RouteFinding`). Esperado; nao declarar o tipo antes do RED.
- **G20/G21 do plano:** nenhum teste existente quebra. `evaluates only routes whose files are in changedFiles`
  (G1 sem G2) continua `evaluated: 1`. `reads each base file once` (fase-01, fixture `nextjs-allowlist`)
  passa a produzir 1 finding G2 (`/api/admin`: coberta por `/api/:path*` antes, DESCOBERTA agora) sem
  quebrar — ele so afirma `sources`, chamadas e `delta.before`. Rodar o arquivo inteiro, nao so o `-t`.
- **Local — reescrita do teste da fase-01 (Passo 1a):** `lost: 0` e `findings: 0` eram placeholders
  declarados ("emissao e a fase-02"). Mante-los faria o teste contradizer CA-09 — um dos dois mentiria
  sempre. Reescrever e parte do RED honesto (mesmo criterio da reescrita do "sem emitir" no Plano 02, DP-10).
- **Local — `NARROWED.readAtBase` precisa de `(): BaseRead`:** sem a anotacao, `{ status: 'found', ... }`
  infere `status: string` e `{ ...NARROWED, changedFiles }` nao e `AuditOptions`. Lambdas passadas inline
  (`readAtBase: () => ({...})`) sao tipadas por contexto e nao precisam.
- **Local — um teste nasce verde:** `emits nothing when the middleware change widens or keeps the coverage`
  passa antes do loop existir (sem loop, tambem nao ha finding). E a trava contra falso positivo em todo
  commit de `middleware.ts`; a defesa e provada no RED-check (4). Declarar no MEMORY se o executor
  preferir move-lo para depois do GREEN.
- **Local — por que CA-09 da exatamente 3 e nao 5:** `/api/:path*` casa `/api/users/[id]` pela sonda
  `/api/users/__dyn__` (match total, nao `partial`); `/docs/[...slug]` e `/pricing` dao `no-match` (zero
  sondas casam) nas duas pontas → DESCOBERTA antes e depois → fora do conjunto. Se algum deles saisse
  `partial`, viraria `indeterminada` antes e ENTRARIA como `indeterminada` G2 (DP-4 emendada) — o teste fixa 3
  DESCOBERTA, entao ele tambem prova que nenhuma sonda da `partial`. Nenhum ramo produz `coberta`.
- **Local — `verdictBefore = indeterminada` ENTRA como `indeterminada` G2 (DP-4 emendada, MEMORY DEV-plan-3):**
  base com matcher computado (`opaque`) da `indeterminada` antes; se a rota esta DESCOBERTA agora e fora do G1,
  exclui-la seria aprovacao tacita por incapacidade. Ela entra, mas como `indeterminada` medium — o motor nao
  inventa que ela era coberta. O par indeterminada → indeterminada e pulado (nao e mudanca). Se o dev vetar no
  PR: tirar `indeterminada` de `LOST_FROM`, apagar a linha do `verdict` e o teste `indeterminada at the base`.
- **Local — `summary.coberta`/`publicaDeclarada` nunca vem do G2:** G2 so produz DESCOBERTA/indeterminada
  (OPEN_NOW). Os filtros do summary continuam sobre `verdicts` (G1 + G2) sem mudar de codigo — so a
  semantica de `evaluated` muda (DP-7). Nao criar `summary.g1`/`summary.g2.evaluated` sem pedido.
- **Local — ordem em `verdicts`:** G1 primeiro, G2 depois (concatenacao). `findings` reordena por
  (severidade, path) como sempre — `trigger` nao entra no sort (DP-10).
- **Local — a allowlist removida usa `/api/admin`, nao `/api/health`:** a fixture `nextjs-allowlist` DECLARA
  health no HEAD; a unica rota que pode "perder a declaracao" sem fixture nova (DP-9) e `/api/admin`, cuja
  entrada no HEAD nao tem `reason` (recusada). `delta.removed` = `['/api/admin']` e o G2 casa com ele.

---

## Verificacao

### TDD

- [ ] **RED (Passo 1):** 7 testes novos + 2 assercoes reescritas; FALHAM sem tocar producao
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'cobertura perdida|flags G2 as triggered'`
  - Resultado esperado: `7 fail, 1 pass` — `CA-09` com `Expected length: 3, Received length: 0`;
    `indeterminada at the base` com `Expected length: 5, Received length: 0`;
    `carries both ends` com `Expected: "cobertura perdida — ...", Received: undefined`; `lost its public
    declaration` com `Expected length: 1, Received length: 0`; `deleted middleware.ts` com `Received: []`;
    `counts a route ... once` com `Expected: "G1", Received: undefined`; `flags G2 as triggered` com
    `Expected: 4, Received: 0`. O `1 pass` e `emits nothing when ... widens` (nasce verde — gotcha local).
    Os 38 restantes do arquivo: `38 pass`.

- [ ] **GREEN:** Passos 2–4 implementados, tudo PASSA
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `46 pass, 0 fail` (39 da fase-01 + 7)
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts`
  - Resultado esperado: `39 pass, 0 fail` (inalterado)
  - Se a contagem real diferir, registrar no MEMORY (Metricas).

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `CA-09: emits a finding for every route that left coberta when only
      middleware.ts narrowed the matcher` FALHOU antes da defesa existir — o diff que so estreita o matcher
      e o abuso que o PRD descreve ("um conjunto inteiro de rotas admin acabou de ficar aberto em silencio")
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-09'`
  - Resultado esperado no RED: `Expected length: 3, Received length: 0`
- [ ] **Segundo abuso no RED:** `flags a route that lost its public declaration when its allowlist entry was
      removed` FALHOU antes — tirar a entrada da allowlist sem tocar a rota era o buraco G18 do Plano 02
- [ ] **CA-09 (G2 — cobertura perdida):** Dado um diff que SO altera `middleware.ts`, estreitando o matcher,
      quando o auditor roda, entao emite finding para cada rota que saiu de `coberta` — mesmo sem arquivo de
      rota no diff — verificado por `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-09|deleted middleware'`
- [ ] **`coberta` nunca nasce do G2:** `OPEN_NOW` filtra o veredito DEPOIS; `lostCoverage` so devolve
      DESCOBERTA/indeterminada. `git diff skills/security/lib/route-auth-matrix.ts` mostra `evaluateRoute` e
      `verdictFor` INTOCADAS — o G2 acrescenta findings, nunca remove nem rebaixa um existente
- [ ] **Severidade e emissao identicas ao G1 (D8/D9):** `SEVERITY_BY_VERDICT` e `DESCRIPTION_BY_VERDICT` nao
      mudam; o unico acrescimo textual e o prefixo `[cobertura perdida] `
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** Nenhum `middleware.ts` nem
      `anti-vibe.public-routes.json` de projeto algum foi criado ou editado; os textos de base vivem so em
      memoria de teste (`middlewareSource`, `BASE_WITH_ADMIN`)
- [ ] Nenhum secret literal entrou no codigo; `lostCoverage` nao loga nada — a evidence carrega so
      `arquivo:linha` e path

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) fazer `lostCoverage` devolver `[]`
      → `-t 'CA-09'` FALHA com `Expected length: 3, Received length: 0`; restaurar. (2) Trocar
      `TRIGGER_PREFIX.G2` para `''` → `carries both ends ... prefixes [cobertura perdida]` FALHA em
      `startsWith` (`Expected: true, Received: false`) e `counts a route ... once` FALHA em `issues[1]`;
      restaurar. (3) Remover o `if (changed.has(route.file)) continue` de `lostCoverage` → `counts a route
      ... once` FALHA com `Expected length: 1, Received length: 2` e `evaluated` `Expected: 3, Received: 4`;
      restaurar. (4) Trocar `if (!LOST_FROM.has(was.verdict)) continue` por nada (aceitar qualquer veredito
      antes) → `CA-09` FALHA com `Expected length: 3, Received length: 5` (docs e pricing entram) e `emits
      nothing when ... widens` FALHA com `Received length: 2`; restaurar. (5) Tirar `'indeterminada'` de
      `LOST_FROM` → `indeterminada at the base` FALHA com `Expected length: 5, Received length: 0`; restaurar.
      (6) Remover o `continue` do par indeterminada → indeterminada → o mesmo teste FALHA em `stillOpaque`
      (`Expected length: 0, Received length: 5`); restaurar.
- [ ] `grep -n "nao antecipar aqui" skills/security/lib/route-auth-matrix.ts` → vazio (JSDoc de
      `auditRouteCoverage` atualizado para G1 + G2)
- [ ] `grep -c "cobertura perdida" skills/security/lib/route-auth-matrix.ts` → `2` (prefixo + evidence)
- [ ] `grep -n "switch" skills/security/lib/route-auth-matrix.ts` → vazio (`TRIGGER_PREFIX` e hash map)
- [ ] `grep -n " as " skills/security/lib/route-auth-matrix.ts skills/security/lib/route-auth-matrix.types.ts` → so os `as const` preexistentes
- [ ] `git diff agents/security-auditor.md | grep -c '^-[^-]'` → `2` (as duas linhas fisicas do bullet
      stale — G13); `grep -n "o G2 (Plano 03) fecha" agents/security-auditor.md` → vazio
- [ ] Testes do Plano 02 continuam verdes com G2 disparando (G21):
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-07|removed entries|absent at the base|never stays silent when the base is unavailable|no base reader|changed=false'` → `6 pass`
- [ ] Testes da fase-01 continuam verdes apos a reescrita: `-t 'gatilho G2|verdictFor'` → `6 pass`
- [ ] CLI contra o repo do plugin: `bun skills/security/lib/route-auth-matrix.ts . --ref main` devolve
      `summary.g2: { triggered: false, sources: [], before: "resolved", lost: 0, indeterminate: 0 }`,
      `issues: []` e nenhum `blocked` (o repo nao tem `middleware.ts` nem allowlist — o caminho G2 real fica
      coberto pelos 6 testes de seam)
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G2) — 3 arquivos rastreados
- [ ] `bun run agents:contract` verde (o agente mudou — confirma o contrato)
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G19)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G12)
- [ ] **GT-fase02-1 aplicada:** nenhum import de valor novo no arquivo de teste; RED por assertion em todos
      os 6 + 1 reescrito — registrar no MEMORY se o RED real divergiu da forma prevista (como DEV-fase03-2 do
      Plano 02 fez)
- [ ] MEMORY.md: contagem real de testes (se diferir de 46/39), DI/BUG/GT desta fase; Metricas (fases
      concluidas: 2). A emenda da DP-4 ja esta registrada (DEV-plan-3) — nao re-registrar

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-09'` retorna `1 pass`
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'cobertura perdida'` retorna `7 pass`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning
- `git diff --stat agents/security-auditor.md` mostra insercoes e exatamente 2 linhas removidas (o bullet stale)

**Por humano:**
- Num projeto Next.js real, num branch que estreita o `config.matcher` sem tocar rota nenhuma,
  `/anti-vibe-coding:verify-work` lista em Issues Found itens `ROUTE-*` cuja description comeca com
  `[cobertura perdida] DESCOBERTA: ...` e traz `antes: middleware.ts@base:<linha> casa <path>`, e o
  `reasoning` do security-auditor cita `summary.g2.triggered: true`, `sources: ["middleware.ts"]` e `lost` —
  **pendente de sync do cache do plugin (G1)**; registrar como divida, nao como falha

---

<!-- Gerado por /plan-feature em 2026-09-05 -->
