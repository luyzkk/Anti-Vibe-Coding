import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { IssueSeverity } from '../../lib/subagent-contract'
import type { CoverageMap, CoverageRule, Route, RouteAdapter, RouteFinding } from './route-auth-matrix.types'

/** Item exatamente no shape de `AuditContractV2['payload']['issues'][number]`. */
export type ContractIssue = {
  id: string
  severity: IssueSeverity
  file: string
  line: number
  description: string
}

const MIDDLEWARE_FILE = 'middleware.ts'

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
 * Adaptador Next.js — ainda ingenuo de proposito. A fase-03 troca `enumerate` por enumeracao fiel
 * do App Router (metodos exportados, `[id]`, route groups) e a fase-04 troca a leitura do matcher
 * por AST. O que esta fase congela e o SHAPE, nao a fidelidade.
 */
export const nextjsAdapter: RouteAdapter = {
  stack: 'nextjs',

  enumerate(targetDir: string): Route[] {
    return walkRouteFiles(join(targetDir, 'app')).map((file) => ({
      // 2026-09-04 (Luiz/dev): metodo fixo em GET e linha fixa em 1 — a fase-03 le os verbos
      // realmente exportados por route.ts. `line` nunca e 0: o schema v2 exige minimum 1.
      method: 'GET',
      path: toRoutePath(targetDir, file),
      file: toPosix(relative(targetDir, file)),
      line: 1,
      stack: 'nextjs',
    }))
  },

  readCoverage(targetDir: string): CoverageMap {
    const absolute = join(targetDir, MIDDLEWARE_FILE)
    if (!existsSync(absolute)) {
      return {
        stack: 'nextjs',
        rules: [],
        sources: [],
        notes: [`${MIDDLEWARE_FILE} nao encontrado na raiz do projeto`],
      }
    }

    const text = readFileSync(absolute, 'utf8')
    const matcherArray = text.match(/matcher:\s*\[([^\]]*)\]/)
    const literal = matcherArray?.[1]

    if (literal === undefined) {
      // 2026-09-04 (Luiz/dev): sem array literal, a cobertura e ILEGIVEL, nao ausente. `opaque`
      // leva o motor a `indeterminada` — jamais a `coberta` (PRD CA-06).
      return {
        stack: 'nextjs',
        rules: [{ kind: 'opaque', reason: 'config.matcher nao e um array literal', file: MIDDLEWARE_FILE, line: 1 }],
        sources: [MIDDLEWARE_FILE],
        notes: [],
      }
    }

    const rules: CoverageRule[] = []
    for (const entry of literal.matchAll(/['"`]([^'"`]+)['"`]/g)) {
      const pattern = entry[1]
      if (pattern !== undefined) {
        rules.push({ kind: 'path-pattern', pattern, file: MIDDLEWARE_FILE, line: 1 })
      }
    }

    return { stack: 'nextjs', rules, sources: [MIDDLEWARE_FILE], notes: [] }
  },
}

/**
 * Cruza rotas com cobertura e devolve so o que emite finding.
 *
 * A decisao continua string-match ingenuo (`pattern.includes(path)`) — e falso-negativo por
 * natureza, e a fase-04 existe para trocar por match real via AST. Severidade fixa em `critical`
 * ate a fase-05 trazer a regra (marcador de privilegio ou metodo mutante).
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
