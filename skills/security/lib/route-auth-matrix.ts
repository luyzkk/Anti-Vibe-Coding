// 2026-09-04 (Luiz/dev): motor de veredito, regra de severidade e escopo G1 — Plano 01 fase-05.
// A enumeracao e a leitura de cobertura vivem no adaptador nativo da stack; aqui fica a decisao.
import type { IssueSeverity } from '../../lib/subagent-contract'
import { PUBLIC_ROUTES_FILE, diffAllowlist, matchAllowlist, parsePublicRoutes, readPublicRoutes } from './public-routes-allowlist'
import type { AllowlistFinding, CoverageMap, CoverageRule, RejectedEntry, Route, RouteFinding, RouteVerdict } from './route-auth-matrix.types'
import type { AllowlistDelta, AllowlistEntry, AuditTrigger, BaseRead, G2Summary, RouteAdapter, Verdict } from './route-auth-matrix.types'
import { isCoverageUnavailable } from './route-auth-matrix.types'
import { matchRouteAgainstPattern, nextjsAdapter } from './route-auth-nextjs'

/** Item exatamente no shape de `AuditContractV2['payload']['issues'][number]`. */
export type ContractIssue = {
  id: string
  severity: IssueSeverity
  file: string
  line: number
  description: string
}

// ---------------------------------------------------------------------------
// Motor de veredito
// ---------------------------------------------------------------------------

type RuleOutcome = 'covers' | 'no' | 'unsure'
type RuleMatcher = (route: Route, rule: CoverageRule) => RuleOutcome

// Hash map em vez de switch (CLAUDE.md). `kind` fora do mapa cai em `unsure` -> indeterminada:
// o Plano 04 acrescenta variantes sem poder produzir `coberta` por acidente.
const RULE_MATCHERS: Readonly<Record<string, RuleMatcher>> = {
  'path-pattern': (route, rule) => {
    if (rule.kind !== 'path-pattern') return 'unsure'
    const outcome = matchRouteAgainstPattern(route.path, rule.pattern)
    if (outcome === 'matches') return 'covers'
    return outcome === 'no-match' ? 'no' : 'unsure'
  },
  opaque: () => 'unsure',
}

const UNKNOWN_KIND: RuleMatcher = () => 'unsure'

// 2026-09-05 (Luiz/dev): PRD D8 / CA-10 — nao emitir transformaria todo limite do adaptador em
// aprovacao tacita (RF-04). Ruido visivel ganha de silencio que parece aprovacao.
const SEVERITY_BY_VERDICT: Readonly<Record<RouteFinding['verdict'], (route: Route) => IssueSeverity>> = {
  DESCOBERTA: severityFor,
  indeterminada: () => 'medium',
}

// DP-14 para DESCOBERTA, DP-10 para indeterminada — a cauda da description muda por veredito.
const DESCRIPTION_BY_VERDICT: Readonly<Record<RouteFinding['verdict'], (f: RouteFinding) => string>> = {
  DESCOBERTA: (f) => `sem cobertura de middleware e nao declarada publica em ${PUBLIC_ROUTES_FILE} — ${f.missing}`,
  indeterminada: (f) => `— cobertura nao demonstravel: ${f.missing}`,
}

/**
 * Um veredito por rota. `coberta` exige ao menos uma regra que DEMONSTRA o match; qualquer regra
 * ilegivel ou de match parcial, sem uma que cubra, vira `indeterminada`; nenhuma regra relevante
 * vira `DESCOBERTA`. `publica-declarada` nao nasce aqui — e o Plano 02 (allowlist) que a produz.
 */
