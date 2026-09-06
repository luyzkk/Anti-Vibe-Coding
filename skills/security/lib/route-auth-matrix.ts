// 2026-09-04 (Luiz/dev): motor de veredito, regra de severidade e escopo G1 — Plano 01 fase-05.
// A enumeracao e a leitura de cobertura vivem no adaptador nativo da stack; aqui fica a decisao.
import type { IssueSeverity } from '../../lib/subagent-contract'
import { PUBLIC_ROUTES_FILE, diffAllowlist, matchAllowlist, parsePublicRoutes, readPublicRoutes } from './public-routes-allowlist'
import type { AllowlistFinding, CoverageMap, CoverageRule, RejectedEntry, Route, RouteFinding, RouteVerdict } from './route-auth-matrix.types'
import type { AllowlistDelta, AllowlistEntry, BaseRead } from './route-auth-matrix.types'
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

// DP-11: NUNCA silencio. Cada ramo escreve o que aconteceu.
function computeAllowlistDelta(current: AllowlistEntry[], readAtBase: AuditOptions['readAtBase']): AllowlistDelta {
  if (readAtBase === undefined) {
    return { before: 'unavailable', added: current, removed: [], reason: 'sem leitor da base (readAtBase ausente) — delta assume tudo como novo' }
  }
  let read: BaseRead
  try {
    read = readAtBase(PUBLIC_ROUTES_FILE)
  } catch (error) {
    read = { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }
  }
  if (read.status === 'unavailable') {
    return { before: 'unavailable', added: current, removed: [], reason: `base do diff indisponivel: ${read.reason} — delta assume tudo como novo` }
  }
  if (read.status === 'absent') return { before: 'resolved', added: current, removed: [] }
  const base = parsePublicRoutes(read.source, `${PUBLIC_ROUTES_FILE}@base`)
  return { before: 'resolved', ...diffAllowlist(base.entries, current) }
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
  /** DP-9. Um item por entrada ampla da allowlist (fase-02); ordenado por severidade e depois linha. */
  allowlistFindings: AllowlistFinding[]
  verdicts: RouteVerdict[]
  summary: AuditSummary
}

const SEVERITY_ORDER: Readonly<Record<string, number>> = { critical: 0, high: 1, medium: 2, low: 3 }

/**
 * G1 (PRD Decisoes 2 e 6): avalia SO as rotas cujos arquivos estao no diff; o mapa de cobertura e
 * lido inteiro, porque o middleware que protege a rota nova quase nunca esta no mesmo commit.
 * G2 (cobertura perdida por estreitamento do matcher) e o Plano 03 — nao antecipar aqui.
 */
export function auditRouteCoverage(targetDir: string, opts: AuditOptions): AuditResult {
  const routes = nextjsAdapter.enumerate(targetDir)
  const coverage = opts.coverageOverride ?? nextjsAdapter.readCoverage(targetDir)
  const notes = [...coverage.notes]

  const changed = new Set(opts.changedFiles ?? [])
  const evaluated = routes.filter((route) => changed.has(route.file))

  if (changed.size === 0) {
    notes.push('escopo G1 vazio: nenhum arquivo de rota no diff')
  } else if (evaluated.length === 0) {
    // Diff que so toca middleware.ts cai aqui. E o buraco que o Plano 03 (G2) fecha; deixar visivel.
    notes.push('escopo G1 sem rotas: o diff nao tocou arquivo de rota (cobertura perdida e o Plano 03)')
  }

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

  const findings: RouteFinding[] = []
  for (const v of verdicts) {
    if (v.verdict !== 'DESCOBERTA' && v.verdict !== 'indeterminada') continue
    findings.push({ route: v.route, verdict: v.verdict, severity: SEVERITY_BY_VERDICT[v.verdict](v.route), missing: v.evidence })
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

  // G15: igualdade exata, POSIX vindo do git — a CLI e a unica fonte real de changedFiles.
  const allowlistChanged = changed.has(PUBLIC_ROUTES_FILE)
  const delta = allowlistChanged ? computeAllowlistDelta(allowlist.entries, opts.readAtBase) : undefined

  return {
    findings,
    allowlistFindings,
    verdicts,
    summary: {
      enumerated: routes.length,
      evaluated: evaluated.length,
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
    },
  }
}

export function toContractIssue(finding: RouteFinding, index: number): ContractIssue {
  return {
    id: `ROUTE-${String(index + 1).padStart(3, '0')}`,
    severity: finding.severity,
    file: finding.route.file,
    line: finding.route.line,
    description:
      `${finding.verdict}: ${finding.route.method} ${finding.route.path} ` +
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
