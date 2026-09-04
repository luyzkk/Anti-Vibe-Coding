import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { IssueSeverity } from '../../lib/subagent-contract'

/**
 * Finding de cobertura de rota. Superset do item de `payload.issues` do contrato v2.0.0
 * (`severity`, `file`, `line`, `description`) com `kind` e `path` para uso interno.
 * fase-02 substitui por `RouteFinding` do contrato de tipos.
 */
export type RouteAuditFinding = {
  kind: 'DESCOBERTA'
  severity: IssueSeverity
  path: string
  file: string
  line: number
  description: string
}

/** Item exatamente no shape de `AuditContractV2['payload']['issues'][number]`. */
export type ContractIssue = {
  id: string
  severity: IssueSeverity
  file: string
  line: number
  description: string
}

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

function walkRouteFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkRouteFiles(full))
    else if (name === 'route.ts') out.push(full)
  }
  return out
}

function toRoutePath(targetDir: string, file: string): string {
  const rel = toPosix(relative(targetDir, file))
  return '/' + rel.replace(/^app\//, '').replace(/\/route\.ts$/, '')
}

/**
 * Tracer bullet: globa `app/**\/route.ts`, le `middleware.ts` como texto e decide cobertura por
 * string-match. Tudo ingenuo de proposito — fase-03 troca o glob, fase-04 troca o match,
 * fase-05 troca a severidade fixa.
 */
export function auditRouteCoverage(targetDir: string): RouteAuditFinding[] {
  const middlewarePath = join(targetDir, 'middleware.ts')
  const matcherText = existsSync(middlewarePath) ? readFileSync(middlewarePath, 'utf8') : ''
  const findings: RouteAuditFinding[] = []

  for (const file of walkRouteFiles(join(targetDir, 'app'))) {
    const path = toRoutePath(targetDir, file)
    if (matcherText.includes(path)) continue
    findings.push({
      kind: 'DESCOBERTA',
      severity: 'critical',
      path,
      file: toPosix(relative(targetDir, file)),
      line: 1,
      description: `DESCOBERTA: ${path} sem cobertura de middleware — o texto de middleware.ts nao contem o caminho`,
    })
  }
  return findings
}

export function toContractIssue(finding: RouteAuditFinding, index: number): ContractIssue {
  return {
    id: `ROUTE-${String(index + 1).padStart(3, '0')}`,
    severity: finding.severity,
    file: finding.file,
    line: finding.line,
    description: finding.description,
  }
}

if (import.meta.main) {
  const target = process.argv[2] ?? process.cwd()
  const findings = auditRouteCoverage(target)
  console.log(JSON.stringify({ issues: findings.map(toContractIssue), summary: { enumerated: findings.length } }, null, 2))
}