export function evaluateRoute(route: Route, coverage: CoverageMap): RouteVerdict {
  let unsure: CoverageRule | null = null

  for (const rule of coverage.rules) {
    const matcher = RULE_MATCHERS[rule.kind] ?? UNKNOWN_KIND
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
  return {
    route,
    verdict: 'DESCOBERTA',
    evidence: `nenhuma entrada de config.matcher (${sources}) casa ${route.path}`,
  }
}

// 2026-09-05 (Luiz/dev): Plano 03 DP-3 — a UNICA forma de produzir veredito de rota. Allowlist ANTES
// do motor (DP-6 do Plano 02); as duas pontas do diff passam por aqui, entao nao ha como divergir.
export function verdictFor(route: Route, coverage: CoverageMap, allowlist: AllowlistEntry[]): RouteVerdict {
  const declared = matchAllowlist(route, allowlist)
  if (declared !== null) {
    return { route, verdict: 'publica-declarada', evidence: `${declared.file}:${declared.line} declara publica — ${declared.reason}` }
  }
  return evaluateRoute(route, coverage)
}

// ---------------------------------------------------------------------------
// Severidade — regra fixa, nao julgamento caso a caso (PRD, Decisao 9)
// ---------------------------------------------------------------------------

const PRIVILEGE_MARKERS = ['admin', 'internal', 'billing'] as const
// Prefixo de SEGMENTO: `/admin-panel` conta, `/api/badminton` nao. Substring solta daria falso
// positivo e corroeria a confianca na regra; segmento exato deixaria `/admin-panel` de fora.
const PRIVILEGE_RE = new RegExp(`(^|/)(${PRIVILEGE_MARKERS.join('|')})`, 'i')

export function hasPrivilegeMarker(path: string): boolean {
  return PRIVILEGE_RE.test(path)
}

/** PRD literal: "o metodo muta estado (nao-GET)". HEAD e OPTIONS entram — a regra nao os excetua. */
export function mutatesState(route: Route): boolean {
  return route.method !== 'GET'
}

export function severityFor(route: Route): IssueSeverity {
  return hasPrivilegeMarker(route.path) || mutatesState(route) ? 'critical' : 'high'
}

// ---------------------------------------------------------------------------
// Auditoria com escopo G1
// ---------------------------------------------------------------------------

export type AuditOptions = {
  /** Arquivos POSIX relativos a raiz, vindos do diff. Testes injetam; a CLI resolve via git. */
  changedFiles?: string[]
  /** Seam de injecao para teste — evita depender de fixture em disco para casos de cobertura. */
  coverageOverride?: CoverageMap
  /**
   * Le `file` na ponta ANTES do diff (merge-base). A CLI injeta `readAtBaseFromGit`; testes injetam
   * lambda. 2026-09-05 (Luiz/dev): mesmo seam que o Plano 03 usa para `middleware.ts` — nao criar outro.
   */
  readAtBase?: (file: string) => BaseRead
  /**
   * 2026-09-05 (Luiz/dev): G14 / MEMORY DEV-plan-1 — seam de teste para exercitar `not-applicable` (adaptador sem
   * suporte a G2) antes do Plano 04. Default `nextjsAdapter`; a CLI nao o passa. NAO e a selecao multi-stack (RF-06):
   * a fase-04 do Plano 04 decide se isto vira `detectStack()` ou continua opcional.
   */
  adapter?: RouteAdapter
}

export type AllowlistSummary = {
  file: string
  present: boolean
  accepted: number
  rejected: RejectedEntry[]
  wide: number
  notes: string[]
  changed: boolean
  delta?: AllowlistDelta // presente SO quando changed — G3: spread condicional
}

type BaseReader = (file: string) => BaseRead

// 2026-09-05 (Luiz/dev): Plano 03 DP-3/DP-5/DP-11 — um leitor seguro para allowlist E cobertura.
// Ausente ou lancando vira `unavailable` com razao; a consequencia (delta "tudo added", G2
// indeterminada) e decidida por quem consome, nunca aqui.
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

// A funcao que calculava o delta da allowlist foi dividida em leitura (readAllowlistAtBase) + calculo
// (aqui), para o G2 reusar a mesma leitura. Mesma saida dos 6 testes de CA-07 — so a leitura saiu para fora.
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

// 2026-09-05 (Luiz/dev): DP-5 — ponta antes irreconstruivel. Nao da para dizer "perdeu" nem "nao perdeu", entao e
// `indeterminada` e e emitida (D8). So rota ABERTA hoje (OPEN_NOW): o que esta coberto/declarado agora nao precisa
// da base. G8 vale igual: rota do G1 conta la. Ruidoso por desenho (G18) — a defesa e o `reason` visivel.
function unreconstructableBefore(routes: Route[], changed: Set<string>, reason: string, after: Ends): RouteVerdict[] {
  const open: RouteVerdict[] = []
  for (const route of routes) {
    if (changed.has(route.file)) continue
    const now = verdictFor(route, after.coverage, after.allowlist)
    if (!OPEN_NOW.has(now.verdict)) continue
    open.push({
      route,
      verdict: 'indeterminada',
      evidence: `ponta 'antes' irreconstruivel (${reason}) — nao da para saber se ${route.path} perdeu cobertura neste diff`,
      trigger: 'G2',
    })
  }
  return open
}

// Tres estados da base, tres saidas. `unavailable` e `not-applicable` (com gatilho) tem a MESMA consequencia (DP-5):
// nos dois a lib nao consegue comparar. Dois `if`, nao switch.
function g2Verdicts(routes: Route[], changed: Set<string>, sources: string[], before: BeforeState, after: Ends): RouteVerdict[] {
  if (sources.length === 0) return []
  if (before.kind === 'resolved') return lostCoverage(routes, changed, before, after)
  return unreconstructableBefore(routes, changed, before.reason, after)
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
  g2: G2Summary // novo (Plano 03 DP-7) — obrigatorio: sempre computado
}

export type AuditResult = {
  findings: RouteFinding[]
  /** DP-9. Um item por entrada ampla da allowlist (fase-02); ordenado por severidade e depois linha. */
  allowlistFindings: AllowlistFinding[]
  verdicts: RouteVerdict[]
  summary: AuditSummary
}

const SEVERITY_ORDER: Readonly<Record<string, number>> = { critical: 0, high: 1, medium: 2, low: 3 }

/**
 * CONJUNTO-GATILHO (PRD Decisoes 2 e 6): G1 = rotas cujos arquivos estao no diff; G2 = rotas existentes que
 * perderam cobertura porque o matcher/allowlist mudou (DP-4). O mapa de cobertura e lido inteiro nas duas pontas.
 */
export function auditRouteCoverage(targetDir: string, opts: AuditOptions): AuditResult {
  const adapter = opts.adapter ?? nextjsAdapter   // G14 — substitui o `const adapter: RouteAdapter = nextjsAdapter` da fase-01
  const routes = adapter.enumerate(targetDir)
  const coverage = opts.coverageOverride ?? adapter.readCoverage(targetDir)
  const notes = [...coverage.notes]

  const changed = new Set(opts.changedFiles ?? [])
  const g1 = routes.filter((route) => changed.has(route.file))

  if (changed.size === 0) {
    notes.push('escopo G1 vazio: nenhum arquivo de rota no diff')
  } else if (g1.length === 0) {
    notes.push('escopo G1 sem rotas: o diff nao tocou arquivo de rota')   // DP-7: g2 fala por si
  }

  const allowlist = readPublicRoutes(targetDir)
  const read = safeBaseReader(opts.readAtBase)

  // DP-3: base da allowlist lida UMA vez — delta (Plano 02) e allowlistBefore (G2) saem dela.
  const allowlistChanged = changed.has(PUBLIC_ROUTES_FILE)
  const allowlistBase = allowlistChanged ? readAllowlistAtBase(read) : null
  const delta = allowlistBase === null ? undefined : toAllowlistDelta(allowlist.entries, allowlistBase)

  // DP-1/DP-2: gatilho G2 e ponta antes. O loop rota a rota e a fase-02.
  const g2Sources = resolveG2Sources(adapter, changed)
  const coverageTouched = g2Sources.some((file) => file !== PUBLIC_ROUTES_FILE)
  const after: Ends = { coverage, allowlist: allowlist.entries }
  const before = reconstructBefore(adapter, read, coverageTouched, after, allowlistBase)
  if (before.kind === 'resolved' && coverageTouched) notes.push(...before.coverage.notes)   // DP-6/G9: notas da base
  if (before.kind !== 'resolved') notes.push(`G2: ${before.reason}`)

  // 2026-09-05 (Luiz/dev): DP-6 — allowlist ANTES do motor (PRD Decisao 3: coberta OU publica declarada).
  // verdictFor e a UNICA forma de produzir veredito (DP-3); evaluateRoute nunca produz `publica-declarada`.
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

  findings.sort((a, b) => {
    const bySeverity = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    return bySeverity !== 0 ? bySeverity : a.route.path.localeCompare(b.route.path)
  })

  // Todos `wide` sao `high` hoje (DP-3); a linha e o desempate natural para o relatorio ler de cima a baixo.
  const allowlistFindings = [...allowlist.wide].sort((a, b) => {
    const bySeverity = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    return bySeverity !== 0 ? bySeverity : a.line - b.line
  })

  return {
    findings,
    allowlistFindings,
    verdicts,
    summary: {
      enumerated: routes.length,
      evaluated: verdicts.length,   // G1 + G2 (DP-7)
      coberta: verdicts.filter((v) => v.verdict === 'coberta').length,
      publicaDeclarada: verdicts.filter((v) => v.verdict === 'publica-declarada').length,
      descoberta: verdicts.filter((v) => v.verdict === 'DESCOBERTA').length,
      indeterminada: verdicts.filter((v) => v.verdict === 'indeterminada').length,
      scope: 'diff',
      sources: coverage.sources,
      notes,
      allowlist: {
        file: PUBLIC_ROUTES_FILE,
        present: allowlist.present,
        accepted: allowlist.entries.length,
        rejected: allowlist.rejected,
        wide: allowlist.wide.length,
        notes: allowlist.notes,
        changed: allowlistChanged,
        ...(delta !== undefined ? { delta } : {}),
      },
      g2: toG2Summary(g2Sources, before, g2),
    },
  }
}

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

export function allowlistToContractIssue(finding: AllowlistFinding, index: number): ContractIssue {
  return {
    id: `ALLOW-${String(index + 1).padStart(3, '0')}`,
    severity: finding.severity,
    file: finding.file,
    line: finding.line,
    description: finding.description,
  }
}

/** DP-9: allowlist PRIMEIRO (e sobre a configuracao do check), depois rota. Cada lista ja vem por severidade. */
export function buildContractIssues(result: AuditResult): ContractIssue[] {
  return [...result.allowlistFindings.map(allowlistToContractIssue), ...result.findings.map(toContractIssue)]
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type DiffResult = { ok: true; files: string[] } | { ok: false; error: string }

/** `git diff --name-only <ref>...HEAD` no projeto auditado. Tres pontos, como o verify-work. */
export function changedFilesFromGit(targetDir: string, ref: string): DiffResult {
  try {
    const proc = Bun.spawnSync(['git', 'diff', '--name-only', `${ref}...HEAD`], { cwd: targetDir })
    if (proc.exitCode !== 0) {
      return { ok: false, error: new TextDecoder().decode(proc.stderr).trim() || `git saiu com codigo ${proc.exitCode}` }
    }
    const files = new TextDecoder()
      .decode(proc.stdout)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    return { ok: true, files }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

const decode = (buf: Uint8Array): string => new TextDecoder().decode(buf).trim()

// 2026-09-05 (Luiz/dev): BUG-fase03-1 (descoberto rodando o teste de integracao real). `git cat-file -e
// <sha>:<file>` NUNCA sai com 1 para path ausente na arvore — a forma composta `rev:path` faz o parser
// de revisao morrer com `die()` (exit 128) antes de chegar na logica que devolveria 1 (git 2.53.0).
// DI-fase03-2: a primeira correcao lia a MENSAGEM do `git show` ("does not exist in"), mas o git traduz
// `fatal:` quando ha catalogo i18n e LANG definido — em maquina pt-BR o marcador nao casaria e todo
// arquivo ausente viraria `unavailable`. `git ls-tree <sha> -- <file>` responde a mesma pergunta sem
// texto: exit 0 com stdout vazio = ausente; stdout com o blob = existe; exit != 0 = arvore invalida.

/** `git merge-base <ref> HEAD` → `git ls-tree <sha> -- <file>` (ausente?) → `git show <sha>:<file>`.
 * Qualquer falha de comando vira `unavailable` com o stderr como razao — nunca silencio (DP-11). */
export function readAtBaseFromGit(targetDir: string, ref: string): (file: string) => BaseRead {
  return (file) => {
    try {
      const base = Bun.spawnSync(['git', 'merge-base', ref, 'HEAD'], { cwd: targetDir })
      if (base.exitCode !== 0) return { status: 'unavailable', reason: decode(base.stderr) || `merge-base saiu com codigo ${base.exitCode}` }
      const sha = decode(base.stdout)
      const tree = Bun.spawnSync(['git', 'ls-tree', sha, '--', file], { cwd: targetDir })
      if (tree.exitCode !== 0) return { status: 'unavailable', reason: decode(tree.stderr) || `ls-tree saiu com codigo ${tree.exitCode}` }
      if (decode(tree.stdout).length === 0) return { status: 'absent' }
      const show = Bun.spawnSync(['git', 'show', `${sha}:${file}`], { cwd: targetDir })
      if (show.exitCode !== 0) return { status: 'unavailable', reason: decode(show.stderr) || `show saiu com codigo ${show.exitCode}` }
      return { status: 'found', source: new TextDecoder().decode(show.stdout) }
    } catch (error) {
      return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }
    }
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const target = args.find((a) => !a.startsWith('--')) ?? process.cwd()
  const refIndex = args.indexOf('--ref')
  const refValue = refIndex >= 0 ? args[refIndex + 1] : undefined

  if (refIndex >= 0 && (refValue === undefined || refValue.startsWith('--'))) {
    console.log(JSON.stringify({ blocked: true, reason: '--ref sem valor' }, null, 2))
    process.exit(2)
  }

  const ref = refValue ?? 'HEAD~1'
  const diff = changedFilesFromGit(target, ref)
  if (!diff.ok) {
    // Nunca inventar finding sem diff resolvido — a secao 11 do agente instrui a registrar a razao.
    console.log(JSON.stringify({ blocked: true, reason: `nao consegui resolver o diff: ${diff.error}` }, null, 2))
    process.exit(2)
  }

  const result = auditRouteCoverage(target, { changedFiles: diff.files, readAtBase: readAtBaseFromGit(target, ref) })
  console.log(JSON.stringify({ issues: buildContractIssues(result), summary: result.summary }, null, 2))
}
