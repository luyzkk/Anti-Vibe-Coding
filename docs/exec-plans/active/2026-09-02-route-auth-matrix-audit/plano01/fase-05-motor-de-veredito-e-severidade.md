<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: Motor de Veredito e Severidade

**Plano:** 01 — Fundacao + Tracer Bullet (Next.js)
**Sizing:** 1.5h
**Depende de:** fase-04
**Visual:** false

---

## O que esta fase entrega

Os quatro veredictos nascem aqui com a regra FIXA do PRD: `DESCOBERTA` e **CRITICO** se o path casa
marcador de privilegio ou o metodo muta estado, **ALTO** nos demais; o finding nomeia `arquivo:linha`
e diz o que faltou (RF-05); e o conjunto avaliado e o G1 — rotas dos arquivos tocados pelo diff —
com o mapa de cobertura lido inteiro (D2).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-matrix.ts` | Modify | `evaluateRoute`, `severityFor`, escopo G1 (`changedFiles` / `--ref`), summary de observabilidade |
| `skills/security/lib/route-auth-matrix.test.ts` | Modify | CA-01, CA-01b, CA-02, CA-06 (integrado), regra de severidade, escopo G1 |
| `tests/fixtures/route-auth-matrix/nextjs-covered/` | Create | `middleware.ts` cobrindo `/api/admin/:path*` e `/api/preferences` + as duas rotas (CA-02) |
| `agents/security-auditor.md` | Modify | Secao 11: comando ganha `--ref <ref>` (aditivo) |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) |

---

## Implementacao

### Passo 1: Motor de veredito — hash map por `kind`, fallback `indeterminada`

```ts
// skills/security/lib/route-auth-matrix.ts — trecho
import type { CoverageMap, CoverageRule, Route, RouteFinding, RouteVerdict, Verdict } from './route-auth-matrix.types'
import type { IssueSeverity } from '../../lib/subagent-contract'
import { matchRouteAgainstPattern, nextjsAdapter } from './route-auth-nextjs'

type RuleOutcome = 'covers' | 'no' | 'unsure'
type RuleMatcher = (route: Route, rule: CoverageRule) => RuleOutcome

// 2026-09-03 (Luiz/dev): hash map em vez de switch — CLAUDE.md global. `kind` fora do mapa cai em
// `unsure` → indeterminada: Plano 04 acrescenta variantes sem poder produzir `coberta` por acidente.
const RULE_MATCHERS: Readonly<Record<string, RuleMatcher>> = {
  'path-pattern': (route, rule) => {
    if (rule.kind !== 'path-pattern') return 'unsure'
    const outcome = matchRouteAgainstPattern(route.path, rule.pattern)
    return outcome === 'matches' ? 'covers' : outcome === 'no-match' ? 'no' : 'unsure'
  },
  opaque: () => 'unsure',
}

/**
 * Um veredito por rota. `coberta` exige ao menos uma regra que DEMONSTRA o match; qualquer regra
 * `unsure` sem uma `covers` vira `indeterminada`; nenhuma regra relevante → `DESCOBERTA`.
 * `publica-declarada` nao nasce aqui — e o Plano 02 (allowlist) que a produz antes de chamar isto.
 */
export function evaluateRoute(route: Route, coverage: CoverageMap): RouteVerdict {
  let unsure: CoverageRule | null = null
  for (const rule of coverage.rules) {
    const matcher = RULE_MATCHERS[rule.kind] ?? (() => 'unsure')
    const outcome = matcher(route, rule)
    if (outcome === 'covers') {
      return { route, verdict: 'coberta', evidence: `${rule.file}:${rule.line} casa ${route.path}` }
    }
    if (outcome === 'unsure' && unsure === null) unsure = rule
  }
  if (unsure !== null) {
    const why = unsure.kind === 'opaque' ? unsure.reason : `match parcial contra ${unsure.file}:${unsure.line}`
    return { route, verdict: 'indeterminada', evidence: why }
  }
  const sources = coverage.sources.length > 0 ? coverage.sources.join(', ') : 'middleware.ts ausente'
  return { route, verdict: 'DESCOBERTA', evidence: `nenhuma entrada de config.matcher (${sources}) casa ${route.path}` }
}
```

### Passo 2: Severidade — regra, nao julgamento (D9 do PRD)

```ts
// 2026-09-03 (Luiz/dev): PRD "Veredito, severidade e consequencia" — marcador de privilegio OU
// metodo mutante = critical; senao high. Segmento que COMECA com o marcador (`/admin-panel`,
// `/billing-history` contam); substring solta nao (`/api/badminton` nao conta).
const PRIVILEGE_MARKERS = ['admin', 'internal', 'billing'] as const
const PRIVILEGE_RE = new RegExp(`(^|/)(${PRIVILEGE_MARKERS.join('|')})`, 'i')

