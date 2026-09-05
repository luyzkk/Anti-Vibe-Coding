// 2026-09-04 (Luiz/dev): cruzamento rota x cobertura. A enumeracao e a leitura do matcher vivem
// no adaptador nativo da stack (fase-03); aqui fica so a decisao. A decisao ainda e string-match
// ingenuo e a severidade ainda e fixa — donos: fase-04 (AST) e fase-05 (regra de severidade).
import type { IssueSeverity } from '../../lib/subagent-contract'
import type { RouteFinding } from './route-auth-matrix.types'
import { matchRouteAgainstPattern, nextjsAdapter } from './route-auth-nextjs'

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
 * `coberta` exige match DEMONSTRAVEL: toda sonda da rota tem de casar alguma regra. Regra ilegivel
 * (`opaque`) ou match apenas parcial nao cobre e nao condena — vira `indeterminada` (PRD CA-06).
 * A severidade segue fixa; a regra CRITICO/ALTO e da fase-05.
 */
export function auditRouteCoverage(targetDir: string): RouteFinding[] {
  const coverage = nextjsAdapter.readCoverage(targetDir)
  const patterns = coverage.rules.flatMap((rule) => (rule.kind === 'path-pattern' ? [rule.pattern] : []))
  const hasOpaqueRule = coverage.rules.some((rule) => rule.kind === 'opaque')
  const findings: RouteFinding[] = []

  for (const route of nextjsAdapter.enumerate(targetDir)) {
    const outcomes = patterns.map((pattern) => matchRouteAgainstPattern(route.path, pattern))
    if (outcomes.includes('matches')) continue

    if (hasOpaqueRule || outcomes.includes('partial')) {
      findings.push({
        route,
        verdict: 'indeterminada',
        severity: 'critical',
        missing: hasOpaqueRule
          ? 'config.matcher nao e legivel estaticamente — cobertura nao demonstravel'
          : `nenhuma regra cobre todas as instancias de ${route.path}`,
      })
      continue
    }

    findings.push({
      route,
      verdict: 'DESCOBERTA',
      severity: 'critical',
      missing: `nenhuma entrada de config.matcher casa ${route.path}`,
    })
  }

  return findings
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
