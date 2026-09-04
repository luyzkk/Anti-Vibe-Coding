// 2026-09-04 (Luiz/dev): cruzamento rota x cobertura. A enumeracao e a leitura do matcher vivem
// no adaptador nativo da stack (fase-03); aqui fica so a decisao. A decisao ainda e string-match
// ingenuo e a severidade ainda e fixa — donos: fase-04 (AST) e fase-05 (regra de severidade).
import type { IssueSeverity } from '../../lib/subagent-contract'
import type { RouteFinding } from './route-auth-matrix.types'
import { nextjsAdapter } from './route-auth-nextjs'

/** Item exatamente no shape de `AuditContractV2['payload']['issues'][number]`. */
export type ContractIssue = {
  id: string
  severity: IssueSeverity
  file: string
  line: number
  description: string
}

/**
 * Cruza rotas com cobertura e devolve so o que emite finding.
 *
 * `pattern.includes(path)` e falso-negativo por natureza — `/admin/:path*` "contem" `/admin`, e a
 * fase-04 existe para trocar isso por match real via AST + path-to-regexp (PRD CA-06).
 */
export function auditRouteCoverage(targetDir: string): RouteFinding[] {
  const coverage = nextjsAdapter.readCoverage(targetDir)
  const patterns = coverage.rules.flatMap((rule) => (rule.kind === 'path-pattern' ? [rule.pattern] : []))

  return nextjsAdapter
    .enumerate(targetDir)
    .filter((route) => !patterns.some((pattern) => pattern.includes(route.path)))
    .map((route) => ({
      route,
      verdict: 'DESCOBERTA',
      severity: 'critical',
      missing: `nenhuma entrada de config.matcher casa ${route.path}`,
    }))
}

export function toContractIssue(finding: RouteFinding, index: number): ContractIssue {
  return {
    id: `ROUTE-${String(index + 1).padStart(3, '0')}`,
    severity: finding.severity,
    file: finding.route.file,
    line: finding.route.line,
    description: `${finding.verdict}: ${finding.route.path} — ${finding.missing}`,
  }
}

if (import.meta.main) {
  const target = process.argv[2] ?? process.cwd()
  const findings = auditRouteCoverage(target)
  console.log(
    JSON.stringify({ issues: findings.map(toContractIssue), summary: { enumerated: findings.length } }, null, 2),
  )
}