export function hasPrivilegeMarker(path: string): boolean {
  return PRIVILEGE_RE.test(path)
}

/** PRD: "o metodo muta estado (nao-GET)". Literal: tudo que nao e GET conta como mutante. */
export function mutatesState(route: Route): boolean {
  return route.method !== 'GET'
}

export function severityFor(route: Route): IssueSeverity {
  return hasPrivilegeMarker(route.path) || mutatesState(route) ? 'critical' : 'high'
}
```

### Passo 3: Escopo G1 e a API publica

```ts
export type AuditOptions = {
  /** Arquivos POSIX relativos a raiz, vindos do diff. Testes injetam; a CLI resolve via git. */
  changedFiles?: string[]
}

export type AuditSummary = {
  enumerated: number
  evaluated: number
  coberta: number
  descoberta: number
  indeterminada: number
  scope: 'diff'
  sources: string[]
  notes: string[]
}

export type AuditResult = { findings: RouteFinding[]; verdicts: RouteVerdict[]; summary: AuditSummary }

/**
 * G1 (PRD D2/D6): avalia SO as rotas cujos arquivos estao em `changedFiles`; o mapa de cobertura
 * e lido inteiro. G2 (cobertura perdida) e o Plano 03 — nao antecipar aqui.
 */
export function auditRouteCoverage(targetDir: string, opts: AuditOptions): AuditResult
```

Regras dentro de `auditRouteCoverage`:

1. `routes = nextjsAdapter.enumerate(targetDir)`; `coverage = nextjsAdapter.readCoverage(targetDir)`.
2. `changed = new Set(opts.changedFiles ?? [])`; `evaluated = routes.filter((r) => changed.has(r.file))`.
   `changedFiles` ausente ou vazio → `evaluated = []` e `notes` recebe
   `'escopo G1 vazio: nenhum arquivo de rota no diff'`. **Nao** cair para "todas as rotas" — isso e
   o RF-07 (full-surface, Could) e nao entra nesta versao.
3. `verdicts = evaluated.map((r) => evaluateRoute(r, coverage))`.
4. `findings` = so `DESCOBERTA`, com `severity: severityFor(route)` e
   `missing: verdict.evidence`. `indeterminada` entra na contagem do `summary` — a emissao como
   MEDIO e o Plano 02 fase-03 (D8), nao aqui.
5. `summary` conta tudo (observabilidade do PRD: "quantas rotas foram enumeradas e quantas ficaram
   indeterminada").

`toContractIssue` monta a `description` no formato RF-05:

```
DESCOBERTA: GET /api/admin (app/api/admin/route.ts:3) sem cobertura de middleware — nenhuma entrada de config.matcher (middleware.ts) casa /api/admin
```

E `fix_with_example` opcional (RF-08 e Could — deixar de fora; a `description` ja diz o que faltou).

### Passo 4: CLI resolve o diff

```ts
if (import.meta.main) {
  const args = process.argv.slice(2)
  const target = args.find((a) => !a.startsWith('--')) ?? process.cwd()
  const refIdx = args.indexOf('--ref')
  const ref = refIdx >= 0 ? args[refIdx + 1] : undefined
  const changedFiles = ref !== undefined ? changedFilesFromGit(target, ref) : changedFilesFromGit(target, 'HEAD~1')
  // changedFilesFromGit: Bun.spawnSync(['git', 'diff', '--name-only', `${ref}...HEAD`], { cwd: target })
  // git falha (nao e repo, ref invalida) → { ok: false, error } → CLI imprime { blocked: true, reason } e sai com codigo 2
  ...
}
```

Espelha a resolucao do `verify-work` (SKILL.md:103 — tres pontos contra o merge-base; fallback
`HEAD~1`). `git` roda **dentro da lib**, nao pelo agente — a allowlist de Bash do agente continua
sendo um unico comando. Saida com `git` indisponivel: `{ "blocked": true, "reason": "..." }` e exit
code 2, para o agente registrar em `reasoning` (secao 11 ja instrui: nao inventar).

### Passo 5: Agente — `--ref` (aditivo)

Na secao 11 do `security-auditor.md`, acrescentar apos o comando:

```markdown
- Quando o orquestrador informar um ponto fixo (`verify-work` passa `<ref>`; `/security` pode
  nao passar), acrescente `--ref <ref>` ao comando. Sem `--ref`, a lib usa `HEAD~1`.
