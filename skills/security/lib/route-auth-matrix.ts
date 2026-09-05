// 2026-09-04 (Luiz/dev): motor de veredito, regra de severidade e escopo G1 — Plano 01 fase-05.
// A enumeracao e a leitura de cobertura vivem no adaptador nativo da stack; aqui fica a decisao.
import type { IssueSeverity } from '../../lib/subagent-contract'
import type { CoverageMap, CoverageRule, Route, RouteFinding, RouteVerdict } from './route-auth-matrix.types'
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

  const verdicts = evaluated.map((route) => evaluateRoute(route, coverage))

  const findings: RouteFinding[] = verdicts
    .filter((v) => v.verdict === 'DESCOBERTA')
    .map((v) => ({
      route: v.route,
      verdict: 'DESCOBERTA',
      severity: severityFor(v.route),
      missing: v.evidence,
    }))

  findings.sort((a, b) => {
    const bySeverity = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    return bySeverity !== 0 ? bySeverity : a.route.path.localeCompare(b.route.path)
  })

  return {
    findings,
    verdicts,
    summary: {
      enumerated: routes.length,
      evaluated: evaluated.length,
      coberta: verdicts.filter((v) => v.verdict === 'coberta').length,
      descoberta: verdicts.filter((v) => v.verdict === 'DESCOBERTA').length,
      indeterminada: verdicts.filter((v) => v.verdict === 'indeterminada').length,
      scope: 'diff',
      sources: coverage.sources,
      notes,
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
      `(${finding.route.file}:${finding.route.line}) sem cobertura de middleware — ${finding.missing}`,
  }
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

if (import.meta.main) {
  const args = process.argv.slice(2)
  const target = args.find((a) => !a.startsWith('--')) ?? process.cwd()
  const refIndex = args.indexOf('--ref')
  const refValue = refIndex >= 0 ? args[refIndex + 1] : undefined

  if (refIndex >= 0 && (refValue === undefined || refValue.startsWith('--'))) {
    console.log(JSON.stringify({ blocked: true, reason: '--ref sem valor' }, null, 2))
    process.exit(2)
  }

  const diff = changedFilesFromGit(target, refValue ?? 'HEAD~1')
  if (!diff.ok) {
    // Nunca inventar finding sem diff resolvido — a secao 11 do agente instrui a registrar a razao.
    console.log(JSON.stringify({ blocked: true, reason: `nao consegui resolver o diff: ${diff.error}` }, null, 2))
    process.exit(2)
  }

  const { findings, summary } = auditRouteCoverage(target, { changedFiles: diff.files })
  console.log(JSON.stringify({ issues: findings.map(toContractIssue), summary }, null, 2))
}
