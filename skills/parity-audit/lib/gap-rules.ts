// 2026-05-14 (Luiz/dev): ruleset mínimo — expansão futura via PRs separados, evita scope creep (PRD §Decisão #5)

import type { ToolRegistrySnapshot } from '../../lib/tool-registry-inspector'

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