- Saida `{ "blocked": true, ... }` significa que a lib nao conseguiu resolver o diff: registre a
  razao em `reasoning` e NAO emita finding de rota inventado.
```

### Passo 6: Fixture `nextjs-covered` (CA-02) e testes

`nextjs-covered/middleware.ts` com `matcher: ['/api/admin/:path*', '/api/preferences']` e as rotas
`app/api/admin/route.ts` (GET) e `app/api/preferences/route.ts` (GET).

```ts
// skills/security/lib/route-auth-matrix.test.ts — reescrito nesta fase
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditRouteCoverage, severityFor, evaluateRoute } from './route-auth-matrix'
import type { Route } from './route-auth-matrix.types'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')
const MINIMAL = join(FIXTURES, 'nextjs-minimal')
const route = (over: Partial<Route>): Route => ({ method: 'GET', path: '/x', file: 'app/x/route.ts', line: 1, stack: 'nextjs', ...over })

describe('severityFor (PRD D9 — regra fixa)', () => {
  it('returns critical when the path has a privilege marker', () => {
    expect(severityFor(route({ path: '/api/admin' }))).toBe('critical')
    expect(severityFor(route({ path: '/billing-history' }))).toBe('critical')
  })
  it('returns critical when the method mutates state even without marker', () => {
    expect(severityFor(route({ method: 'POST', path: '/api/preferences' }))).toBe('critical')
  })
  it('returns high for GET without privilege marker', () => {
    expect(severityFor(route({ path: '/api/preferences' }))).toBe('high')
    expect(severityFor(route({ path: '/api/badminton' }))).toBe('high')
  })
})

describe('auditRouteCoverage — G1 scope', () => {
  it('CA-01: emits critical finding with file:line for app/api/admin/route.ts outside the matcher', () => {
    const { findings } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('critical')
    expect(findings[0]?.route.file).toBe('app/api/admin/route.ts')
    expect(findings[0]?.route.line).toBeGreaterThanOrEqual(1)
    expect(findings[0]?.missing).toContain('config.matcher')
  })
  it('CA-01b: emits high, not critical, for GET /api/preferences', () => {
    const { findings } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/preferences/route.ts'] })
    expect(findings.map((f) => f.severity)).toEqual(['high'])
  })
  it('CA-02: emits nothing when the route is inside the matcher', () => {
    const { findings, summary } = auditRouteCoverage(join(FIXTURES, 'nextjs-covered'), { changedFiles: ['app/api/admin/route.ts'] })
    expect(findings).toHaveLength(0)
    expect(summary.coberta).toBe(1)
  })
  it('CA-06: never yields coberta for the lookalike matcher', () => {
    const { verdicts } = auditRouteCoverage(join(FIXTURES, 'nextjs-matcher-lookalike'), { changedFiles: ['app/api/admin/route.ts'] })
    expect(verdicts.map((v) => v.verdict)).not.toContain('coberta')
  })
  it('counts indeterminada in the summary without emitting a finding (emission is Plano 02)', () => {
    const { findings, summary } = auditRouteCoverage(join(FIXTURES, 'nextjs-matcher-computed'), { changedFiles: ['app/api/admin/route.ts'] })
    expect(summary.indeterminada).toBe(1)
    expect(findings).toHaveLength(0)
  })
  it('evaluates only routes whose files are in changedFiles', () => {
    const { summary } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(summary.enumerated).toBe(6)
    expect(summary.evaluated).toBe(1)
  })
  it('evaluates nothing and notes it when changedFiles is empty', () => {
    const { summary } = auditRouteCoverage(MINIMAL, { changedFiles: [] })
    expect(summary.evaluated).toBe(0)
    expect(summary.notes.join(' ')).toContain('G1')
  })
})
```

---

## Gotchas

- **D9 do PRD e literal:** "nao-GET" inclui `HEAD` e `OPTIONS`. Sao metodos seguros em HTTP, mas
  a regra do PRD nao os excetua e dois implementadores precisam produzir a mesma saida. Seguir o
  PRD; se o dev quiser excetuar, e emenda no PRD (DI no MEMORY), nao decisao na lib.
- **Marcador por prefixo de segmento** (`(^|/)(admin|internal|billing)`) e escolha desta fase —
  registrar como DI. Substring solta daria CRITICO em `/api/badminton`; segmento exato deixaria
  `/admin-panel` como ALTO. Prefixo de segmento e o meio-termo; o teste fixa os dois lados.
- **G1 ≠ full-surface:** `changedFiles` vazio → zero avaliadas, com nota. Cair para "todas" seria
  o RF-07 escondido dentro do RF-03 e despejaria findings de codigo que a PR nao tocou (D2).
- **G2 (cobertura perdida) e Plano 03.** Diff que so toca `middleware.ts` → `changedFiles` sem
  rota → `evaluated: 0`. Isso e o buraco que o Plano 03 fecha; aqui apenas a nota deixa visivel.
  Nao "melhorar" antecipando.
- **G10 do plano:** a lib roda `git` com `cwd: target` — o projeto auditado. Se o projeto nao for
  repo git, a CLI devolve `blocked` e o agente registra. Nunca emitir finding sem diff resolvido.
- **G12 do plano:** `args[refIdx + 1]` e `string | undefined`; `--ref` sem valor cai no `HEAD~1`
  por acidente — tratar explicitamente (`blocked` com razao `--ref sem valor`).
- **Local — ordem dos `findings`:** ordenar por severidade (`critical` antes de `high`) e depois
  por `path`, para que `ROUTE-001` seja sempre o pior achado. Ids sao por execucao, nao estaveis
  entre rodadas — o relatorio cita `arquivo:linha`, nao o id.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-01b'`
  - Resultado esperado: `Expected: ["high"], Received: ["critical"]` (severidade fixa herdada da fase-01)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `10 pass, 0 fail`

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `returns critical when the method mutates state even without marker`
      FALHOU antes da regra existir (um `POST` aberto saindo como ALTO e o abuso: severidade unica
      afoga o grave no leve — PRD D9)
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'mutates state'`
  - Resultado esperado no RED: `Expected: "critical", Received: "high"` (ou `"critical"` fixo
    para tudo, se a fase-01 ainda estiver em vigor — nesse caso o RED honesto e o CA-01b)
- [ ] **CA-01:** Dado um projeto Next.js com `app/api/admin/route.ts` fora do `config.matcher` e
      ausente da allowlist, quando o auditor roda sobre um diff que cria essa rota, entao emite
      finding **CRITICO** nomeando `arquivo:linha` e a razao — verificado por
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-01:'`
- [ ] **CA-01b:** Dado `GET /api/preferences` sem marcador e sem mutacao, entao o finding e
      **ALTO** — verificado por `-t 'CA-01b'`
