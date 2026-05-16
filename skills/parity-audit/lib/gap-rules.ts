// 2026-05-14 (Luiz/dev): ruleset mínimo — expansão futura via PRs separados, evita scope creep (PRD §Decisão #5)

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ToolRegistrySnapshot } from '../../lib/tool-registry-inspector'
import type { Capability } from '../../lib/capabilities-writer'
import type { ParityGap } from './parity-gaps-writer'

export type Severity = 'critical' | 'important' | 'nice'

export type GapRule = {
  gap_id: string                  // ex: 'stripe-mcp'
  task_type: string               // ex: 'payment-debug'
  required_capability: string     // descrição humana do que falta
  detect: (snapshot: ToolRegistrySnapshot) => boolean
  severity: Severity
  suggestion: string
}

export const GAP_RULES: GapRule[] = [
  {
    gap_id: 'stripe-mcp',
    task_type: 'payment-debug',
    required_capability: 'Stripe MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('stripe')),
    severity: 'critical',
    suggestion: 'Instalar mcp-stripe ou pular tasks de debug Stripe. PRD CA-05.',
  },
  {
    gap_id: 'playwright-mcp',
    task_type: 'browser-test',
    required_capability: 'Playwright MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('playwright')),
    severity: 'critical',
    suggestion: 'Instalar plugin Playwright MCP (qa-visual depende disso — CA-06).',
  },
  {
    gap_id: 'email-mcp',
    task_type: 'email-send',
    required_capability: 'Email provider MCP (SES, Sendgrid, etc)',
    detect: snap =>
      !snap.mcps.some(m =>
        ['ses', 'sendgrid', 'mailgun', 'resend'].some(p => m.name.toLowerCase().includes(p))
      ),
    severity: 'important',
    suggestion: 'Sem MCP de email, /security não consegue inspecionar templates ou rate limits de envio.',
  },
  {
    gap_id: 'github-mcp',
    task_type: 'pr-review',
    required_capability: 'GitHub MCP server',
    detect: snap => !snap.mcps.some(m => m.name.toLowerCase().includes('github')),
    severity: 'nice',
    suggestion: 'Sem GitHub MCP, /pr-review cai em CLI gh — funciona, mas com mais latência.',
  },
]

// 2026-05-16 (Luiz/dev): GREEN CA-08 — cross capabilities with source file usage scan.
// Detects declared routes that are never imported/referenced anywhere in the project.

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

async function collectSourceFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // skip node_modules, .git, and any dir starting with '.'
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue
      const sub = await collectSourceFiles(path.join(dir, entry.name))
      results.push(...sub)
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(path.join(dir, entry.name))
    }
  }
  return results
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function crossCapabilitiesWithUsage(
  capabilities: Capability[],
  projectRoot: string
): Promise<ParityGap[]> {
  const sourceFiles = await collectSourceFiles(projectRoot)
  const gaps: ParityGap[] = []

  for (const cap of capabilities) {
    // strip trailing line number: 'app/api/used-route/route.ts:5' → 'app/api/used-route/route.ts'
    const stripped = cap.handler.replace(/:\d+$/, '')
    // normalize slashes
    const normalizedStripped = stripped.replace(/\\/g, '/')

    // For import matching, use the path without extension as a suffix:
    // 'app/api/used-route/route.ts' → 'app/api/used-route/route'
    const strippedNoExt = normalizedStripped.replace(/\.[^/.]+$/, '')

    // Also build a more specific segment: parent-dir/basename-no-ext
    // e.g. 'used-route/route' — unique enough to avoid false matches on bare 'route'
    const segments = strippedNoExt.split('/')
    const specificSuffix = segments.length >= 2
      ? segments.slice(-2).join('/')
      : strippedNoExt

    const escapedSuffix = escapeRegex(specificSuffix)
    const escapedRoutePath = escapeRegex(cap.path)

    // Patterns: look for the specific path suffix in import/require/import() strings,
    // or the route path as a literal string (for fetch/router usage)
    const patterns = [
      new RegExp(`import[^'"]*from\\s+['"\`][^'"\`]*${escapedSuffix}['"\`]`),
      new RegExp(`require\\(['"\`][^'"\`]*${escapedSuffix}['"\`]\\)`),
      new RegExp(`import\\(['"\`][^'"\`]*${escapedSuffix}['"\`]\\)`),
      new RegExp(`['"\`]${escapedRoutePath}['"\`]`),
    ]

    let referenced = false
    for (const filePath of sourceFiles) {
      // skip the handler file itself
      const relFile = path.relative(projectRoot, filePath).replace(/\\/g, '/')
      if (relFile === normalizedStripped) continue

      const content = await fs.readFile(filePath, 'utf-8').catch(() => null)
      if (content === null) continue

      if (patterns.some(p => p.test(content))) {
        referenced = true
        break
      }
    }

    if (!referenced) {
      gaps.push({
        gap_id: `declared-not-used:${normalizedStripped}`,
        task_type: 'use-crossing',
        missing_capability: normalizedStripped,
        severity: 'nice',
        suggestion: 'declared but not referenced — remove or wire-up',
      })
    }
  }

  return gaps
}