- [ ] **CA-02:** Dado a rota dentro do matcher, entao nenhum finding — verificado por `-t 'CA-02'`
- [ ] **CA-06:** jamais `coberta` por semelhanca textual — verificado por `-t 'CA-06'`
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A fase le o diff do projeto
      auditado e nao escreve nele; a mudanca de auth e do projeto auditado, nao desta lib
- [ ] Nenhum secret literal entrou no codigo ou na fixture

### Checklist

- [ ] CLI contra o repo do plugin (que e git): `bun skills/security/lib/route-auth-matrix.ts . --ref main`
      devolve JSON com `summary.enumerated: 0` (o plugin nao tem `app/`) e sem `blocked`
- [ ] CLI contra fixture (nao-git): `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-minimal`
      devolve `{ "blocked": true, ... }` com exit code 2 — comportamento esperado fora de repo
- [ ] `grep -n "switch" skills/security/lib/route-auth-matrix.ts` → vazio (hash map)
- [ ] `security-auditor.md` secao 11 menciona `--ref` e `blocked`; `git diff` do agente e so adicao
- [ ] Contagem de indeterminadas aparece em `summary` (observabilidade do PRD)
- [ ] `bun run generate:manifest` sem warning (lib + agente alterados)
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] MEMORY.md: "Notas para Planos Seguintes" preenchida com: assinatura de `auditRouteCoverage`
      (`changedFiles`), onde `publica-declarada` entra (antes de `evaluateRoute`), onde a emissao de
      `indeterminada` entra (Plano 02 fase-03 le `verdicts`), e o resultado de GT-1 (parser)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/` retorna `0 fail` (fases 01–05 juntas)
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-0'` retorna `4 pass`
  (CA-01, CA-01b, CA-02, CA-06)
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning

**Por humano:**
- Num projeto Next.js real com um `route.ts` novo fora do matcher, `/anti-vibe-coding:security`
  produz no envelope um `ROUTE-001` cuja `description` permite ir direto ao arquivo e a linha e
  entender o que faltou, sem abrir a lib

---

<!-- Gerado por /plan-feature em 2026-09-03 -->
